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
  topic: Joi.string().required(),
  language: Joi.string().required()
});

// Create new collaboration session
router.post('/sessions', authenticateToken, async (req, res) => {
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

    // Verify requesting user is one of the participants
    if (!value.participants.includes(req.userId)) {
      // 403 Forbidden
      return res.status(403).json({
        success: false,
        message: 'User must be one of the participants'
      });
    }

    const session = await sessionService.createSession(value);
    
    // 201 Created
    res.status(201).json({
      success: true,
      data: {
        sessionId: session.sessionId,
        socketUrl: `ws://localhost:${config.server.port}`,
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
        topic: session.topic,
        language: session.language,
        connectedUsers: session.connectedUsers.map(u => u.userId),
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
        topic: session.topic,
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

module.exports = router;