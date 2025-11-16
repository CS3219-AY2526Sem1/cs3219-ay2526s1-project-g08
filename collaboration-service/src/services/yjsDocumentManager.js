const Y = require('yjs');
const Session = require('../models/sessionModel');
const logger = require('../utils/logger');

class YjsDocumentManager {
  constructor() {
    // Store active Yjs documents in memory, keyed by sessionId
    this.documents = new Map();
    
    this.CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes
    this.startCleanupTask();
  }

  async getDocument(sessionId) {
    // Return existing document if in memory
    if (this.documents.has(sessionId)) {
      return this.documents.get(sessionId);
    }

    // Create new document
    const ydoc = new Y.Doc();
    
    // Load persisted state from database
    try {
      const session = await Session.findOne({ sessionId, status: 'active' });
      if (session && session.yjsState) {
        Y.applyUpdate(ydoc, session.yjsState);
        logger.debug(`Loaded Yjs state for session ${sessionId}, version ${session.yjsVersion}`);
      }
    } catch (error) {
      logger.error(`Failed to load Yjs state: ${error.message}`);
    }

    // Store document in memory
    this.documents.set(sessionId, ydoc);

    // Setup auto-persistence on updates (debounced)
    let persistTimeout = null;
    ydoc.on('update', (update) => {
      // Save to database when no updates for 2 seconds
      if (persistTimeout) clearTimeout(persistTimeout);
      
      persistTimeout = setTimeout(async () => {
        await this.persistDocument(sessionId, update);
      }, 2000);
    });

    logger.info(`Created Yjs document for session ${sessionId}`);
    return ydoc;
  }

  async persistDocument(sessionId) {
    try {
      const ydoc = this.documents.get(sessionId);
      if (!ydoc) return;

      const session = await Session.findOne({ sessionId, status: 'active' });
      if (!session) {
        logger.warn(`Session ${sessionId} not found for persistence`);
        return;
      }

      // Encode full state
      const state = Y.encodeStateAsUpdate(ydoc);
      session.updateYjsState(Buffer.from(state));
      
      await session.save();

      logger.debug(`Persisted Yjs state for session ${sessionId}, version ${session.yjsVersion}`);
    } catch (error) {
      logger.error(`Failed to persist Yjs document: ${error.message}`);
    }
  }

  async applyUpdate(sessionId, update) {
    try {
      const ydoc = await this.getDocument(sessionId);
      Y.applyUpdate(ydoc, new Uint8Array(update));
      
      logger.debug(`Applied update to session ${sessionId}`);
      return true;
    } catch (error) {
      logger.error(`Failed to apply update: ${error.message}`);
      return false;
    }
  }

  async getStateAsUpdate(sessionId, stateVector = null) {
    const ydoc = await this.getDocument(sessionId);
    
    if (stateVector) {
      // Only send missing updates based on state vector
      return Y.encodeStateAsUpdate(ydoc, new Uint8Array(stateVector));
    }
    
    return Y.encodeStateAsUpdate(ydoc);
  }

  async cleanupDocument(sessionId) {
    const ydoc = this.documents.get(sessionId);
    if (ydoc) {
      // Final persistence before cleanup
      await this.persistDocument(sessionId);
      
      // Destroy document
      ydoc.destroy();
      this.documents.delete(sessionId);
      
      logger.info(`Cleaned up Yjs document for session ${sessionId}`);
    }
  }

  async cleanupUnusedDocuments() {
    for (const sessionId of this.documents.keys()) {
      try {
        const session = await Session.findOne({ sessionId });
        
        // Remove if session doesn't exist or is terminated
        if (!session || session.status === 'terminated') {
          await this.cleanupDocument(sessionId);
        }
      } catch (error) {
        logger.error(`Cleanup error for session ${sessionId}: ${error.message}`);
      }
    }
  }

  startCleanupTask() {
    setInterval(() => {
      this.cleanupUnusedDocuments().catch(error => {
        logger.error('Cleanup task error:', error);
      });
    }, this.CLEANUP_INTERVAL);

    logger.info('Yjs document cleanup task started');
  }
}

module.exports = new YjsDocumentManager();