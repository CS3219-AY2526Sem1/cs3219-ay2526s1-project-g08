import { useState } from "react";
import { connectWebSocket, joinQueue } from "../services/websocket";
import { Match, WebSocketMessage } from "../types";

export const useMatchmaking = (
  userId: string,
  difficulty: string,
  language: string,
  topics: string[]
) => {
  const [match, setMatch] = useState<Match | null>(null);

  const findMatch = async () => {
    await connectWebSocket((msg: WebSocketMessage) => {
      if (msg.event === "match_found") setMatch(msg.match);
    });
    joinQueue({ id: userId, difficulty, language, topics });
  };

  return { match, findMatch };
};
