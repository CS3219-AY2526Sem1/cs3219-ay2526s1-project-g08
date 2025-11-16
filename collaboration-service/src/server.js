const { app, httpServer } = require('./app');
const database = require('./config/database');
const SocketServer = require('./websocket/socketServer');
const logger = require('./utils/logger');
const config = require('./config');

async function startServer() {
  try {
    // Connect to MongoDB
    logger.info('Connecting to MongoDB...');
    await database.connect();
    
    const isHealthy = await database.healthCheck();
    if (!isHealthy) {
      throw new Error('MongoDB health check failed');
    }
    
    logger.info('MongoDB connected successfully');
    
    // Initialize socket.io server
    // socketServer: For real-time events and messaging between clients.
    const socketServer = new SocketServer(httpServer);
    logger.info('WebSocket server initialized');
    
    // Start HTTP server
    // httpServer: For regular web traffic and API endpoints.
    httpServer.listen(config.server.port, () => {
      logger.info(`Collaboration service running on port ${config.server.port}`);
      logger.info(`WebSocket server running on port ${config.server.port}`);
    });

    // Graceful shutdown
    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

async function gracefulShutdown(signal) {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);
  
  try {
    httpServer.close(() => {
      logger.info('HTTP server closed');
    });

    await database.disconnect();
    
    logger.info('Graceful shutdown completed');
    process.exit(0);
    
  } catch (error) {
    logger.error('Error during shutdown:', error);
    process.exit(1);
  }
}

startServer();