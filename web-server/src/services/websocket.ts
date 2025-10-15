import { User, WebSocketMessage } from "../types";

let ws: WebSocket | null = null;

export const connectWebSocket = (
  onMessage: (msg: WebSocketMessage) => void
) => {
  return new Promise<void>((resolve, reject) => {
    ws = new WebSocket("ws://localhost:3001");

    // Store globally for logout cleanup
    window.matchmakingWS = ws;

    ws.onopen = () => resolve();
    ws.onmessage = (event) => {
      try {
        const data: WebSocketMessage = JSON.parse(event.data);
        onMessage(data);
      } catch {
        console.error("Failed to parse WebSocket message");
      }
    };
    ws.onclose = () => {
      console.log("WebSocket disconnected");
      ws = null;
      delete window.matchmakingWS;
    };
    ws.onerror = (err) => {
      console.error("WebSocket error:", err);
      reject(new Error("Failed to connect to WebSocket"));
    };
  });
};

export const joinQueue = (user: User) => {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ action: "join_queue", ...user }));
  } else {
    console.error("WebSocket not open yet");
  }
};

export const leaveQueue = () => {
  closeWebSocket(); // matching service handles queue cleanup on disconnect
};

export const closeWebSocket = () => {
  if (ws) {
    ws.close();
    ws = null;
    delete window.matchmakingWS;
  }
};
