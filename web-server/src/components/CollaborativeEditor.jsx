import { useEffect, useState, useRef } from 'react';
import Editor from '@monaco-editor/react';
import YjsCollaboration from '../services/yjsCollaboration';
import './CollaborativeEditor.css';
import { useNavigate } from 'react-router-dom';

function CollaborativeEditor({ sessionId, authToken, language, questionId }) {
  const [connectedUsers, setConnectedUsers] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [questionData, setQuestionData] = useState(null);
  const editorRef = useRef(null);
  const yjsCollab = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Fetch question data when component mounts
    const fetchQuestionData = async () => {
      try {
        // Get a random question from the question service
        const response = await fetch(`http://localhost:3003/api/questions/${questionId}`);
        if (response.ok) {
          const questionData = await response.json();
          setQuestionData({
            title: questionData.title,
            description: questionData.description,
            difficulty: questionData.difficulty,
            topics: questionData.topics.join(', ')
          });
        } else {
          console.error('Failed to fetch question:', response.status);
          // Set fallback question data
          setQuestionData({
            title: "Collaborative Coding Session",
            description: "Welcome to your collaborative coding session! Unable to load question.",
            difficulty: "Null",
            topics: "Null"
          });
        }
      } catch (error) {
        console.error('Error fetching question:', error);
        // Set fallback question data
        setQuestionData({
          title: "Collaborative Coding Session",
          description: "Welcome to your collaborative coding session! Unable to load question.",
          difficulty: "Null",
          topics: "Null"
        });
      }
    };

    fetchQuestionData();

    return () => {
      // Cleanup on unmount
      if (yjsCollab.current) {
        yjsCollab.current.destroy();
      }
    };
  }, [authToken]);
  
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
      navigate('/home');
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
      
      <div className="editor-content">
        <div className="question-panel">
          <div className="question-header">
            <h2>{questionData?.title || 'Loading...'}</h2>
            <div className="question-meta">
              <span className={`difficulty ${questionData?.difficulty?.toLowerCase() || ''}`}>
                {questionData?.difficulty}
              </span>
              <span className="topics">{questionData?.topics}</span>
            </div>
          </div>
          <div className="question-description">
            <p>{questionData?.description || 'Loading question details...'}</p>
          </div>
        </div>
        
        <div className="code-panel">
          <Editor
            height="100%"
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
      </div>
    </div>
  );
}

export default CollaborativeEditor;