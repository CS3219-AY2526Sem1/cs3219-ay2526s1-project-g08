import { WebSocket } from "ws";

export interface ExtendedWebSocket extends WebSocket {
  userId?: string;
}

export interface User {
  id: string;
  difficulty: string;
  language: string;
  topics: string[];
  joinTime: number;
  ws?: ExtendedWebSocket;
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
  question?: Question; // The selected question for this match
  difficulty: string;
  language: string;
  matchedTopics: string[]; // The intersection of topics that matched
}
