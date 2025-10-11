import { useEffect, useState, useRef } from 'react';
import Editor from '@monaco-editor/react';
import YjsCollaboration from '../services/yjsCollaboration';
import './CollaborativeEditor.css';

function CollaborativeEditor({ sessionId, authToken, language }) {
  const [connectedUsers, setConnectedUsers] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const editorRef = useRef(null);
  const yjsCollab = useRef(null);

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      if (yjsCollab.current) {
        yjsCollab.current.destroy();
      }
    };
  }, []);
  
  const handleSessionState = (data) => {
    console.log('Received initial session state');
    setConnectedUsers(data.connectedUsers);
  };

  const handleUserJoined = (data) => {
    console.log('User joined:', data.userId);
    setConnectedUsers(data.connectedUsers);
  };

  const handleUserLeft = (data) => {
    console.log('User left:', data.userId);
    setConnectedUsers(data.connectedUsers);
  };

  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;

    // Initialize Yjs collaboration
    yjsCollab.current = new YjsCollaboration();
    yjsCollab.current.initialize(sessionId, authToken, editor, monaco);
    yjsCollab.current.on('session_state', handleSessionState);
    yjsCollab.current.on('user_joined', handleUserJoined);
    yjsCollab.current.on('user_left', handleUserLeft);

    // Monitor connection status
    const statusInterval = setInterval(() => {
      if (yjsCollab.current) {
        setIsConnected(yjsCollab.current.isConnected());
      }
    }, 1000);

    return () => clearInterval(statusInterval);
  };

  const handleLeaveSession = () => {
    if (window.confirm('Are you sure you want to leave this session?')) {
      yjsCollab.current.destroy();
    }
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
        onMount={handleEditorDidMount}
        theme="vs-dark"
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          wordWrap: 'on',
          automaticLayout: true
        }}
      />
    </div>
  );
}

export default CollaborativeEditor;