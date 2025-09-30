const Session = require('../models/sessionModel');
const logger = require('../utils/logger');

class CodeSyncService {
  // Update code in session
  async updateCode(sessionId, code, userId) {
    try {
      const session = await Session.findActiveById(sessionId);
      if (!session) {
        throw new Error('Session not found');
      }

      // Verify user is participant
      if (!session.participants.includes(userId)) {
        throw new Error('User not authorized');
      }

      session.updateCode(code, userId);
      await session.save();

      logger.debug(`Code updated in session ${sessionId} by user ${userId}`);
      
      return {
        sessionId: session.sessionId,
        code: session.currentCode,
        version: session.codeVersion,
        updatedBy: userId,
        timestamp: session.lastCodeUpdate.timestamp
      };

    } catch (error) {
      logger.error('Update code error:', error);
      throw error;
    }
  }

  // Get current code state
  async getCodeState(sessionId) {
    try {
      const session = await Session.findActiveById(sessionId);
      if (!session) {
        throw new Error('Session not found');
      }

      return {
        code: session.currentCode,
        version: session.codeVersion,
        lastUpdate: session.lastCodeUpdate
      };

    } catch (error) {
      logger.error('Get code state error:', error);
      throw error;
    }
  }
}

module.exports = new CodeSyncService();