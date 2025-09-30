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
  topic: {
    type: String,
    required: true
  },
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
  // Current session state
  currentCode: {
    type: String,
    default: ''
  },
  // Connected users (live data)
  connectedUsers: [{
    userId: String,
    connectedAt: {
      type: Date,
      default: Date.now
    }
  }],

  // Track code changes for version control
  codeVersion: {
    type: Number,
    default: 0
  },
  lastCodeUpdate: {
    userId: String,
    timestamp: Date
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
  
  // Auto-terminate if no users left
  if (this.connectedUsers.length === 0) {
    this.status = 'terminated';
    this.terminationReason = 'all_users_disconnected';
  }
  return this;
};

sessionSchema.methods.updateCode = function(code, userId) {
  this.currentCode = code;
  this.codeVersion += 1;
  this.lastCodeUpdate = {
    userId,
    timestamp: new Date()
  };
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

sessionSchema.statics.findActiveById = function(sessionId) {
  return this.findOne({
    sessionId,
    status: 'active'
  });
};

sessionSchema.statics.getActiveSessions = function() {
  return this.find({ status: 'active' });
};

module.exports = mongoose.model('Session', sessionSchema);