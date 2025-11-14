import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import CollaborativeEditor from '../components/CollaborativeEditor';
import CollaborativeViewer from '../components/CollaborativeViewer';

function CollaborativeSession({ viewMode = 'editor' }) {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { getToken, isLoggedIn, isLoading } = useAuth();
  const [questionId, setQuestionId] = useState('');
  const [language, setLanguage] = useState('python');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [authToken, setAuthToken] = useState(null);

  useEffect(() => {
    // Wait for auth to finish loading
    if (isLoading) {
      return;
    }

    // Redirect to login if not authenticated
    if (!isLoggedIn) {
      console.log('Redirecting to login - not authenticated');
      navigate('/');
      return;
    }

    const fetchSessionData = async () => {
      try {
        const token = await getToken();
        if (!token) {
          setError('Authentication required');
          setLoading(false);
          return;
        }

        // Store the token in state for use with CollaborativeEditor
        setAuthToken(token);

        const response = await fetch(`http://localhost:3004/api/collaboration/sessions/${sessionId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          setQuestionId(data.data.questionId);
          setLanguage(data.data.language);
        } else if (response.status === 404) {
          setError('Session not found');
        } else {
          setError('Failed to load session');
        }
      } catch (err) {
        setError('Connection error');
      } finally {
        setLoading(false);
      }
    };

    if (sessionId) {
      fetchSessionData();
    } else {
      setError('Invalid session ID');
      setLoading(false);
    }
  }, [sessionId, isLoggedIn, isLoading, navigate]);

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h2>Loading session...</h2>
        <p>Session ID: {sessionId}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h2>Error</h2>
        <p>{error}</p>
        <button 
          onClick={() => navigate('/home')}
          style={{
            padding: '10px 20px',
            backgroundColor: '#007acc',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Back to Home
        </button>
      </div>
    );
  }

  return viewMode === 'viewer' ? (
    <CollaborativeViewer 
      sessionId={sessionId}
      authToken={authToken}
      questionId={questionId}
      language={language}
    />
  ) : (
    <CollaborativeEditor 
      sessionId={sessionId}
      authToken={authToken}
      questionId={questionId}
      language={language}
    />
  );
}

export default CollaborativeSession;