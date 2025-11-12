require('dotenv').config();

module.exports = {
  server: {
    port: process.env.PORT || 3004,
    environment: process.env.NODE_ENV || 'development'
  },
  database: {
    uri: process.env.MONGO_URI || 'mongodb://root:password@mongo:27017/collaboration_service?authSource=admin',
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRY || '24h'
  }
};