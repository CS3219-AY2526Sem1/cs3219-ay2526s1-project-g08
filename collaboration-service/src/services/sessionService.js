const Session = require('../models/sessionModel');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

class SessionService {
  // Create new collaboration session
  async createSession({ participants, questionId, difficulty, topics, language }) {
    try {
      // Remove the flawed check for active sessions
      // Instead, verify users are not currently in a session using user service
      for (const userId of participants) {
        const inSession = await this.checkUserInSession(userId);
        if (inSession) {
          throw new Error(`User ${userId} is currently in an active session`);
        }
      }

      const session = new Session({
        sessionId: uuidv4(),
        participants,
        questionId,
        difficulty,
        topics,
        language,
      });

      await session.save(); // Save document to DB
      
      // Update all participants' session status to true
      await this.updateParticipantsSessionStatus(participants, true);
      
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
      return await Session.findById(sessionId);
    } catch (error) {
      logger.error('Get session error:', error);
      throw error;
    }
  }

  // User joins session
  async joinSession(sessionId, userId) {
    try {
      const session = await Session.findById(sessionId);
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
      const session = await Session.findById(sessionId);
      if (!session) {
        return null; // Session already doesn't exist
      }

      session.removeUser(userId);
      await session.save();
      
      // Update user's session status to false when they leave
      await this.updateUserSessionStatus(userId, false);
      
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
      const session = await Session.findById(sessionId);
      if (!session) {
        return false;
      }

      session.terminate(reason);
      await session.save();

      // Update all participants' session status to false
      await this.updateParticipantsSessionStatus(session.participants, false);

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

  // Get user's session history
  async getUserSessionHistory(userId, options = {}) {
    try {
      const { 
        limit = 50, 
        offset = 0, 
        status = null // Can filter by 'active', 'completed', 'terminated'
      } = options;

      const query = {
        participants: userId
      };

      // Add status filter if provided
      if (status) {
        query.status = status;
      }

      const sessions = await Session.find(query)
        .sort({ updatedAt: -1 }) // Most recent first
        .skip(parseInt(offset))
        .limit(parseInt(limit))
        .select('sessionId participants questionId difficulty topics updatedAt')
        .lean(); // Convert to plain JavaScript objects for better performance

      return sessions;

    } catch (error) {
      logger.error('Get user session history error:', error);
      throw error;
    }
  }

  // Helper method to check if a user is currently in a session
  async checkUserInSession(userId) {
    try {
      const userServiceUrl = process.env.USER_SERVICE_URL || 'http://user-service:3001/user';
      const response = await fetch(`${userServiceUrl}/internal/session-status/${userId}`);
      
      if (response.ok) {
        const data = await response.json();
        return data.inSession;
      }
      
      logger.warn(`Failed to check session status for user ${userId}`);
      return false; // Default to false if check fails
    } catch (error) {
      logger.error(`Error checking user session status: ${error}`);
      return false; // Default to false if check fails
    }
  }

  // Helper method to update a single user's session status
  async updateUserSessionStatus(userId, inSession) {
    try {
      const userServiceUrl = process.env.USER_SERVICE_URL || 'http://user-service:3001/user';
      const response = await fetch(`${userServiceUrl}/internal/session-status/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ inSession }),
      });

      if (!response.ok) {
        logger.warn(`Failed to update session status for user ${userId}`);
      }
    } catch (error) {
      logger.error(`Error updating user session status: ${error}`);
    }
  }

  // Helper method to update multiple participants' session status
  async updateParticipantsSessionStatus(participants, inSession) {
    try {
      await Promise.all(
        participants.map(userId => this.updateUserSessionStatus(userId, inSession))
      );
    } catch (error) {
      logger.error(`Error updating participants session status: ${error}`);
    }
  }
}


module.exports = new SessionService();
