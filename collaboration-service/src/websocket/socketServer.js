const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const config = require('../config');
const logger = require('../utils/logger');
const sessionService = require('../services/sessionService');

class SocketServer {
  constructor(httpServer) {
    this.io = new Server(httpServer, {
      cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:3000',
        methods: ['GET', 'POST']
      },
      // 'websocket' provides a bidirectional and low-latency communication channel
      // 'polling' consists of successive HTTP requests 
      // 'polling' is a fallback for environments where WebSocket is not supported
      transports: ['websocket', 'polling']
    });
    
    this.setupMiddleware();
    this.setupEventHandlers();

    logger.info('Socket.IO server initialized');
  }

  setupMiddleware() {
    // Authentication middleware
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token;
        if (!token) {
          return next(new Error('Authentication token required'));
        }

        const decoded = jwt.verify(token, config.jwt.secret);
        socket.userId = decoded.userId;

        logger.debug(`User authenticated: ${socket.userId}`);
        next();
      } catch (err) {
        logger.error('Socket authentication failed:', err.message);
        next(new Error('Authentication failed'));
      }
    });

    // Session validation middleware
    this.io.use(async (socket, next) => {
      try {
        const { sessionId } = socket.handshake.query;
        if (!sessionId) {
          return next(new Error('Session ID required'));
        }

        const session = await sessionService.getSession(sessionId);
        if (!session) {
          return next(new Error('Session not found'));
        }

        if (!session.participants.includes(socket.userId)) {
          return next(new Error('User not authorized for this session'));
        }

        socket.sessionId = sessionId;
        
        next();
      } catch (err) {
        logger.error('Session validation failed:', err.message);
        next(new Error('Session validation failed'));
      }
    });
  }

  setupEventHandlers() {
    this.io.on('connection', async (socket) => {
      logger.info(`User connected: ${socket.userId} to session: ${socket.sessionId}`);
      
      try {
        // Updates backend session state
        const session = await sessionService.joinSession(socket.sessionId, socket.userId);
        
        // Adds the user's socket to a Socket.IO room, which is
        // an arbitrary channel that sockets can join and leave
        await socket.join(socket.sessionId);
        
        // Notify other participants in the room
        socket.to(socket.sessionId).emit('user_joined', {
          userId: socket.userId,
          connectedUsers: session.connectedUsers.map(u => u.userId),
        });
        
        // Send current session state to newly connected user
        socket.emit('session_state', {
          sessionId: socket.sessionId,
          questionId: session.questionId,
          difficulty: session.difficulty,
          topic: session.topic,
          language: session.language,
          currentCode: session.currentCode,
          connectedUsers: session.connectedUsers.map(u => u.userId),
        });
        
        this.setupUserEventHandlers(socket);
        
      } catch (err) {
        logger.error(`Connection setup failed for user ${socket.userId}:`, err);
        socket.emit('error', { message: err.message });
        socket.disconnect();
      }
    });
  }

  setupUserEventHandlers(socket) {
    // Handle user disconnection
    socket.on('disconnect', async (reason) => {
      logger.info(`User disconnected: ${socket.userId}, reason: ${reason}`);
      
      try {
        const session = await sessionService.leaveSession(socket.sessionId, socket.userId);
        
        // Notify other participants in the room
        if (session) {
          socket.to(socket.sessionId).emit('user_left', {
            userId: socket.userId,
            connectedUsers: session.connectedUsers.map(u => u.userId)
          });
          
          // Check if session was auto-terminated
          if (session.status === 'terminated') {
            logger.info(`Session auto-terminated: ${socket.sessionId}`);
          }
        }
      } catch (err) {
        logger.error(`Disconnect cleanup failed for user ${socket.userId}:`, err);
      }
    });

    // Basic ping/pong for connection health
    socket.on('ping', () => {
      socket.emit('pong', { timestamp: Date.now() });
    });
  }
}

export default SocketServer;