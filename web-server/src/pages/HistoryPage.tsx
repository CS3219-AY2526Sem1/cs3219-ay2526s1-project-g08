import { useState, useEffect, useCallback } from 'react';
import { FiClock, FiMessageSquare, FiUser } from 'react-icons/fi'; // Using react-icons
import { useAuth } from '../hooks/useAuth';
import * as HistoryPageStyle from '../components/HistoryPageStyle';
import config from '../config/environment';

interface HistoryItem {
  sessionId: string;
  questionTitle: string;
  difficulty: 'easy' | 'medium' | 'hard';
  topics: string[];
  completedAt: string;
  participants: string[];
}

interface QuestionDetails { 
    _id: string; 
    title: string; 
    description: string; 
    difficulty: 'easy' | 'medium' | 'hard'; 
    topics: string[]; 
}

// Helper function to format date
const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-GB') + ' ' + date.toLocaleTimeString();
};

export default function HistoryPage() {
    const [historyList, setHistoryList] = useState<HistoryItem[]>([]);
    const [loadingList, setLoadingList] = useState(true);
    const [historyError, setHistoryError] = useState<string | null>(null);
    const { token, getToken, user } = useAuth();
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

                const res = await fetch(
                    `${config.api.collaborationService}/user/history`,
                    {
                        credentials: 'include',
                        headers: {
                            Authorization: `Bearer ${authToken}`
                        }
                    }
                );

                if (!res.ok) {
                    throw new Error(`Failed to fetch history: ${res.status}`);
                }

                const resData = await res.json() as { success: boolean; data: any[] };
                const sortedList = resData.data.sort(
                    (a, b) =>
                        new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
                );

                // Fetch question titles
                const formattedListPromises = sortedList.map(async (item) => {
                    let questionTitle = `Question ${item.questionId}`;
                    
                    try {
                        const questionRes = await fetch(
                            `${config.api.questionService}/${item.questionId}`
                        );
                        if (questionRes.ok) {
                            const questionData = await questionRes.json() as QuestionDetails;
                            questionTitle = questionData.title;
                        }
                    } catch (err) {
                        console.error(`Failed to fetch question ${item.questionId}:`, err);
                    }

                    return {
                        sessionId: item.sessionId,
                        questionTitle,
                        difficulty: (item.difficulty ?? 'easy') as HistoryItem['difficulty'],
                        topics: Array.isArray(item.topics) ? item.topics : [],
                        completedAt: item.updatedAt ?? new Date().toISOString(),
                        participants: Array.isArray(item.participants) ? item.participants : []
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

    const handleQuestionClick = (item: HistoryItem) => {
        window.open(`/history/${item.sessionId}`, '_blank');
    };

    return (
        <HistoryPageStyle.Container>
            {/* 1. History List Column */}
            <HistoryPageStyle.ListPanel>                
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
                                onClick={() => handleQuestionClick(item)}
                                >
                                <HistoryPageStyle.ListItemTitle style={{ fontSize: "1.1rem", fontWeight: 600 }}>
                                    <FiMessageSquare size={16} />
                                    {item.questionTitle}
                                </HistoryPageStyle.ListItemTitle>
                                <HistoryPageStyle.ListItemTime style={{ fontSize: "0.95rem", fontWeight: 500 }}>
                                    <FiClock size={16} />
                                    {formatDate(item.completedAt)}
                                </HistoryPageStyle.ListItemTime>
                                <HistoryPageStyle.ListItemTime style={{ fontSize: "0.95rem", fontWeight: 500 }}>
                                    <FiUser size={16} />
                                    {item.participants.filter(p => p !== user?.userId)[0]}
                                </HistoryPageStyle.ListItemTime>
                                {/* <HistoryPageStyle.MetaRow>
                                    <HistoryPageStyle.MetaBadge $variant="difficulty">
                                        Difficulty: {item.difficulty}
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
                                )} */}
                            </HistoryPageStyle.ListItem>

                        ))}
                    </div>
                )}
            </HistoryPageStyle.ListPanel>
        </HistoryPageStyle.Container>
    );
}
