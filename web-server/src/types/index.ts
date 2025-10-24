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
  status: "pending" | "accepted" | "declined";
  topics?: string[];
  //status: string;
  questionId?: string; // Just the question ID now
  difficulty?: string;
  language?: string;
  matchedTopics?: string[];
}

export interface MatchFoundMessage {
  event: "match_found";
  match: Match;
}

export interface MatchAcceptedMessage {
  event: "match_accepted";
  match: Match;
}

export interface MatchDeclinedMessage {
  event: "match_declined";
  match: Match;
}

export type WebSocketMessage =
  | MatchFoundMessage
  | MatchAcceptedMessage
  | MatchDeclinedMessage;

declare global {
  interface Window {
    matchmakingWS?: WebSocket;
  }
}
