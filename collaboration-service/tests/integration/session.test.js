const request = require('supertest');
const { app } = require('../../src/app');
const Session = require('../../src/models/sessionModel');
const database = require('../../src/config/database');
const jwt = require('jsonwebtoken');
const config = require('../../src/config');

describe('Session API', () => {
  let authToken;
  let userId1 = 'user-1';
  let userId2 = 'user-2';

  beforeAll(async () => {
    // Connect to test database
    await database.connect('mongodb://127.0.0.1:27017/peerprep_test');
    
    // Create test auth token
    authToken = jwt.sign(
      { userId: userId1 },
      config.jwt.secret,
      { expiresIn: '1h' }
    );
  });

  beforeEach(async () => {
    // Clean up database
    await Session.deleteMany({});
  });

  afterAll(async () => {
    await database.disconnect();
  });

  describe('POST /api/collaboration/sessions', () => {
    it('should create a new session successfully', async () => {
      const sessionData = {
        participants: [userId1, userId2],
        questionId: 'question-1',
        difficulty: 'medium',
        topic: 'algorithms',
        language: 'python'
      };

      const response = await request(app)
        .post('/api/collaboration/sessions')
        .set('Authorization', `Bearer ${authToken}`)
        .send(sessionData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.sessionId).toBeDefined();

      // Verify session was created in database
      const session = await Session.findOne({ sessionId: response.body.data.sessionId });
      expect(session).toBeTruthy();
      expect(session.status).toBe('active');
    });

    it('should reject session creation without 2 participants', async () => {
      const invalidData = {
        participants: [userId1], // Need 2 participants
        questionId: 'question-1',
        difficulty: 'medium',
        topic: 'algorithms',
        language: 'python'
      };

      const response = await request(app)
        .post('/api/collaboration/sessions')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should reject session creation with missing data', async () => {
      const invalidData = {
        participants: [userId1, userId2],
        questionId: 'question-1',
        difficulty: 'medium',
        topic: 'algorithms',
        // Missing language
      };

      const response = await request(app)
        .post('/api/collaboration/sessions')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should reject session creation with invalid difficulty', async () => {
      const invalidData = {
        participants: [userId1, userId2], 
        questionId: 'question-1',
        difficulty: 'impossible', // Invalid difficulty
        topic: 'algorithms',
        language: 'python'
      };

      const response = await request(app)
        .post('/api/collaboration/sessions')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should prevent creating session if user already has active session', async () => {
      // Create existing session
      const existingSession = new Session({
        sessionId: 'existing-session',
        participants: [userId1, 'other-user'],
        questionId: 'question-1',
        difficulty: 'easy',
        topic: 'arrays',
        language: 'javascript',
      });
      await existingSession.save();

      const sessionData = {
        participants: [userId1, userId2],
        questionId: 'question-2',
        difficulty: 'medium',
        topic: 'algorithms',
        language: 'python'
      };

      const response = await request(app)
        .post('/api/collaboration/sessions')
        .set('Authorization', `Bearer ${authToken}`)
        .send(sessionData)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('already has an active session');
    });
  });

  describe('GET /api/collaboration/sessions/:sessionId', () => {
    it('should retrieve session details', async () => {
      // Create a session first
      const session = new Session({
        sessionId: 'test-session',
        participants: [userId1, userId2],
        questionId: 'question-1',
        difficulty: 'medium',
        topic: 'algorithms',
        language: 'python'
      });
      await session.save();

      const response = await request(app)
        .get(`/api/collaboration/sessions/test-session`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.participants).toEqual([userId1, userId2]);
      expect(response.body.data.questionId).toBe('question-1');
      expect(response.body.data.difficulty).toBe('medium');
      expect(response.body.data.topic).toBe('algorithms');
      expect(response.body.data.language).toBe('python');
    });

    it('should return 404 for non-existent session', async () => {
      const response = await request(app)
        .get('/api/collaboration/sessions/non-existent')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Session not found');
    });
  });

  describe('DELETE /api/collaboration/sessions/:sessionId', () => {
    it('should terminate session successfully', async () => {
      // Create a session first
      const session = new Session({
        sessionId: 'test-session',
        participants: [userId1, userId2],
        questionId: 'question-1',
        difficulty: 'medium',
        topic: 'algorithms',
        language: 'python'
      });
      await session.save();

      const response = await request(app)
        .delete(`/api/collaboration/sessions/test-session`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Session terminated successfully');

      // Verify session was terminated in database
      const terminatedSession = await Session.findOne({ sessionId: 'test-session' });
      expect(terminatedSession.status).toBe('terminated');
    });
  });
});