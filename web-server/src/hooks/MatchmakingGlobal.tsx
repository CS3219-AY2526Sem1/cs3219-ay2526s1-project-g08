// MatchmakingGlobal, logic used to share across all the components in web-server
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { useMatchmaking } from "../hooks/useMatchmaking";
import { Match, Question } from "../types";

// Define the shape of the context state
interface MatchmakingContextType {
  setMatchParams: (params: {
    userId?: string;
    difficulty: string;
    language: string;
    topics: string[];
  }) => void;
  findMatch: () => Promise<void>;
  cancelSearch: () => void;
  acceptMatch: () => Promise<void>;
  declineMatch: () => Promise<void>;
  resetMatch: () => void;

  // Persistent state
  match: Match | null;
  question: Question | null;
  isFinding: boolean;
  isAccepting: boolean;
  timeProgress: number;
  error: string | null;
  currentUserId: string;
  hasAccepted: boolean; // Expose acceptance state
}

const defaultContextValue: MatchmakingContextType = {
  setMatchParams: () => {},
  findMatch: async () => {},
  cancelSearch: () => {},
  acceptMatch: async () => {},
  declineMatch: async () => {},
  resetMatch: () => {},
  match: null,
  question: null,
  isFinding: false,
  isAccepting: false,
  timeProgress: 0,
  error: null,
  currentUserId: "",
  hasAccepted: false,
};

const MatchmakingContext =
  createContext<MatchmakingContextType>(defaultContextValue);

export const useMatchmakingContext = () => useContext(MatchmakingContext);

interface MatchmakingProviderProps {
  children: ReactNode;
  userId: string; //user ID must come from auth
}

export const MatchmakingProvider: React.FC<MatchmakingProviderProps> = ({
  children,
  userId,
}) => {
  // Local state to store parameters set by the Home component
  const [queueUserId, setQueueUserId] = useState(userId);
  const [difficulty, setDifficulty] = useState("easy");
  const [language, setLanguage] = useState("python");
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);

  useEffect(() => {
    setQueueUserId(userId);
  }, [userId]);

  // The actual hook instantiation
  const matchmakingState = useMatchmaking(
    queueUserId,
    difficulty,
    language,
    selectedTopics,
    60
  );

  const setMatchParams = (params: {
    userId?: string;
    difficulty: string;
    language: string;
    topics: string[];
  }) => {
    if (params.userId !== undefined) {
      setQueueUserId(params.userId);
    }
    setDifficulty(params.difficulty);
    setLanguage(params.language);
    setSelectedTopics(params.topics);
  };

  // Expose the hook state and actions, plus the param setter
  const contextValue = {
    ...matchmakingState,
    setMatchParams,
    currentUserId: queueUserId,
  };

  return (
    <MatchmakingContext.Provider value={contextValue}>
      {children}
    </MatchmakingContext.Provider>
  );
};
