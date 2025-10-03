const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { createServer } = require('http');
const sessionRoutes = require('./controllers/sessionController');

const app = express();
const httpServer = createServer(app);

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true // enable cookies and credentials
}));
// allow JSON data in request body to be parsed
app.use(express.json());
// allow URL-encoded data in request body to be parsed
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/collaboration', sessionRoutes);

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', service: 'collaboration-service' });
});

module.exports = { app, httpServer };