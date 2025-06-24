import React, { createContext, useContext, useEffect, useState } from 'react';
import io from 'socket.io-client';

const SocketContext = createContext();

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [currentRoom, setCurrentRoom] = useState(null);
  const [users, setUsers] = useState([]);
  const [socketReady, setSocketReady] = useState(false);

  useEffect(() => {
    const SOCKET_URL = process.env.REACT_APP_SOCKET_URL;
    const newSocket = io(SOCKET_URL);
    setSocketReady(false);
    newSocket.on('connect', () => {
      setIsConnected(true);
      console.log('Connected to server');
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
      console.log('Disconnected from server');
    });

    newSocket.on('room-joined', (data) => {
      setCurrentRoom(data.room);
      setUsers(data.users);
      console.log('[SocketContext] Joined room:', data.room);
      console.log('[SocketContext] currentRoom after set:', data.room);
    });

    newSocket.on('user-list', (users) => {
      setUsers(users);
    });

    newSocket.on('join-error', (error) => {
      console.error('Join error:', error);
      alert(error.message);
    });

    setSocket(newSocket);
    setSocketReady(true);

    return () => {
      newSocket.close();
      setSocketReady(false);
    };
  }, []);

  const joinRoom = (roomId, username, isPrivate = false, password = '') => {
    if (socket) {
      socket.emit('join-room', { roomId, username, isPrivate, password });
    }
  };

  const leaveRoom = (cb) => {
    if (socket && currentRoom) {
      socket.emit('leave-room', { roomId: currentRoom.roomId }, cb);
      setCurrentRoom(null);
      setUsers([]);
    } else if (cb) {
      cb();
    }
  };

  const sendDraw = (drawData) => {
    if (socket && drawData.roomId) {
      if (drawData.type === 'stroke') {
        socket.emit('stroke', drawData);
      } else {
        socket.emit('draw', drawData);
      }
    }
  };

  const clearCanvas = (roomId) => {
    const effectiveRoomId = (currentRoom && currentRoom.roomId) || roomId;
    if (socket && effectiveRoomId) {
      console.log('[SocketContext] Emitting clear-canvas for room:', effectiveRoomId);
      socket.emit('clear-canvas', { roomId: effectiveRoomId });
    } else {
      console.log('[SocketContext] clearCanvas: No currentRoom or socket');
    }
  };

  const undo = (roomId) => {
    const effectiveRoomId = (currentRoom && currentRoom.roomId) || roomId;
    if (socket && effectiveRoomId) {
      console.log('[SocketContext] Emitting undo for room:', effectiveRoomId);
      socket.emit('undo', { roomId: effectiveRoomId });
    } else {
      console.log('[SocketContext] undo: No currentRoom or socket');
    }
  };

  const redo = (roomId) => {
    const effectiveRoomId = (currentRoom && currentRoom.roomId) || roomId;
    if (socket && effectiveRoomId) {
      console.log('[SocketContext] Emitting redo for room:', effectiveRoomId);
      socket.emit('redo', { roomId: effectiveRoomId });
    } else {
      console.log('[SocketContext] redo: No currentRoom or socket');
    }
  };

  const sendMessage = (message, username, roomId) => {
    const effectiveRoomId = (currentRoom && currentRoom.roomId) || roomId;
    if (socket && effectiveRoomId) {
      socket.emit('send-message', {
        roomId: effectiveRoomId,
        username: username || (currentRoom && currentRoom.username) || 'Anonymous',
        message
      });
    }
  };

  const value = {
    socket,
    isConnected,
    currentRoom,
    users,
    joinRoom,
    leaveRoom,
    sendDraw,
    clearCanvas,
    undo,
    redo,
    sendMessage,
    socketReady
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
}; 