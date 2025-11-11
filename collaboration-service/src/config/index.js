require('dotenv').config();

module.exports = {
  server: {
    port: process.env.PORT || 3004,
    environment: process.env.NODE_ENV || 'development'
  },
  database: {
    uri: process.env.MONGO_URI || 'mongodb://localhost:27017/peerprep_collaboration',
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRY || '24h'
  }
};