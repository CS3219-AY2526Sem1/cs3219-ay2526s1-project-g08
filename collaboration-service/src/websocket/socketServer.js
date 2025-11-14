const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const config = require("../config");
const logger = require("../utils/logger");
const sessionService = require("../services/sessionService");
const yjsDocumentManager = require("../services/yjsDocumentManager");

class SocketServer {
  constructor(httpServer) {
    const allowedOrigins = [
      "http://localhost:3000",
      "http://localhost:5173",
      "https://dtdp1nnlnq3yh.cloudfront.net",
      process.env.FRONTEND_URL,
    ].filter(Boolean);

    this.io = new Server(httpServer, {
      path: "/collaboration/socket.io", // Match ALB routing and client connection path
      cors: {
        origin: allowedOrigins,
        methods: ["GET", "POST"],
      },
      // 'websocket' provides a bidirectional and low-latency communication channel
      // 'polling' consists of successive HTTP requests
      // 'polling' is a fallback for environments where WebSocket is not supported
      transports: ["websocket", "polling"],
    });

    this.setupMiddleware();
    this.setupEventHandlers();

    logger.info("Socket.IO server initialized");
  }

  setupMiddleware() {
    // Authentication middleware
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token;
        if (!token) {
          return next(new Error("Authentication token required"));
        }

        const decoded = jwt.verify(token, config.jwt.secret);
        socket.userId = decoded.userId;

        logger.debug(`User authenticated: ${socket.userId}`);
        next();
      } catch (err) {
        logger.error("Socket authentication failed:", err.message);
        next(new Error("Authentication failed"));
      }
    });

    // Session validation middleware
    this.io.use(async (socket, next) => {
      try {
        const { sessionId } = socket.handshake.query;
        if (!sessionId) {
          return next(new Error("Session ID required"));
        }

        const session = await sessionService.getSession(sessionId);
        if (!session) {
          return next(new Error("Session not found"));
        }

        if (!session.participants.includes(socket.userId)) {
          return next(new Error("User not authorized for this session"));
        }

        socket.sessionId = sessionId;

        next();
      } catch (err) {
        logger.error("Session validation failed:", err.message);
        next(new Error("Session validation failed"));
      }
    });
  }

  setupEventHandlers() {
    this.io.on("connection", async (socket) => {
      logger.info(
        `User connected: ${socket.userId} to session: ${socket.sessionId}`
      );

      try {
        // Updates backend session state
        const session = await sessionService.joinSession(
          socket.sessionId,
          socket.userId
        );

        // Adds the user's socket to a Socket.IO room, which is
        // an arbitrary channel that sockets can join and leave
        await socket.join(socket.sessionId);

        // Ensure Yjs document is loaded in memory
        await yjsDocumentManager.getDocument(socket.sessionId);

        // 🚨 CRITICAL: Send initial Yjs state immediately on connection
        // This prevents race conditions where client requests sync before doc is ready
        const initialUpdate = await yjsDocumentManager.getStateAsUpdate(socket.sessionId);
        socket.emit("yjs-sync-response", {
          update: Array.from(initialUpdate),
        });
        logger.debug(`Sent initial Yjs sync to user ${socket.userId} in session ${socket.sessionId}`);

        // 🚨 FIX: Refresh session to get current connectedUsers after all setup
        const currentSession = await sessionService.getSession(socket.sessionId);
        const connectedUsers = currentSession.connectedUsers.map((u) => u.userId);

        // Notify other participants in the room
        socket.to(socket.sessionId).emit("user_joined", {
          userId: socket.userId,
          connectedUsers: connectedUsers,
          timestamp: Date.now(),
        });

        // Send current session state to newly connected or reconnected user
        socket.emit("session_state", {
          sessionId: socket.sessionId,
          connectedUsers: connectedUsers,
        });

        this.setupUserEventHandlers(socket);
        this.setupYjsHandlers(socket);

        logger.info(`User ${socket.userId} fully connected with Yjs`);
      } catch (err) {
        logger.error(`Connection setup failed for user ${socket.userId}:`, err);
        socket.emit("error", { message: err.message });
        socket.disconnect();
      }
    });
  }

  setupUserEventHandlers(socket) {
    // Handle user disconnection
    socket.on("disconnect", async (reason) => {
      logger.info(`User disconnected: ${socket.userId}, reason: ${reason}`);

      try {
        const session = await sessionService.leaveSession(
          socket.sessionId,
          socket.userId
        );

        // Notify other participants in the room
        if (session) {
          socket.to(socket.sessionId).emit("user_left", {
            userId: socket.userId,
            connectedUsers: session.connectedUsers.map((u) => u.userId),
            timestamp: Date.now(),
          });

          // Check if session was auto-terminated
          if (session.status === "terminated") {
            await yjsDocumentManager.cleanupDocument(socket.sessionId);
            logger.info(`Session auto-terminated: ${socket.sessionId}`);
          }
        }
      } catch (err) {
        logger.error(
          `Disconnect cleanup failed for user ${socket.userId}:`,
          err
        );
      }
    });

    // Basic ping/pong for connection health
    socket.on("ping", () => {
      socket.emit("pong", { timestamp: Date.now() });
    });
  }

  setupYjsHandlers(socket) {
    // Handle sync request from client (initial connection)
    socket.on("yjs-sync-request", async (data) => {
      try {
        const { stateVector } = data;
        const { sessionId } = socket;

        // Get state as update
        const update = await yjsDocumentManager.getStateAsUpdate(
          sessionId,
          stateVector ? Array.from(stateVector) : null
        );

        // Send sync response
        socket.emit("yjs-sync-response", {
          update: Array.from(update),
        });

        logger.debug(
          `Sent Yjs sync to user ${socket.userId} in session ${sessionId}`
        );
      } catch (error) {
        logger.error("Yjs sync error:", error);
        socket.emit("error", { message: "Failed to sync document" });
      }
    });

    // Handle Yjs updates from clients
    socket.on("yjs-update", async (data) => {
      try {
        const { sessionId, userId } = socket;
        const update = new Uint8Array(data.update);

        // Apply update to document
        const success = await yjsDocumentManager.applyUpdate(sessionId, update);

        if (success) {
          // Broadcast update to other user in session
          socket.to(sessionId).emit("yjs-update", {
            update: update,
            userId: userId,
          });

          logger.debug(
            `Broadcasted Yjs update from user ${userId} in session ${sessionId}`
          );
        }
      } catch (error) {
        logger.error("Yjs update error:", error);
        socket.emit("error", { message: "Failed to apply update" });
      }
    });
  }
}

module.exports = SocketServer;
