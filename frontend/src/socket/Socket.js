import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';

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
    const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';

    console.log('🔌 Connecting to Socket.IO at:', SOCKET_URL);

    const newSocket = io(SOCKET_URL, {
      transports: ['websocket'],       // 👈 Avoid polling-based CORS issues
      withCredentials: true,           // 👈 Allow cookies if needed
      reconnectionAttempts: 5,         // Optional: retry logic
      timeout: 10000                   // Optional: timeout if server doesn't respond
    });

    setSocketReady(false);

    newSocket.on('connect', () => {
      setIsConnected(true);
      console.log('✅ Connected to server');
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
      console.log('🔌 Disconnected from server');
    });

    newSocket.on('room-joined', (data) => {
      setCurrentRoom(data.room);
      setUsers(data.users);
      console.log('[SocketContext] Joined room:', data.room);
    });

    newSocket.on('user-list', (users) => {
      setUsers(users);
    });

    newSocket.on('join-error', (error) => {
      console.error('🚫 Join error:', error);
      alert(error.message);
    });

    setSocket(newSocket);
    setSocketReady(true);

    return () => {
      newSocket.disconnect();
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
      const event = drawData.type === 'stroke' ? 'stroke' : 'draw';
      socket.emit(event, drawData);
    }
  };

  const clearCanvas = (roomId) => {
    const effectiveRoomId = currentRoom?.roomId || roomId;
    if (socket && effectiveRoomId) {
      socket.emit('clear-canvas', { roomId: effectiveRoomId });
    }
  };

  const undo = (roomId) => {
    const effectiveRoomId = currentRoom?.roomId || roomId;
    if (socket && effectiveRoomId) {
      socket.emit('undo', { roomId: effectiveRoomId });
    }
  };

  const redo = (roomId) => {
    const effectiveRoomId = currentRoom?.roomId || roomId;
    if (socket && effectiveRoomId) {
      socket.emit('redo', { roomId: effectiveRoomId });
    }
  };

  const sendMessage = (message, username, roomId) => {
    const effectiveRoomId = currentRoom?.roomId || roomId;
    if (socket && effectiveRoomId) {
      socket.emit('send-message', {
        roomId: effectiveRoomId,
        username: username || currentRoom?.username || 'Anonymous',
        message
      });
    }
  };

  return (
    <SocketContext.Provider value={{
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
    }}>
      {children}
    </SocketContext.Provider>
  );
};
