import { useEffect, useState, useRef } from 'react';
import Editor from '@monaco-editor/react';
import collaborationSocket from '../services/collaborationSocket';
import './CollaborativeEditor.css';

function CollaborativeEditor({ sessionId, authToken, language }) {
  const [code, setCode] = useState('');
  const [connectedUsers, setConnectedUsers] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [version, setVersion] = useState(0);
  const editorRef = useRef(null);
  const isRemoteChange = useRef(false);
  const debounceTimeoutRef = useRef(null); // need to persist across re-renders

  useEffect(() => {
    // Connect to collaboration session
    collaborationSocket.connect(sessionId, authToken)
      .then(() => {
        console.log('Connected to collaboration session');
        setIsConnected(true);
      })
      .catch(error => {
        console.error('Failed to connect:', error);
        alert('Failed to connect to collaboration session');
      });

    // Setup event listeners
    collaborationSocket.on('session_state', handleSessionState);
    collaborationSocket.on('code_changed', handleCodeChanged);
    collaborationSocket.on('user_joined', handleUserJoined);
    collaborationSocket.on('user_left', handleUserLeft);
    collaborationSocket.on('code_update_ack', handleCodeUpdateAck);
  }, [sessionId, authToken]);

  const handleSessionState = (data) => {
    console.log('Received initial session state');
    isRemoteChange.current = true;
    setCode(data.code);
    setConnectedUsers(data.connectedUsers);
    setVersion(data.version);
  };

  const handleCodeChanged = (data) => {
    console.log('Code changed by another user');
    isRemoteChange.current = true;
    setCode(data.code);
    setVersion(data.version);
  };

  const handleUserJoined = (data) => {
    console.log('User joined:', data.userId);
    setConnectedUsers(data.connectedUsers);
  };

  const handleUserLeft = (data) => {
    console.log('User left:', data.userId);
    setConnectedUsers(data.connectedUsers);
  };

  const handleCodeUpdateAck = (data) => {
    console.log('Code update acknowledged');
    setVersion(data.version);
  };

  const handleEditorChange = (value) => {
    // Skip if this is a remote change
    if (isRemoteChange.current) {
      isRemoteChange.current = false;
      return;
    }

    setCode(value);
    
    // Debounce code updates to avoid flooding the server
    // Updates are sent only after the user pauses typing for 500ms
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    
    debounceTimeoutRef.current = setTimeout(() => {
      collaborationSocket.updateCode(value);
      debounceTimeoutRef.current = null;
    }, 500);
  };

  const handleLeaveSession = () => {
    if (window.confirm('Are you sure you want to leave this session?')) {
      collaborationSocket.disconnect();
    }
  };

  // Callback that runs when the Monaco editor component has finished mounting.
  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;
  };

  return (
    <div className="collaborative-editor">
      <div className="editor-header">
        <div className="connection-status">
          <span className={isConnected ? 'status-connected' : 'status-disconnected'}>
            {isConnected ? '● Connected' : '○ Disconnected'}
          </span>
        </div>
        
        <div className="connected-users">
          <span>Users in session: {connectedUsers.length}</span>
        </div>

        <button 
          onClick={handleLeaveSession}
          className="btn-leave"
        >
          Leave Session
        </button>
      </div>
      
      <Editor
        height="800px"
        language={language}
        value={code}
        onChange={handleEditorChange}
        onMount={handleEditorDidMount}
        theme="vs-dark"
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          wordWrap: 'on',
          automaticLayout: true,
          scrollBeyondLastLine: false,
          readOnly: false
        }}
      />

      <div className="editor-footer">
        <span className="version-info">
          Version: {version}
        </span>
      </div>
    </div>
  );
}

export default CollaborativeEditor;