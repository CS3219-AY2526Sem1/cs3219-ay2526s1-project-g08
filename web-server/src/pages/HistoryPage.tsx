import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import styled from 'styled-components';
import { FiClock, FiMessageSquare, FiFileText } from 'react-icons/fi'; // Using react-icons
import { useAuth } from '../hooks/useAuth';
import * as HistoryPageStyle from '../components/HistoryPageStyle';

interface HistoryItem {
  sessionId: string;
  questionId: string;
  questionTitle: string;
  difficulty: 'easy' | 'medium' | 'hard';
  topics: string[];
  language: string;
  completedAt: string;
  terminationReason?: string;
}

interface QuestionDetails { 
    _id: string; 
    title: string; 
    description: string; 
    difficulty: 'easy' | 'medium' | 'hard'; 
    topics: string[]; 
}

interface SessionHistoryResponse {
  sessionId: string;
  questionId: string;
  difficulty: 'easy' | 'medium' | 'hard';
  topics: string[];
  language: string;
  participants: string[];
  terminationReason?: string;
  updatedAt: string;
}

interface SessionDetail {
  sessionId: string;
  questionId: string;
  difficulty: 'easy' | 'medium' | 'hard';
  language: string;
  completedAt: string;
  terminationReason?: string;
  participants: string[];
  topics: string[];
}

const COLLAB_SERVICE_URL = "http://localhost:3004/api/collaboration";
const QUESTION_SERVICE_URL = "http://localhost:3003/api/questions";

// Helper function to format date
const formatDate = (timestamp: string) => 
    new Date(timestamp).toLocaleDateString() + ' ' + new Date(timestamp).toLocaleTimeString();



export default function HistoryPage() {
    const [historyList, setHistoryList] = useState<HistoryItem[]>([]);
    const [selectedQuestion, setSelectedQuestion] = useState<QuestionDetails | null>(null);
    const [selectedSession, setSelectedSession] = useState<SessionDetail | null>(null);
    const [loadingList, setLoadingList] = useState(true);
    const [loadingDetails, setLoadingDetails] = useState(false);
    const [historyError, setHistoryError] = useState<string | null>(null);
    const [detailError, setDetailError] = useState<string | null>(null);
    const { token, getToken } = useAuth();
    const resolveAuthToken = useCallback(async () => {
        const authToken = token ?? await getToken();
        return authToken;
    }, [token, getToken]);



    useEffect(() => {
        let isMounted = true;

        const fetchHistory = async () => {
            setLoadingList(true);
            setHistoryError(null);

            try {
                const authToken = await resolveAuthToken();
                if (!authToken) {
                    throw new Error("Missing authentication token");
                }

                const res = await axios.get<{ success: boolean; data: any[] }>(
                    `${COLLAB_SERVICE_URL}/user/sessions/history`,
                    {
                        withCredentials: true,
                        headers: {
                            Authorization: `Bearer ${authToken}`
                        }
                    }
                );

                const sortedList = res.data.data.sort(
                    (a, b) =>
                        new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
                );

                // Fetch question titles
                const formattedListPromises = sortedList.map(async (item) => {
                    let questionTitle = `Question ${item.questionId}`;
                    
                    try {
                        const questionRes = await axios.get<QuestionDetails>(
                            `${QUESTION_SERVICE_URL}/${item.questionId}`
                        );
                        questionTitle = questionRes.data.title;
                    } catch (err) {
                        console.error(`Failed to fetch question ${item.questionId}:`, err);
                    }

                    return {
                        sessionId: item.sessionId,
                        questionId: item.questionId,
                        questionTitle,
                        difficulty: (item.difficulty ?? 'easy') as HistoryItem['difficulty'],
                        topics: Array.isArray(item.topics) ? item.topics : [],
                        language: item.language ?? 'plaintext',
                        completedAt: item.endedAt ?? item.createdAt ?? new Date().toISOString(),
                        terminationReason: item.endReason
                    };
                });

            const formattedList = await Promise.all(formattedListPromises);

                if (isMounted) {
                    setHistoryList(formattedList);
                }
            } catch (err) {
                console.error("Failed to fetch collaboration history:", err);
                if (isMounted) {
                    setHistoryList([]);
                    setHistoryError("Unable to load your session history. Please make sure you are signed in and try again.");
                }
            } finally {
                if (isMounted) {
                    setLoadingList(false);
                }
            }
        };

        fetchHistory();

        return () => {
            isMounted = false;
        };
    }, [resolveAuthToken]);



    const handleQuestionClick = async (item: HistoryItem) => {
        if (selectedSession?.sessionId === item.sessionId) return;

        setSelectedQuestion(null);
        setSelectedSession(null);
        setDetailError(null);
        setLoadingDetails(true);

        try {
            const authToken = await resolveAuthToken();
            if (!authToken) {
                throw new Error("Missing authentication token");
            }

            const sessionRes = await axios.get<{ success: boolean; data: SessionHistoryResponse }>(
                `${COLLAB_SERVICE_URL}/user/sessions/history/${item.sessionId}`, // Updated endpoint
                {
                    withCredentials: true,
                    headers: {
                        Authorization: `Bearer ${authToken}`
                    }
                }
            );

            if (!sessionRes.data.success || !sessionRes.data.data) {
                throw new Error("Session detail missing");
            }

            const sessionData = sessionRes.data.data;

            setSelectedSession({
                sessionId: sessionData.sessionId,
                questionId: sessionData.questionId,
                difficulty: sessionData.difficulty ?? item.difficulty,
                language: sessionData.language ?? item.language,
                completedAt: sessionData.updatedAt ?? item.completedAt,
                terminationReason: sessionData.terminationReason,
                participants: sessionData.participants ?? [],
                topics: sessionData.topics ?? item.topics
            });

            try {
                const questionRes = await axios.get<QuestionDetails>(
                    `${QUESTION_SERVICE_URL}/${item.questionId}`
                );
                setSelectedQuestion(questionRes.data);
            } catch (questionErr) {
                console.error("Failed to fetch question details:", questionErr);
                setSelectedQuestion({
                    _id: item.questionId,
                    title: "Question unavailable",
                    description: "Unable to load the original question prompt.",
                    difficulty: item.difficulty,
                    topics: item.topics
                });
            }
        } catch (err) {
            console.error("Failed to fetch session details:", err);
            setDetailError("Failed to fetch session details. Please ensure you are signed in and try again.");
        } finally {
            setLoadingDetails(false);
        }
    };



    return (
        <HistoryPageStyle.Container>
            {/* 1. History List Column */}
            <HistoryPageStyle.ListPanel>
                <HistoryPageStyle.Title>
                    <FiFileText size={20} />
                    Question History
                </HistoryPageStyle.Title>
                <HistoryPageStyle.Divider />
                
                {loadingList ? (
                    <HistoryPageStyle.LoadingContainer>
                        <HistoryPageStyle.SmallSpinner />
                    </HistoryPageStyle.LoadingContainer>
                ) : historyError ? (
                    <HistoryPageStyle.ErrorText>{historyError}</HistoryPageStyle.ErrorText>
                ) : historyList.length === 0 ? (
                    <HistoryPageStyle.EmptyMessage>No questions completed yet.</HistoryPageStyle.EmptyMessage>
                ) : (
                    <div>
                        {historyList.map(item => (
                            <HistoryPageStyle.ListItem
                                key={item.sessionId}
                                $selected={selectedSession?.sessionId === item.sessionId}
                                onClick={() => handleQuestionClick(item)}
                                >
                                <HistoryPageStyle.ListItemTitle style={{ fontSize: "1.1rem", fontWeight: 600 }}>
                                    <FiMessageSquare size={16} />
                                    {item.questionTitle}
                                </HistoryPageStyle.ListItemTitle>
                                <HistoryPageStyle.ListItemTime style={{ fontSize: "0.95rem", fontWeight: 500 }}>
                                    <FiClock size={14} />
                                    {formatDate(item.completedAt)}
                                </HistoryPageStyle.ListItemTime>
                                <HistoryPageStyle.MetaRow>
                                    <HistoryPageStyle.MetaBadge $variant="difficulty">
                                        Difficulty: {item.difficulty}
                                    </HistoryPageStyle.MetaBadge>
                                    <HistoryPageStyle.MetaBadge $variant="language">
                                        Language: {item.language}
                                    </HistoryPageStyle.MetaBadge>
                                </HistoryPageStyle.MetaRow>
                                {item.topics.length > 0 && (
                                    <HistoryPageStyle.TopicList>
                                        {item.topics.slice(0, 3).map((topic) => (
                                            <HistoryPageStyle.TopicTag key={`${item.sessionId}-${topic}`}>
                                                {topic}
                                            </HistoryPageStyle.TopicTag>
                                        ))}
                                        {item.topics.length > 3 && (
                                            <HistoryPageStyle.TopicTag key={`${item.sessionId}-more`}>
                                                +{item.topics.length - 3} more
                                            </HistoryPageStyle.TopicTag>
                                        )}
                                    </HistoryPageStyle.TopicList>
                                )}
                            </HistoryPageStyle.ListItem>

                        ))}
                    </div>
                )}
            </HistoryPageStyle.ListPanel>

            {/* 2. Details Display Column */}
            <HistoryPageStyle.DetailsPanel>
                <HistoryPageStyle.Subtitle>Session Details</HistoryPageStyle.Subtitle>
                <HistoryPageStyle.Divider />

                {loadingDetails ? (
                    <HistoryPageStyle.LoadingContainer>
                        <HistoryPageStyle.Spinner />
                    </HistoryPageStyle.LoadingContainer>
                ) : detailError ? (
                    <HistoryPageStyle.ErrorText>{detailError}</HistoryPageStyle.ErrorText>
                ) : selectedSession ? (
                    <>
                        <HistoryPageStyle.SectionTitle>Session Metadata</HistoryPageStyle.SectionTitle>
                        <HistoryPageStyle.MetadataGrid>
                            <HistoryPageStyle.MetadataCard>
                                <small>Completed</small>
                                <strong>{formatDate(selectedSession.completedAt)}</strong>
                            </HistoryPageStyle.MetadataCard>
                            <HistoryPageStyle.MetadataCard>
                                <small>Language</small>
                                <strong>{selectedSession.language}</strong>
                            </HistoryPageStyle.MetadataCard>
                            <HistoryPageStyle.MetadataCard>
                                <small>Difficulty</small>
                                <strong>{selectedSession.difficulty}</strong>
                            </HistoryPageStyle.MetadataCard>
                            <HistoryPageStyle.MetadataCard>
                                <small>Participants</small>
                                <strong>{selectedSession.participants.length}</strong>
                            </HistoryPageStyle.MetadataCard>
                            <HistoryPageStyle.MetadataCard>
                                <small>Status</small>
                                <strong>{selectedSession.terminationReason ?? 'completed'}</strong>
                            </HistoryPageStyle.MetadataCard>
                        </HistoryPageStyle.MetadataGrid>

                        {selectedSession.topics.length > 0 && (
                            <>
                                <HistoryPageStyle.SectionTitle>Topics</HistoryPageStyle.SectionTitle>
                                <HistoryPageStyle.TopicList>
                                    {selectedSession.topics.map((topic) => (
                                        <HistoryPageStyle.TopicTag key={`${selectedSession.sessionId}-${topic}`}>
                                            {topic}
                                        </HistoryPageStyle.TopicTag>
                                    ))}
                                </HistoryPageStyle.TopicList>
                            </>
                        )}

                        <HistoryPageStyle.Divider />

                        <HistoryPageStyle.SectionTitle>Question Details</HistoryPageStyle.SectionTitle>
                        {selectedQuestion ? (
                            <>
                                <HistoryPageStyle.QuestionTitle>{selectedQuestion.title}</HistoryPageStyle.QuestionTitle>
                                <HistoryPageStyle.DifficultyBadge>
                                    Difficulty: {selectedQuestion.difficulty}
                                </HistoryPageStyle.DifficultyBadge>
                                <HistoryPageStyle.Divider />
                                <HistoryPageStyle.Content>{selectedQuestion.description}</HistoryPageStyle.Content>
                            </>
                        ) : (
                            <HistoryPageStyle.PlaceholderText>Unable to load question prompt.</HistoryPageStyle.PlaceholderText>
                        )}

                    </>
                ) : (
                    <HistoryPageStyle.PlaceholderText>
                        Select a question from the history list to view its full details.
                    </HistoryPageStyle.PlaceholderText>
                )}
            </HistoryPageStyle.DetailsPanel>
        </HistoryPageStyle.Container>
    );
}
