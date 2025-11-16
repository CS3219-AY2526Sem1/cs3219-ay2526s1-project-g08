const mongoose = require('mongoose');
const logger = require('../utils/logger');
const config = require('./index');

class Database {
  constructor() {
    this.connection = null;
  }

  async connect(uri) {
    try {
      this.connection = await mongoose.connect(uri || config.database.uri);
      
      // Connection event handlers
      mongoose.connection.on('connected', () => {
        logger.info('MongoDB connected successfully');
      });

      mongoose.connection.on('error', (err) => {
        logger.error('MongoDB connection error:', err);
      });

      mongoose.connection.on('disconnected', () => {
        logger.warn('MongoDB disconnected');
      });

      // Graceful shutdown
      process.on('SIGINT', this.gracefulShutdown);
      process.on('SIGTERM', this.gracefulShutdown);

      logger.info('Database connection established');
      return this.connection;

    } catch (error) {
      logger.error('Failed to connect to MongoDB:', error);
      throw error;
    }
  }

  async disconnect() {
    if (this.connection) {
      await mongoose.disconnect();
    }
  }

  async healthCheck() {
    try {
      return mongoose.connection.readyState === 1;
    } catch (error) {
      logger.error('MongoDB health check failed:', error);
      return false;
    }
  }

  gracefulShutdown = async () => {
    try {
      await this.disconnect();
      process.exit(0);
    } catch (error) {
      logger.error('Error during database shutdown:', error);
      process.exit(1);
    }
  };
}

// Export singleton instance
module.exports = new Database();