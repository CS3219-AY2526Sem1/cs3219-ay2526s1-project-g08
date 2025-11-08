import { useState, useEffect } from 'react';
import axios from 'axios';
import styled from 'styled-components';
import { FiClock, FiMessageSquare, FiFileText } from 'react-icons/fi'; // Using react-icons

// Interfaces based on your service responses
interface HistoryItem {
    questionId: string;
    completedAt: string; 
    title?: string;
}

interface QuestionDetails { 
    _id: string; 
    title: string; 
    description: string; 
    difficulty: 'easy' | 'medium' | 'hard'; 
    topics: string[]; 
}

const USER_SERVICE_URL = 'http://localhost:3002/user'; 
const QUESTION_SERVICE_URL = 'http://localhost:3003/api/questions'; 

// Helper function to format date
const formatDate = (timestamp: string) => 
    new Date(timestamp).toLocaleDateString() + ' ' + new Date(timestamp).toLocaleTimeString();

// Styled Components
const Container = styled.div`
    padding: 24px;
    display: flex;
    height: 100%;
    gap: 24px;
`;

const Panel = styled.div`
    background: white;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    padding: 16px;
    overflow-y: auto;
`;

const ListPanel = styled(Panel)`
    width: 350px;
    max-height: 100%;
`;

const DetailsPanel = styled(Panel)`
    flex-grow: 1;
    max-height: 100%;
`;

const Title = styled.h2`
    margin: 0 0 16px 0;
    font-size: 1.25rem;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 8px;
`;

const Subtitle = styled.h3`
    margin: 0 0 16px 0;
    font-size: 1.5rem;
    font-weight: 600;
`;

const Divider = styled.hr`
    border: none;
    border-top: 1px solid #e0e0e0;
    margin: 16px 0;
`;

const LoadingContainer = styled.div`
    display: flex;
    justify-content: center;
    padding: 32px;
`;

const Spinner = styled.div`
    border: 3px solid #f3f3f3;
    border-top: 3px solid #3498db;
    border-radius: 50%;
    width: 40px;
    height: 40px;
    animation: spin 1s linear infinite;

    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
`;

const SmallSpinner = styled(Spinner)`
    width: 24px;
    height: 24px;
    border-width: 2px;
`;

const EmptyMessage = styled.p`
    color: #666;
    text-align: center;
    padding: 16px;
`;

const ListItem = styled.button<{ $selected?: boolean }>`
    width: 100%;
    padding: 12px;
    margin-bottom: 8px;
    border: 1px solid ${props => props.$selected ? '#3498db' : '#e0e0e0'};
    border-radius: 4px;
    background: ${props => props.$selected ? '#e3f2fd' : 'white'};
    cursor: pointer;
    text-align: left;
    transition: all 0.2s;

    &:hover {
        background: ${props => props.$selected ? '#e3f2fd' : '#f5f5f5'};
        border-color: #3498db;
    }
`;

const ListItemTitle = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 500;
    margin-bottom: 4px;
    color: #333;
`;

const ListItemTime = styled.div`
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 0.85rem;
    color: #666;
`;

const QuestionTitle = styled.h4`
    color: #3498db;
    font-size: 1.25rem;
    margin: 0 0 8px 0;
`;

const DifficultyBadge = styled.span`
    display: inline-block;
    padding: 4px 12px;
    border-radius: 12px;
    font-size: 0.875rem;
    font-weight: 500;
    background: #f0f0f0;
    color: #666;
    margin-bottom: 16px;
`;

const Content = styled.div`
    white-space: pre-wrap;
    line-height: 1.6;
    color: #333;
`;

const PlaceholderText = styled.p`
    color: #999;
    text-align: center;
    padding: 64px 32px;
`;

export default function HistoryPage() {
    const [historyList, setHistoryList] = useState<HistoryItem[]>([]);
    const [selectedQuestion, setSelectedQuestion] = useState<QuestionDetails | null>(null);
    const [loadingList, setLoadingList] = useState(true);
    const [loadingDetails, setLoadingDetails] = useState(false);


    useEffect(() => {
        const fetchHistory = async () => {
            setLoadingList(true);
            try {
            const response = await axios.get<{ history: HistoryItem[] }>(
                `${USER_SERVICE_URL}/profile/history`,
                { withCredentials: true }
            );

            const sortedList = response.data.history.sort(
                (a, b) =>
                new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
            );

            // Fetch question details (titles) in parallel
            const detailedHistory = await Promise.all(
                sortedList.map(async (item) => {
                try {
                    const questionRes = await axios.get<QuestionDetails>(
                    `${QUESTION_SERVICE_URL}/${item.questionId}`
                    );
                    return { ...item, title: questionRes.data.title };
                } catch {
                    return { ...item, title: "Unknown Question" };
                }
                })
            );

            setHistoryList(detailedHistory);
            } catch (error) {
            console.error("Failed to fetch history:", error);
            } finally {
            setLoadingList(false);
            }
        };

        fetchHistory();
    }, []);


    // Fetch Full Question Details on Click
    const handleQuestionClick = async (questionId: string) => {
        if (selectedQuestion?._id === questionId) return;
        
        setSelectedQuestion(null); 
        setLoadingDetails(true);

        try {
            const response = await axios.get<QuestionDetails>(`${QUESTION_SERVICE_URL}/${questionId}`);
            setSelectedQuestion(response.data);
        } catch (error) {
            console.error(`Failed to fetch details for question ${questionId}:`, error);
            setSelectedQuestion({ 
                title: 'Error loading question details.', 
                description: 'The question service may be unavailable or the ID is invalid.', 
                difficulty: 'easy',
                _id: questionId,
                topics: []
            });
        } finally {
            setLoadingDetails(false);
        }
    };

    return (
        <Container>
            {/* 1. History List Column */}
            <ListPanel>
                <Title>
                    <FiFileText size={20} />
                    Question History
                </Title>
                <Divider />
                
                {loadingList ? (
                    <LoadingContainer>
                        <SmallSpinner />
                    </LoadingContainer>
                ) : historyList.length === 0 ? (
                    <EmptyMessage>No questions completed yet.</EmptyMessage>
                ) : (
                    <div>
                        {historyList.map(item => (
                            <ListItem
                                key={item.questionId}
                                $selected={selectedQuestion?._id === item.questionId}
                                onClick={() => handleQuestionClick(item.questionId)}
                                >
                                <ListItemTitle style={{ fontSize: "1.1rem", fontWeight: 600 }}>
                                    <FiMessageSquare size={16} />
                                    {item.title || "Untitled Question"}
                                </ListItemTitle>
                                <ListItemTime style={{ fontSize: "0.95rem", fontWeight: 500 }}>
                                    <FiClock size={14} />
                                    {formatDate(item.completedAt)}
                                </ListItemTime>
                            </ListItem>

                        ))}
                    </div>
                )}
            </ListPanel>

            {/* 2. Details Display Column */}
            <DetailsPanel>
                <Subtitle>Question Details</Subtitle>
                <Divider />

                {loadingDetails ? (
                    <LoadingContainer>
                        <Spinner />
                    </LoadingContainer>
                ) : selectedQuestion ? (
                    <>
                        <QuestionTitle>{selectedQuestion.title || 'Question Details'}</QuestionTitle>
                        <DifficultyBadge>
                            Difficulty: {selectedQuestion.difficulty}
                        </DifficultyBadge>
                        <Divider />
                        <Content>{selectedQuestion.description}</Content>
                    </>
                ) : (
                    <PlaceholderText>
                        Select a question from the history list to view its full details.
                    </PlaceholderText>
                )}
            </DetailsPanel>
        </Container>
    );
}