import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

function CollaborationDemo() {
  const navigate = useNavigate();
  const { getToken, isLoggedIn, user, isLoading } = useAuth();
  const [language, setLanguage] = useState('python');
  const [questionId, setQuestionId] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isLoggedIn) {
      console.log('Redirecting to login - not authenticated');
      navigate('/');
    }
  }, [isLoggedIn, isLoading, navigate]);

  const handleCreateSession = async () => {
    setIsCreating(true);
    try {
      // Get token from cookie-based auth
      const authToken = await getToken();
      
      if (!authToken) {
        console.error('No auth token received');
        alert('Authentication required - please try logging in again');
        navigate('/');
        return;
      }

      // Create a new session through your API
      const response = await fetch('http://localhost:3004/api/collaboration/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          participants: [user?.userId, 'demo-user-2'],
          questionId: questionId,
          difficulty: 'easy',
          topic: 'algorithms',
          language: language
        })
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Session created successfully:', data);
        // Redirect to the collaborative session page
        navigate(`/collaboration/${data.data.sessionId}`);
      } else {
        const error = await response.json();
        console.error('Session creation failed:', error);
        alert(`Failed to create session: ${error.message}`);
      }
    } catch (error) {
      console.error('Error in handleCreateSession:', error);
      alert(`Error creating session: ${error.message}`);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
      <h1>Collaboration Demo</h1>

      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '5px' }}>
          Programming Language:
        </label>
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          style={{
            padding: '10px',
            width: '100%',
            border: '1px solid #ccc',
            borderRadius: '4px'
          }}
        >
          <option value="python">Python</option>
          <option value="java">Java</option>
          <option value="cpp">C++</option>
        </select>
      </div>


      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '5px' }}>
          Question Id:
        </label>
        <input
          type="text"
          value={questionId}
          onChange={(e) => setQuestionId(e.target.value)}
          style={{
            padding: '10px',
            width: '100%',
            border: '1px solid #ccc',
            borderRadius: '4px'
          }}
        />
      </div>

      <div style={{ display: 'flex', gap: '10px' }}>
        <button
          onClick={handleCreateSession}
          disabled={isCreating || isLoading}
          style={{
            padding: '12px 24px',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: (isCreating || isLoading) ? 'not-allowed' : 'pointer',
            fontSize: '16px',
            flex: 1,
            opacity: (isCreating || isLoading) ? 0.7 : 1
          }}
        >
          {isCreating ? 'Creating...' : 'Create New Session'}
        </button>
      </div>
    </div>
  );
}

export default CollaborationDemo;
