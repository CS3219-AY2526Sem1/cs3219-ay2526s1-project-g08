import { useEffect, useState, useRef } from "react";
import Editor from "@monaco-editor/react";
import * as Y from "yjs";
import "./CollaborativeEditor.css";
import config from "../config/environment";

function CollaborativeViewer({ sessionId, authToken, language, questionId }) {
  const [questionData, setQuestionData] = useState(null);
  const [editorContent, setEditorContent] = useState("");
  const [loading, setLoading] = useState(true);
  const editorRef = useRef(null);

  useEffect(() => {
    // Fetch question data when component mounts
    const fetchQuestionData = async () => {
      try {
        // Get a random question from the question service
        const response = await fetch(`${config.api.questionService}/${questionId}`);
        if (response.ok) {
          const questionData = await response.json();
          setQuestionData({
            title: questionData.title,
            description: questionData.description,
            difficulty: questionData.difficulty,
            topics: questionData.topics // Keep as array for rendering chips
          });
        } else {
          console.error('Failed to fetch question:', response.status);
          // Set fallback question data
          setQuestionData({
            title: "Collaborative Coding Session",
            description: "Welcome to your collaborative coding session! Unable to load question.",
            difficulty: "Null",
            topics: []
          });
        }
      } catch (error) {
        console.error("Error fetching question:", error);
        // Set fallback question data
        setQuestionData({
          title: "Collaborative Coding Session",
          description:
            "Welcome to your collaborative coding session! Unable to load question.",
          difficulty: "Null",
          topics: []
        });
      }
    };

    fetchQuestionData();
  }, [questionId]);

  useEffect(() => {
    // Fetch session data including YJS state
    const fetchSessionData = async () => {
      if (!sessionId || !authToken) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(
          `${config.api.collaborationService}/sessions/${sessionId}`,
          {
            headers: {
              Authorization: `Bearer ${authToken}`,
            },
          }
        );

        if (response.ok) {
          const data = await response.json();

          // Decode YJS state if available
          if (data.data.yjsState) {
            try {
              // Create a new Y.Doc to decode the state
              const ydoc = new Y.Doc();

              // Convert base64 string to Uint8Array
              const stateVector = Uint8Array.from(
                atob(data.data.yjsState),
                (c) => c.charCodeAt(0)
              );

              if (stateVector.length === 0) {
                console.log("YJS state is empty");
                setEditorContent("// No code saved in this session");
                return;
              }

              // Apply the state to the document
              Y.applyUpdate(ydoc, stateVector);

              // Get the text content from the YJS document
              const ytext = ydoc.getText("code");
              const content = ytext.toString();

              setEditorContent(content);
            } catch (err) {
              console.error("Failed to decode YJS state:", err);
              setEditorContent(
                "// Unable to load saved code\n// Error: " + err.message
              );
            }
          } else {
            setEditorContent("// No saved code available");
          }
        } else {
          console.error("Failed to fetch session data:", response.status);
          setEditorContent("// Unable to load session data");
        }
      } catch (error) {
        console.error("Error fetching session data:", error);
        setEditorContent("// Error loading session data");
      } finally {
        setLoading(false);
      }
    };

    fetchSessionData();
  }, [sessionId, authToken]);

  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;
  };

  return (
    <div className="collaborative-editor">
      <div className="editor-content">
        <div className="question-panel">
          <div className="question-header">
            <div className="header-row">
              <h2>{questionData?.title || 'Loading...'}</h2>
              <span
                className={`difficulty ${questionData?.difficulty?.toLowerCase() || ''}`}
              >
                {questionData?.difficulty}
              </span>
            </div>
          </div>

          <div className="question-description">
            <p>{questionData?.description || "Loading question details..."}</p>
          </div>
          
          <div className="question-meta">
            {questionData?.topics?.map((topic, index) => (
              <span key={index} className="topic-chip">
                {topic}
              </span>
            ))}
          </div>
        </div>

        <div className="code-panel">
          {loading ? (
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                height: "100%",
                color: "white",
              }}
            >
              Loading session data...
            </div>
          ) : (
            <Editor
              height="100%"
              language={language}
              value={editorContent}
              onMount={handleEditorDidMount}
              theme="vs-dark"
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                wordWrap: "on",
                automaticLayout: true,
                readOnly: true,
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default CollaborativeViewer;
