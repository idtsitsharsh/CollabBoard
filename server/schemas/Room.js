const mongoose = require('mongoose');

// Room Schema ---> when room made ( priavte or public )
const roomSchema = new mongoose.Schema({
  roomId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    default: 'Untitled Room'
  },
  isPrivate: {
    type: Boolean,
    default: false
  },
  password: {
    type: String,
    default: ''
  },
  createdBy: {
    type: String,
    required: true
  },
  users: [{
    socketId: String,
    username: String,
    joinedAt: {
      type: Date,
      default: Date.now
    }
  }],
  messages: [{
    username: String,
    message: String,
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  canvasData: {
    type: String,
    default: ''
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field before saving
roomSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('Room', roomSchema); 