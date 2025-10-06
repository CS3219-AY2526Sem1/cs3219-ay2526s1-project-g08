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

export interface Match {
  id: string;
  users: string[];
  status: "pending" | "accepted" | "declined";
}
