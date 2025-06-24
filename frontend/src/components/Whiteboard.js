import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { useSocket } from '../socket/Socket';
import Toolbar from './Toolbar';
import Sidebar from './Chats';
import Canvas from './Canvas';

const WhiteboardContainer = styled.div`
  height: 100vh;
  position: relative;
  background: linear-gradient(135deg, #1a1a1a, #2e2e2e);
  overflow: hidden;
  padding-left: 160px;
  color: white;
`;

const MainContent = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  position: relative;
`;

const Header = styled.div`
  background: #2b2b2b;
  padding: 10px 16px;
  border-bottom: 2px solid #3e3e3e;
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: relative;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.4);
`;

const RoomIdInfo = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
`;

const CenterTitleBlock = styled.div`
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  text-align: center;
  pointer-events: none;
`;

const RoomTitle = styled.h2`
  color: #d4edda;
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0;
`;

const RoomSubtitle = styled.p`
  color: #a9d5b5;
  font-size: 0.85rem;
  margin: 0;
  font-style: italic;
`;

const RoomId = styled.p`
  font-size: 0.8rem;
  color: #ccc;
  margin: 0;
  word-break: break-word;
`;

const UserCount = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 4px;
  font-size: 0.9rem;
  color: #8fc490;
  font-weight: 500;
`;

const UserDot = styled.div`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #28a745;
`;

const HeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const Button = styled.button`
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;

  &.primary {
    background: linear-gradient(135deg, #28a745, #218838);
    color: white;

    &:hover {
      background: #218838;
    }
  }

  &.secondary {
    background: #444;
    color: #d4edda;
    border: 1px solid #5a7e61;

    &:hover {
      background: #555;
    }
  }

  &.danger {
    background: #dc3545;
    color: white;

    &:hover {
      background: #c82333;
    }
  }
`;

const CanvasContainer = styled.div`
  flex: 1;
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #1f1f1f;
`;

const LoadingOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(20, 20, 20, 0.95);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const LoadingText = styled.div`
  color: #d4edda;
  font-size: 1.1rem;
`;

const SidebarOverlay = styled.div`
  position: fixed;
  top: 0;
  right: 0;
  width: min(300px, 90vw);
  height: 100vh;
  background: #2b2b2b;
  border-left: 1px solid #444;
  box-shadow: -2px 0 8px rgba(0,0,0,0.15);
  transition: transform 0.3s ease-in-out, opacity 0.3s;
  z-index: 1000;
  overflow: hidden;
  transform: ${({ $show }) => $show ? 'translateX(0)' : 'translateX(100%)'};
  opacity: ${({ $show }) => $show ? 1 : 0};
  pointer-events: ${({ $show }) => $show ? 'auto' : 'none'};
`;

const Backdrop = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  opacity: ${props => props.$show ? '1' : '0'};
  visibility: ${props => props.$show ? 'visible' : 'hidden'};
  transition: all 0.3s ease-in-out;
  z-index: 999;
`;

const RedDot = styled.span`
  display: inline-block;
  width: 10px;
  height: 10px;
  background: #dc3545;
  border-radius: 50%;
  margin-left: 6px;
  vertical-align: middle;
`;

const ChatIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <path d="M4 20V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H7l-3 3z" stroke="#28a745" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="#fff"/>
  </svg>
);

function Whiteboard() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const {
    socket, isConnected, currentRoom, users,
    joinRoom, leaveRoom, sendDraw, clearCanvas,
    undo, redo, socketReady
  } = useSocket();

  const [isLoading, setIsLoading] = useState(true);
  const [showSidebar, setShowSidebar] = useState(false);
  const [currentUsername, setCurrentUsername] = useState('');
  const [drawingSettings, setDrawingSettings] = useState({
    tool: 'pen',
    color: '#000000',
    brushSize: 2,
    opacity: 1
  });
  const [pendingPassword, setPendingPassword] = useState(null);
  const [joinTried, setJoinTried] = useState(false);
  const canvasRef = useRef(null);
  const [remoteDrawEvent, setRemoteDrawEvent] = useState(null);
  const [touchStart, setTouchStart] = useState(null);
  const hasJoinedRef = useRef(false);
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);

  useEffect(() => {
    if (!socket) return;
    const handleJoinError = (error) => {
      if (error.message === 'Incorrect password' || error.message === 'Password required') {
        let password = '';
        while (!password) {
          password = window.prompt('Enter room password:');
          if (password === null) return navigate('/');
        }
        setPendingPassword(password);
        setJoinTried(false);
        hasJoinedRef.current = false;
      } else {
        alert(error.message);
        navigate('/');
      }
    };
    socket.on('join-error', handleJoinError);
    return () => socket.off('join-error', handleJoinError);
  }, [socket, navigate]);

  useEffect(() => {
    if (isConnected && roomId && socketReady && !hasJoinedRef.current && !joinTried) {
      let username = localStorage.getItem('username') || `User${Math.floor(Math.random() * 1000)}`;
      localStorage.setItem('username', username);
      setCurrentUsername(username);
      const isPrivate = !!pendingPassword;
      joinRoom(roomId, username, isPrivate, pendingPassword || '');
      setIsLoading(false);
      hasJoinedRef.current = true;
      setJoinTried(true);
    }
  }, [isConnected, roomId, joinRoom, socketReady, pendingPassword, joinTried]);

  useEffect(() => {
    if (socket) {
      socket.on('draw', handleRemoteDraw);
      socket.on('stroke', handleRemoteDraw);
      socket.on('clear-canvas', handleRemoteClear);
      socket.on('canvas-data', handleRemoteCanvasData);
      return () => {
        socket.off('draw');
        socket.off('stroke');
        socket.off('clear-canvas');
        socket.off('canvas-data');
      };
    }
  }, [socket]);

  useEffect(() => {
    if (socket && currentRoom?.roomId) {
      socket.emit('request-canvas', { roomId: currentRoom.roomId });
    }
  }, [socket, currentRoom]);

  const handleRemoteDraw = (data) => setRemoteDrawEvent(data);
  const handleRemoteClear = () => canvasRef.current?.clear();
  const handleRemoteCanvasData = ({ canvasData }) =>
    canvasRef.current?.loadImageFromDataUrl(canvasData || '');

  const handleDrawEvent = (drawData) =>
    sendDraw({ ...drawData, roomId: currentRoom?.roomId || roomId });

  const handleClearCanvas = () => clearCanvas(currentRoom?.roomId || roomId);
  const handleUndo = () => undo(currentRoom?.roomId || roomId);
  const handleRedo = () => redo(currentRoom?.roomId || roomId);

  const handleExportImage = async () => {
    if (canvasRef.current) {
      const dataUrl = canvasRef.current.exportImage();
      const link = document.createElement('a');
      link.download = `whiteboard-${roomId}.png`;
      link.href = dataUrl;
      link.click();
    }
  };

  const handleExportPDF = async () => {
    if (canvasRef.current) {
      const pdf = await canvasRef.current.exportPDF();
      pdf.save(`whiteboard-${roomId}.pdf`);
    }
  };

  const handleLeaveRoom = () => leaveRoom(() => setTimeout(() => navigate('/'), 0));
  const copyRoomLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/whiteboard/${roomId}`);
    alert('Room link copied to clipboard!');
  };

  if (isLoading) {
    return (
      <LoadingOverlay>
        <LoadingText>Connecting to room...</LoadingText>
      </LoadingOverlay>
    );
  }

  return (
    <WhiteboardContainer>
      <MainContent>
        <Header>
          <RoomIdInfo>
            <RoomId><strong>Room ID:</strong> {roomId}</RoomId>
            <UserCount><UserDot /> {users?.length || 0} Users Online</UserCount>
          </RoomIdInfo>

          <CenterTitleBlock>
            <RoomTitle>CollabBoard</RoomTitle>
            <RoomSubtitle>Brainstorm. Sketch. Build—Together.</RoomSubtitle>
          </CenterTitleBlock>

          <HeaderActions>
            <Button className="secondary" onClick={() => setShowSidebar(!showSidebar)}>
              <ChatIcon />
              {!showSidebar && hasUnreadMessages && <RedDot />}
            </Button>
            <Button className="secondary" onClick={copyRoomLink}>Share</Button>
            <Button className="danger" onClick={handleLeaveRoom}>Leave Room</Button>
          </HeaderActions>
        </Header>

        <CanvasContainer>
          <Canvas
            ref={canvasRef}
            tool={drawingSettings.tool}
            color={drawingSettings.color}
            brushSize={drawingSettings.brushSize}
            opacity={drawingSettings.opacity}
            onDrawEvent={handleDrawEvent}
            remoteDrawEvent={remoteDrawEvent}
          />
        </CanvasContainer>

        <Toolbar
          settings={drawingSettings}
          onSettingsChange={setDrawingSettings}
          onClear={handleClearCanvas}
          onUndo={handleUndo}
          onRedo={handleRedo}
          onExportImage={handleExportImage}
          onExportPDF={handleExportPDF}
        />
      </MainContent>

      <SidebarOverlay $show={showSidebar}>
        <Sidebar
          users={users}
          roomId={roomId}
          currentUsername={currentUsername}
          onClose={() => setShowSidebar(false)}
          onNewMessage={() => !showSidebar && setHasUnreadMessages(true)}
        />
      </SidebarOverlay>

      <Backdrop $show={showSidebar} onClick={() => setShowSidebar(false)} />
    </WhiteboardContainer>
  );
}

export default Whiteboard;
