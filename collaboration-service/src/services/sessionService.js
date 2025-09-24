const Session = require('../models/sessionModel');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

class SessionService {
  // Create new collaboration session
  async createSession({ participants, questionId, difficulty, topic, language }) {
    try {
      // Check if any participant already has an active session
      for (const userId of participants) {
        const existingSession = await Session.findActiveByUser(userId);
        if (existingSession) {
          throw new Error(`User ${userId} already has an active session`);
        }
      }

      const session = new Session({
        sessionId: uuidv4(),
        participants,
        questionId,
        difficulty,
        topic,
        language,
      });

      await session.save(); // Save document to DB
      logger.info(`Session created: ${session.sessionId}`);
      
      return session;

    } catch (error) {
      logger.error('Create session error:', error);
      throw error;
    }
  }

  // Get session by ID
  async getSession(sessionId) {
    try {
      return await Session.findActiveById(sessionId);
    } catch (error) {
      logger.error('Get session error:', error);
      throw error;
    }
  }

  // User joins session
  async joinSession(sessionId, userId) {
    try {
      const session = await Session.findActiveById(sessionId);
      if (!session) {
        throw new Error('Session not found or not active');
      }

      if (!session.participants.includes(userId)) {
        throw new Error('User not authorized for this session');
      }

      session.addUser(userId);
      await session.save();
      
      logger.info(`User ${userId} joined session ${sessionId}`);
      return session;

    } catch (error) {
      logger.error('Join session error:', error);
      throw error;
    }
  }

  // User leaves session
  async leaveSession(sessionId, userId) {
    try {
      const session = await Session.findActiveById(sessionId);
      if (!session) {
        return null; // Session already doesn't exist
      }

      session.removeUser(userId);
      await session.save();
      
      logger.info(`User ${userId} left session ${sessionId}`);
      return session;

    } catch (error) {
      logger.error('Leave session error:', error);
      throw error;
    }
  }

  // Terminate session
  async terminateSession(sessionId, reason = 'manual') {
    try {
      const session = await Session.findActiveById(sessionId);
      if (!session) {
        return false;
      }

      session.terminate(reason);
      await session.save();

      logger.info(`Session terminated: ${sessionId}, reason: ${reason}`);
      return true;

    } catch (error) {
      logger.error('Terminate session error:', error);
      throw error;
    }
  }

  // Get user's active session
  async getUserSession(userId) {
    try {
      return await Session.findActiveByUser(userId);
    } catch (error) {
      logger.error('Get user session error:', error);
      return null;
    }
  }

  // Get all active sessions (for monitoring)
  async getActiveSessions() {
    try {
      return await Session.getActiveSessions();
    } catch (error) {
      logger.error('Get active sessions error:', error);
      return [];
    }
  }

  // Get session statistics
  async getSessionStats() {
    try {
      const [totalSessions, activeSessions] = await Promise.all([
        Session.countDocuments(),
        Session.countDocuments({ status: 'active' })
      ]);

      return {
        totalSessions,
        activeSessions,
        terminatedSessions: totalSessions - activeSessions,
        timestamp: new Date()
      };

    } catch (error) {
      logger.error('Get session stats error:', error);
      return null;
    }
  }
}

module.exports = new SessionService();