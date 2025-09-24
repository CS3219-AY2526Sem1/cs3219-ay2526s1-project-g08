export interface User {
  id: string;
  difficulty: string;
  language: string;
  topics: string[];
  joinedAt: number;
  ws?: any; // WebSocket reference
}

export interface Match {
  id: string;
  users: string[];
  status: "pending" | "confirmed" | "declined";
}
