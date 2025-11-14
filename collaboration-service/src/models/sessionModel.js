const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  participants: [{
    type: String,
    required: true
  }],
  questionId: {
    type: String,
    required: true
  },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    required: true
  },
  // common topics for matched users
  topics: [{
    type: String,
    required: true
  }],
  language: {
    type: String,
    required: true
  },

  status: {
    type: String,
    enum: ['active', 'terminated'],
    default: 'active',
    index: true
  },

  // Connected users (live data)
  connectedUsers: [{
    userId: String,
    connectedAt: {
      type: Date,
      default: Date.now
    }
  }],

  // CRDT document state (stored as binary)
  yjsState: {
    type: Buffer,
    default: null
  },

  // Track document version for debugging
  yjsVersion: {
    type: Number,
    default: 0
  },
  
  // Metadata
  terminationReason: String
}, {
  timestamps: true, // Automatically adds createdAt and updatedAt
});

// Instance methods for easier session management
sessionSchema.methods.addUser = function(userId) {
  const existingUser = this.connectedUsers.find(u => u.userId === userId);
  if (!existingUser) {
    this.connectedUsers.push({
      userId,
      connectedAt: new Date()
    });
  }
  return this;
};

sessionSchema.methods.removeUser = function(userId) {
  this.connectedUsers = this.connectedUsers.filter(u => u.userId !== userId);
  
  // 🚨 CRITICAL FIX: Terminate session when ANY user leaves (for matchmaking purposes)
  // This allows users to rejoin the queue immediately
  // The Yjs document can still exist for the remaining user if needed
  if (this.connectedUsers.length < this.participants.length) {
    this.status = 'terminated';
    this.terminationReason = this.connectedUsers.length === 0 
      ? 'all_users_disconnected' 
      : 'partner_left';
  }
  return this;
};

sessionSchema.methods.updateYjsState = function(stateUpdate) {
  this.yjsState = stateUpdate;
  this.yjsVersion += 1;
  return this;
};

sessionSchema.methods.terminate = function(reason = 'manual') {
  this.status = 'terminated';
  this.terminationReason = reason;
  this.connectedUsers = []; // Clear all connected users
  return this;
};

// Static methods for common queries
sessionSchema.statics.findActiveByUser = function(userId) {
  return this.findOne({
    participants: userId,
    status: 'active'
  });
};

sessionSchema.statics.findById = function(sessionId) {
  return this.findOne({
    sessionId,
  });
};

sessionSchema.statics.getActiveSessions = function() {
  return this.find({ status: 'active' });
};

module.exports = mongoose.model('Session', sessionSchema);