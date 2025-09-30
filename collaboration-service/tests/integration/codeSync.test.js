const { createServer } = require('http');
const SocketServer = require('../../src/websocket/socketServer');
const Client = require('socket.io-client');
const Session = require('../../src/models/sessionModel');
const database = require('../../src/config/database');
const jwt = require('jsonwebtoken');
const config = require('../../src/config');

describe('Code Synchronization', () => {
  let httpServer, ioServer;
  let client1, client2;
  let session;

  beforeAll(async () => {
    await database.connect('mongodb://127.0.0.1:27017/peerprep_test');
    httpServer = createServer();
    ioServer = new SocketServer(httpServer);
    // Starts the HTTP server on a random available port
    await new Promise((resolve) => {
      httpServer.listen(0, resolve);
    });
  });

  afterAll(async () => {
    httpServer.close();
    await database.disconnect();
  });

  beforeEach(async () => {
    await Session.deleteMany({});

    // Create test session
    session = new Session({
      sessionId: 'test-sync-session',
      participants: ['user1', 'user2'],
      questionId: 'question1',
      difficulty: 'medium',
      topic: 'algorithms',
      language: 'python'
    });
    await session.save();
  });

  afterEach(async () => {
    if (client1?.connected) {
      client1.disconnect();
      // Wait for the server to finish processing the 'disconnect' event
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    if (client2?.connected) {
      client2.disconnect();
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  });

  test('should synchronize code between two users', (done) => {
    const port = httpServer.address().port;
    const token1 = jwt.sign({ userId: 'user1' }, config.jwt.secret);
    const token2 = jwt.sign({ userId: 'user2' }, config.jwt.secret);

    client1 = Client(`http://localhost:${port}`, {
      auth: { token: token1 },
      query: { sessionId: 'test-sync-session' }
    });

    client2 = Client(`http://localhost:${port}`, {
      auth: { token: token2 },
      query: { sessionId: 'test-sync-session' }
    });

    // User 2 listens for code changes
    client2.on('code_changed', (data) => {
      expect(data.code).toBe('Hello World');
      expect(data.userId).toBe('user1');
      done();
    });

    // User 1 sends code update after both connect
    let connectedCount = 0;
    const onConnect = () => {
      connectedCount++;
      if (connectedCount === 2) {
        // Both connected, send update
        client1.emit('code_update', {
          code: 'Hello World'
        });
      }
    };

    client1.on('connect', onConnect);
    client2.on('connect', onConnect);
  });

  test('should retrieve state on connection', (done) => {
    const port = httpServer.address().port;
    const token1 = jwt.sign({ userId: 'user1' }, config.jwt.secret);

    client1 = Client(`http://localhost:${port}`, {
      auth: { token: token1 },
      query: { sessionId: 'test-sync-session' }
    });

    client1.on('session_state', (data) => {
      expect(data.sessionId).toBe('test-sync-session');
      expect(data.currentCode).toBe('');
      expect(data.codeVersion).toBe(0);
      done();
    });
  });
});