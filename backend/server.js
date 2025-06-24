const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const Room = require('./schemas/Room');
const bcrypt = require('bcryptjs');

dotenv.config();

const app = express();
const server = http.createServer(app);


const frontendURL = process.env.FRONTEND_URL;
const allowedOrigins = [
  'http://localhost:3000', 
];

if (frontendURL) {
  allowedOrigins.push(frontendURL);
}

const corsOptions = {
  origin: (origin, callback) => {
    
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
};

app.use(cors(corsOptions));

const io = socketIo(server, {
  cors: corsOptions,
});

// Middleware
app.use(express.json());

// MongoDB Connection
const MONGODB_URI = 'mongodb+srv://harshgupta:1234@collabboard.luqjeps.mongodb.net/?retryWrites=true&w=majority&appName=CollabBoard';
let useMongoDB = true;

mongoose.connect(MONGODB_URI)
.then(() => {
  console.log('Connected to MongoDB');
  useMongoDB = true;
})
.catch((error) => {
  console.log('MongoDB connection failed, using in-memory storage:', error.message);
  useMongoDB = false;
});

// Fallback in-memory storage
const inMemoryRooms = new Map();
const inMemoryUsers = new Map();
const inMemoryCanvasHistory = new Map(); 

// Socket.io connection handling
const rooms = new Map();
const MAX_USERS_PER_ROOM = 20;
const MAX_MESSAGES_PER_ROOM = 100;

// Helper function to get or create room
async function getOrCreateRoom(roomId, isPrivate = false, password = '') {
  if (useMongoDB) {
    try {
      let room = await Room.findOne({ roomId });
      if (!room) {
        
        let hashedPassword = '';
        if (isPrivate && password) {
          const salt = await bcrypt.genSalt(10);
          hashedPassword = await bcrypt.hash(password, salt);
        }
        room = new Room({
          roomId,
          name: `Room ${roomId}`,
          isPrivate,
          password: hashedPassword,
          createdBy: 'system',
          users: [],
          messages: []
        });
        await room.save();
      }
      
      return room;
    } catch (error) {
      console.error('MongoDB error:', error);
      useMongoDB = false;
      return getOrCreateRoomInMemory(roomId, isPrivate, password);
    }
  } else {
   
    let room = inMemoryRooms.get(roomId);
    if (!room) {
      room = {
        roomId,
        name: `Room ${roomId}`,
        isPrivate,
        password,
        createdBy: 'system',
        users: [],
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };
      inMemoryRooms.set(roomId, room);
    }
  
    return room;
  }
}

function getOrCreateRoomInMemory(roomId, isPrivate = false, password = '') {
  let room = inMemoryRooms.get(roomId);
  if (!room) {
    room = {
      roomId,
      name: `Room ${roomId}`,
      isPrivate,
      password,
      createdBy: 'system',
      users: [],
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };
    inMemoryRooms.set(roomId, room);
  }
  return room;
}

// Helper function to save room
async function saveRoom(room) {
  if (useMongoDB) {
    try {
      await Room.findOneAndUpdate({ roomId: room.roomId }, room, { upsert: true });
    } catch (error) {
      console.error('Error saving room to MongoDB:', error);
    }
  }
}

// Helper to get or create canvas history for a room
function getOrCreateCanvasHistory(roomId) {
  let history = inMemoryCanvasHistory.get(roomId);
  if (!history) {
    history = { stack: [''], pointer: 0 }; 
    inMemoryCanvasHistory.set(roomId, history);
  }
  return history;
}

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Join room
  socket.on('join-room', async (data) => {
    const { roomId, username, password } = data;
    // Validate input
    if (!roomId || !username || username.trim().length === 0) {
      socket.emit('join-error', { message: 'Invalid room ID or username' });
      return;
    }
    // Sanitize username
    const sanitizedUsername = username.trim().substring(0, 20);
    try {
      let room;
      if (useMongoDB) {
        room = await Room.findOne({ roomId });
      } else {
        room = inMemoryRooms.get(roomId);
      }
      if (!room) {
        socket.emit('join-error', { message: 'Room not found' });
        return;
      }
      // Check if room is private and password is required
      if (room.isPrivate) {
        console.log('[JOIN-ROOM] Room is private. Received password:', password);
        console.log('[JOIN-ROOM] Stored room password (hash):', room.password);
        if (room.password && password) {
          let passwordMatch = false;
          if (room.password.startsWith('$2')) {
            passwordMatch = await bcrypt.compare(password, room.password);
            console.log('[JOIN-ROOM] bcrypt.compare result:', passwordMatch);
          } else {
            passwordMatch = room.password === password;
            console.log('[JOIN-ROOM] Plain text compare result:', passwordMatch);
          }
          if (!passwordMatch) {
            socket.emit('join-error', { message: 'Incorrect password' });
            return;
          }
        } else {
          socket.emit('join-error', { message: 'Password required' });
          return;
        }
      }
      // Check if user is already in the room
      const existingUser = room.users.find(user => user.socketId === socket.id);
      if (!existingUser) {
        room.users.push({ 
          socketId: socket.id, 
          username: sanitizedUsername,
          joinedAt: new Date()
        });
        room.updatedAt = new Date();
        await saveRoom(room);
        rooms.set(roomId, room);
        socket.join(roomId);
        socket.to(roomId).emit('user-joined', { 
          socketId: socket.id, 
          username: sanitizedUsername 
        });
        console.log(`${sanitizedUsername} joined room ${roomId}`);
      }
      io.to(roomId).emit('user-list', room.users);
      socket.emit('room-joined', { room, users: room.users });
    } catch (error) {
      console.error('Error joining room:', error);
      socket.emit('join-error', { message: 'Failed to join room' });
    }
  });

  // Drawing events
  socket.on('draw', async (data) => {
    const { roomId, ...drawData } = data;
    socket.to(roomId).emit('draw', data);
   
    if (drawData.type === 'end' && drawData.canvasData) {
      const history = getOrCreateCanvasHistory(roomId);
     
      if (history.pointer < history.stack.length - 1) {
        history.stack = history.stack.slice(0, history.pointer + 1);
      }
      history.stack.push(drawData.canvasData);
      history.pointer = history.stack.length - 1;
     
      const room = rooms.get(roomId);
      if (room) {
        room.canvasData = drawData.canvasData;
        room.updatedAt = new Date();
        await saveRoom(room);
      }
    }
  });

  // Stroke event for smooth collaborative drawing
  socket.on('stroke', async (data) => {
    const { roomId, ...strokeData } = data;
    socket.to(roomId).emit('stroke', data);
   
    if (strokeData.canvasData) {
      const history = getOrCreateCanvasHistory(roomId);
      if (history.pointer < history.stack.length - 1) {
        history.stack = history.stack.slice(0, history.pointer + 1);
      }
      history.stack.push(strokeData.canvasData);
      history.pointer = history.stack.length - 1;
      const room = rooms.get(roomId);
      if (room) {
        room.canvasData = strokeData.canvasData;
        room.updatedAt = new Date();
        await saveRoom(room);
      }
    }
  });

  socket.on('clear-canvas', async (data) => {
    const { roomId } = data;
    // Reset canvas history
    inMemoryCanvasHistory.set(roomId, { stack: [''], pointer: 0 });
    io.to(roomId).emit('clear-canvas');
    // Clear canvas data in database
    try {
      const room = rooms.get(roomId);
      if (room) {
        room.canvasData = '';
        room.updatedAt = new Date();
        await saveRoom(room);
      }
    } catch (error) {
      console.error('Error clearing canvas data:', error);
    }
  });

  socket.on('undo', async (data) => {
    const { roomId } = data;
    const history = getOrCreateCanvasHistory(roomId);
    if (history.pointer > 0) {
      history.pointer--;
      const prevDataUrl = history.stack[history.pointer];
      io.to(roomId).emit('canvas-data', { canvasData: prevDataUrl });
      // Persist for reloads
      const room = rooms.get(roomId);
      if (room) {
        room.canvasData = prevDataUrl;
        room.updatedAt = new Date();
        await saveRoom(room);
      }
    }
  });

  socket.on('redo', async (data) => {
    const { roomId } = data;
    const history = getOrCreateCanvasHistory(roomId);
    if (history.pointer < history.stack.length - 1) {
      history.pointer++;
      const nextDataUrl = history.stack[history.pointer];
      io.to(roomId).emit('canvas-data', { canvasData: nextDataUrl });
      // Persist for reloads
      const room = rooms.get(roomId);
      if (room) {
        room.canvasData = nextDataUrl;
        room.updatedAt = new Date();
        await saveRoom(room);
      }
    }
  });

  // Chat events
  socket.on('send-message', async (data) => {
    if (!data.message || data.message.trim().length === 0) {
      return;
    }
    
    const messageData = {
      username: data.username,
      message: data.message.trim().substring(0, 500), 
      timestamp: new Date()
    };
    
    // Save message to database
    try {
      const room = rooms.get(data.roomId);
      if (room) {
        room.messages.push(messageData);
        

        if (room.messages.length > MAX_MESSAGES_PER_ROOM) {
          room.messages = room.messages.slice(-MAX_MESSAGES_PER_ROOM);
        }
        
        room.updatedAt = new Date();
        await saveRoom(room);
      }
    } catch (error) {
      console.error('Error saving message:', error);
    }
    
    io.to(data.roomId).emit('receive-message', messageData);
  });

  // Typing indicators
  socket.on('typing', (data) => {
    socket.to(data.roomId).emit('user-typing', {
      username: data.username
    });
  });

  socket.on('stop-typing', (data) => {
    socket.to(data.roomId).emit('user-stop-typing', {
      username: data.username
    });
  });

  // Request canvas data
  socket.on('request-canvas', async (data) => {
    try {
      const { roomId } = data;
      const history = getOrCreateCanvasHistory(roomId);
      const currentDataUrl = history.stack[history.pointer] || '';
      socket.emit('canvas-data', { canvasData: currentDataUrl });
    } catch (error) {
      console.error('Error sending canvas data:', error);
    }
  });

  // Shape event for collaborative rectangles/circles
  socket.on('shape', (data) => {
    const { roomId } = data;
    socket.to(roomId).emit('shape', data);
  });

  // Text event for collaborative text
  socket.on('text', (data) => {
    const { roomId } = data;
    socket.to(roomId).emit('text', data);
  });

  // Leave room
  socket.on('leave-room', async (data, cb) => {
    const { roomId } = data;
    let room;
    if (useMongoDB) {
      room = await Room.findOne({ roomId });
    } else {
      room = inMemoryRooms.get(roomId);
    }
    if (room) {
      const userIndex = room.users.findIndex(user => user.socketId === socket.id);
      if (userIndex !== -1) {
        room.users.splice(userIndex, 1);
        room.updatedAt = new Date();
        await saveRoom(room);
        rooms.set(roomId, room);
        socket.leave(roomId);
        io.to(roomId).emit('user-list', room.users);
        console.log(`[LEAVE-ROOM] User left room ${roomId}. Users now:`, room.users.map(u => u.username));
      }
    }
    if (cb) cb();
  });

  // Disconnect
  socket.on('disconnect', async () => {
    console.log('User disconnected:', socket.id);
   
    for (const [roomId, room] of rooms.entries()) {
      const userIndex = room.users.findIndex(user => user.socketId === socket.id);
      if (userIndex !== -1) {
        const user = room.users[userIndex];
        room.users.splice(userIndex, 1);
        room.updatedAt = new Date();
        socket.to(roomId).emit('user-left', { 
          socketId: socket.id, 
          username: user.username 
        });
        await saveRoom(room);
        if (room.users.length === 0) {
          if (useMongoDB) {
            try {
              await Room.findOneAndDelete({ roomId });
            } catch (error) {
              console.error('Error deleting empty room:', error);
            }
          } else {
            inMemoryRooms.delete(roomId);
          }
          rooms.delete(roomId);
        }
        io.to(roomId).emit('user-list', room.users);
        console.log(`[DISCONNECT] User disconnected from room ${roomId}. Users now:`, room.users.map(u => u.username));
      }
    }
  });
});

// API Routes
app.get('/api/rooms/:roomId', async (req, res) => {
  try {
    let room;
    if (useMongoDB) {
      room = await Room.findOne({ roomId: req.params.roomId });
    } else {
      room = inMemoryRooms.get(req.params.roomId);
    }
    
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }
    res.json(room);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/rooms', async (req, res) => {
  try {
    console.log('[API] /api/rooms POST body:', req.body);
    const { name, isPrivate, password } = req.body;
    const roomId = uuidv4().substring(0, 8);

    let hashedPassword = '';
    if (isPrivate && password) {
      const salt = await bcrypt.genSalt(10);
      hashedPassword = await bcrypt.hash(password, salt);
    }

    const roomData = {
      roomId,
      name: name || `Room ${roomId}`,
      isPrivate: isPrivate || false,
      password: isPrivate ? hashedPassword : '',
      createdBy: req.body.userId || 'system',
      users: [],
      messages: []
    };

    if (useMongoDB) {
      const room = new Room(roomData);
      await room.save();
      console.log('[API] Room created:', room);
      res.json(room);
    } else {
      roomData.createdAt = new Date();
      roomData.updatedAt = new Date();
      inMemoryRooms.set(roomId, roomData);
      console.log('[API] Room created (in-memory):', roomData);
      res.json(roomData);
    }
  } catch (error) {
    console.error('[API] Failed to create room:', error);
    res.status(500).json({ message: 'Failed to create room' });
  }
});

app.get('/api/rooms', async (req, res) => {
  try {
    let rooms;
    if (useMongoDB) {
      rooms = await Room.find({ isPrivate: false })
        .select('roomId name users createdAt')
        .sort({ updatedAt: -1 })
        .limit(20);
    } else {
      rooms = Array.from(inMemoryRooms.values())
        .filter(room => !room.isPrivate)
        .map(room => ({
          roomId: room.roomId,
          name: room.name,
          users: room.users,
          createdAt: room.createdAt
        }))
        .sort((a, b) => b.updatedAt - a.updatedAt)
        .slice(0, 20);
    }
    
    res.json(rooms);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch rooms' });
  }
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(useMongoDB ? 'Using MongoDB for data persistence' : 'Using in-memory storage for data persistence');
});