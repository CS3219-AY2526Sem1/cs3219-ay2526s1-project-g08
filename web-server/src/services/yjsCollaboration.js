import * as Y from 'yjs';
import { MonacoBinding } from 'y-monaco';
import io from 'socket.io-client';
import config from '../config/environment';

class YjsCollaboration {
  constructor() {
    this.ydoc = null;
    this.socket = null;
    this.binding = null;
    this.synced = false;
    this.listeners = new Map();
  }

  initialize(sessionId, authToken, editor, monaco) {
    this.ydoc = new Y.Doc();
    const ytext = this.ydoc.getText('code');

    const socketUrl = config.ws.collaborationService;
    this.socket = io(socketUrl, {
      path: '/collaboration/socket.io',  // Must match server path configuration
      auth: { token: authToken },
      query: { sessionId: sessionId },
      transports: ['websocket', 'polling']
    });

    this.setupEventHandlers();
    this.setupSocketHandlers();

    // connect Monaco editor with Yjs document
    this.binding = new MonacoBinding(
      ytext,                    // Yjs shared text object
      editor.getModel(),        // Monaco editor's text model
      new Set([editor])         // Set of Monaco editors to sync
    );

    console.log('Yjs collaboration initialized with existing Socket.IO');
  }

  setupEventHandlers() {
    this.socket.on('connect', () => {
      console.log('✅ Socket.IO connected successfully!', this.socket.id);
      this.synced = false;
    });

    this.socket.on('connect_error', (error) => {
      console.error('❌ Socket.IO connection error:', error.message);
    });

    this.socket.on('session_state', (data) => {
      console.log('Received session state:', data);
      this.emit('session_state', data);
    });

    this.socket.on('user_joined', (data) => {
      console.log('User joined:', data.userId);
      this.emit('user_joined', data);
    });

    this.socket.on('user_left', (data) => {
      console.log('User left:', data.userId);
      this.emit('user_left', data);
    });

    this.socket.on('error', (error) => {
      console.error('Socket error:', error);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      this.synced = false;
    });
  }

  setupSocketHandlers() {
    // Receive sync response from server
    this.socket.on('yjs-sync-response', (data) => {
      const update = new Uint8Array(data.update);
      // Don't send this update back to server since it originated from there
      Y.applyUpdate(this.ydoc, update, 'server');
      this.synced = true;
      console.log('Yjs document synced');
    });

    // Receive updates from other users
    this.socket.on('yjs-update', (data) => {
      const update = new Uint8Array(data.update);
      // Don't send this update back to server since it originated from there
      Y.applyUpdate(this.ydoc, update, 'server');
      console.log('Received Yjs update from:', data.userId);
    });

    // Send updates to server when document changes
    this.ydoc.on('update', (update, origin) => {
      if (this.synced && origin !== 'server') {
        this.socket.emit('yjs-update', {
          update: update
        });
      }
    });
  }
  
  isSynced() {
    return this.synced;
  }

  isConnected() {
    return this.socket?.connected || false;
  }

  // Event listener management
  // Registers a callback function to be called for the event
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  // Triggers all callbacks registered for the specified event
  emit(event, data) {
    if (!this.listeners.has(event)) return;
    
    this.listeners.get(event).forEach(callback => {
      callback(data);
    });
  }

  destroy() {
    if (this.binding) {
      this.binding.destroy();
    }
    if (this.socket) {
      this.socket.disconnect();
    }
    if (this.ydoc) {
      this.ydoc.destroy();
    }
  }
}

export default YjsCollaboration;