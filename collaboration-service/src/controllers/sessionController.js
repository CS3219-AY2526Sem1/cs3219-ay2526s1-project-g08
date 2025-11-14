const express = require('express');
const Joi = require('joi');
const sessionService = require('../services/sessionService');
const { authenticateToken } = require('../middleware/auth');
const config = require('../config');

const router = express.Router();

// req.userId is set by the authentication middleware (authenticateToken). 
// When a request is made with a valid token, the middleware verifies the token 
// and attaches the authenticated user's ID to the request object as req.userId.

// req.params contains route parameters extracted from the URL path.

// Validation schemas
const createSessionSchema = Joi.object({
  participants: Joi.array().items(Joi.string()).min(2).max(2).required(),
  questionId: Joi.string().required(),
  difficulty: Joi.string().valid('easy', 'medium', 'hard').required(),
  topics: Joi.array().items(Joi.string()).min(1).required(),
  language: Joi.string().required()
});

// Create new collaboration session
// Request sent by matching service
router.post('/sessions', async (req, res) => {
  try {
    const { error, value } = createSessionSchema.validate(req.body);
    if (error) {
      // 400 Bad Request
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        details: error.details
      });
    }

    const session = await sessionService.createSession(value);
    
    // 201 Created
    res.status(201).json({
      success: true,
      data: {
        sessionId: session.sessionId,
        createdAt: session.createdAt
      }
    });

  } catch (err) {
    // 500 Internal Server Error
    res.status(500).json({
      success: false,
      message: err.message || 'Internal server error'
    });
  }
});

// Get session details
router.get('/sessions/:sessionId', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    const session = await sessionService.getSession(sessionId);
    if (!session) {
      // 404 Not Found
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    // Verify user is authorized to view this session
    if (!session.participants.includes(req.userId)) {
      // 403 Forbidden
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this session'
      });
    }

    res.json({
      success: true,
      data: {
        participants: session.participants,
        questionId: session.questionId,
        difficulty: session.difficulty,
        topics: session.topics,
        language: session.language,
        connectedUsers: session.connectedUsers.map(u => u.userId),
        yjsState: session.yjsState ? session.yjsState.toString('base64') : null
      }
    });

  } catch (err) {
    // 500 Internal Server Error
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Internal endpoint for service-to-service communication
// Terminate session without authentication (for matching service)
router.delete('/internal/sessions/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    const session = await sessionService.getSession(sessionId);
    if (!session) {
      // 404 Not Found
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    await sessionService.terminateSession(sessionId, 'match_declined');
        
    res.json({
      success: true,
      message: 'Session terminated successfully'
    });

  } catch (err) {
    // 500 Internal Server Error
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Terminate session
router.delete('/sessions/:sessionId', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    const session = await sessionService.getSession(sessionId);
    if (!session) {
      // 404 Not Found
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    // Verify user is authorized to terminate this session
    if (!session.participants.includes(req.userId)) {
      // 403 Forbidden
      return res.status(403).json({
        success: false,
        message: 'Not authorized to terminate this session'
      });
    }

    await sessionService.terminateSession(sessionId, 'api_request');
        
    res.json({
      success: true,
      message: 'Session terminated successfully'
    });

  } catch (err) {
    // 500 Internal Server Error
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});


// Get authenticated user's active session
router.get('/user/session', authenticateToken, async (req, res) => {
  try {
    const session = await sessionService.getUserSession(req.userId);
    
    res.json({
      success: true,
      data: session ? {
        sessionId: session.sessionId,
        participants: session.participants,
        questionId: session.questionId,
        difficulty: session.difficulty,
        topics: session.topics,
        language: session.language,
        connectedUsers: session.connectedUsers.map(u => u.userId),
      } : null
    });

  } catch (err) {
    // 500 Internal Server Error
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get authenticated user's session history
router.get('/user/history', authenticateToken, async (req, res) => {
  try {
    const { limit, offset, status } = req.query;
    
    const sessions = await sessionService.getUserSessionHistory(
      req.userId,
      { limit, offset, status }
    );
    
    res.json({
      success: true,
      data: sessions,
      count: sessions.length
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

module.exports = router;