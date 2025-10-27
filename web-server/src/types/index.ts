// can split this file later as it grows
export interface User {
  id: string;
  difficulty: string;
  language: string;
  topics: string[];
}

export interface Question {
  _id: string;
  title: string;
  description: string;
  difficulty: "easy" | "medium" | "hard";
  topics: string[];
}

export interface Match {
  id: string;
  users: string[];
  status: string;
  questionId?: string; // Just the question ID now
  difficulty?: string;
  language?: string;
  matchedTopics?: string[];
  sessionId: string;
}

export interface MatchFoundMessage {
  event: "match_found";
  match: Match;
}

export type WebSocketMessage = MatchFoundMessage; // can add more msg types in future

declare global {
  interface Window {
    matchmakingWS?: WebSocket;
  }
}
