import { WebSocket } from "ws";

export interface User {
  id: string;
  difficulty: string;
  language: string;
  topics: string[];
  joinTime: number;
  ws?: WebSocket;
}

export interface Match {
  id: string;
  users: string[];
  status: "pending" | "accepted" | "declined";
}
