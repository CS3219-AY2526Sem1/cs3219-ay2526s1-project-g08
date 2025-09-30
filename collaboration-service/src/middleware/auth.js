const jwt = require('jsonwebtoken');
const config = require('../config');
const logger = require('../utils/logger');

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  // authHeader format: Bearer <token>
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    // 401 Unauthorized
    return res.status(401).json({
      success: false,
      message: 'Access token required'
    });
  }

  jwt.verify(token, config.jwt.secret, (err, decoded) => {
    if (err) {
      logger.warn('Token verification failed:', err.message);
      // 403 Forbidden
      return res.status(403).json({
        success: false,
        message: 'Invalid or expired token'
      });
    }

    req.userId = decoded.userId;
    next(); // passes control to the next middleware function or route handler
  });
};

module.exports = { authenticateToken };