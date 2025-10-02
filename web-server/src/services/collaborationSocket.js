import { io } from 'socket.io-client';

class CollaborationSocket {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
    this.connectionState = 'disconnected';
    this.currentVersion = 0;
  }

  // Connect to collaboration session
  connect(sessionId, authToken) {
    const socketUrl = `ws://localhost:8080`;
    
    this.socket = io(socketUrl, {
      auth: { token: authToken },
      query: { sessionId },
      transports: ['websocket', 'polling'],
    });

    this.setupEventHandlers();
    
    return new Promise((resolve, reject) => {
      this.socket.on('connect', () => {
        console.log('Connected to collaboration session');
        this.connectionState = 'connected';
        resolve();
      });

      this.socket.on('connect_error', (error) => {
        console.error('Connection error:', error);
        this.connectionState = 'error';
        reject(error);
      });
    });
  }

  setupEventHandlers() {
    // Receive initial session state
    this.socket.on('session_state', (data) => {
      console.log('Received session state:', data);
      this.currentVersion = data.version;
      this.emit('session_state', data);
    });

    // Handle code changes from other users
    this.socket.on('code_changed', (data) => {
      console.log('Code changed by:', data.userId);
      this.currentVersion = data.version;
      this.emit('code_changed', data);
    });

    // Handle users joining
    this.socket.on('user_joined', (data) => {
      console.log('User joined:', data.userId);
      this.emit('user_joined', data);
    });

    // Handle users leaving
    this.socket.on('user_left', (data) => {
      console.log('User left:', data.userId);
      this.emit('user_left', data);
    });

    // Handle users losing connection
    this.socket.on('user_lost_connection', (data) => {
      console.log('User lost connection:', data.userId);
      this.emit('user_lost_connection', data);
    });

    // Handle errors
    this.socket.on('error', (error) => {
      console.error('Socket error:', error);
      this.emit('error', error);
    });

    // Handle acknowledgments
    this.socket.on('code_update_ack', (data) => {
      console.log('Code update acknowledged');
      this.currentVersion = data.version;
      this.emit('code_update_ack', data);
    });
  }

  // Send code update
  updateCode(code) {
    if (!this.socket?.connected) {
      console.warn('Cannot update code: not connected');
      return;
    }

    this.socket.emit('code_update', { code });
  }

  // Event listener management
  // Registers a callback function to be called for the event
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  // Unregisters a previously registered callback for the event
  off(event, callback) {
    if (!this.listeners.has(event)) return;
    
    const callbacks = this.listeners.get(event);
    const index = callbacks.indexOf(callback);
    if (index > -1) {
      callbacks.splice(index, 1);
    }
  }

  // Triggers all callbacks registered for the specified event
  emit(event, data) {
    if (!this.listeners.has(event)) return;
    
    this.listeners.get(event).forEach(callback => {
      callback(data);
    });
  }

  // Disconnect
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connectionState = 'disconnected';
    }
  }

  // Get current state
  getState() {
    return {
      connected: this.socket?.connected || false,
      connectionState: this.connectionState,
      currentVersion: this.currentVersion
    };
  }
}

export default new CollaborationSocket();