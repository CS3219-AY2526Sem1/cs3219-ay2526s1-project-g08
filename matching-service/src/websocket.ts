import WebSocket from "ws";
import { joinQueue } from "./queue";
import { findMatch } from "./matchmaking";
import { User } from "./types";
import { redis } from "./redis";
import { activeConnections } from "./connections";

export function startWebSocketServer(port: number) {
  const wss = new WebSocket.Server({ port });
  console.log(`WebSocket server running on ws://localhost:${port}`);

  wss.on("connection", (ws) => {
    console.log("Client connected");

    ws.on("message", async (msg) => {
      const data = JSON.parse(msg.toString());
      if (data.action === "join_queue") {
        const user: User = {
          id: data.id,
          difficulty: data.difficulty,
          language: data.language,
          topics: data.topics,
          joinTime: Date.now(),
          ws,
        };

        activeConnections.set(user.id, ws);
        await joinQueue(user);
        console.log(`User ${user.id} joined queue`);

        const match = await findMatch(user);
        if (match) {
          await redis.publish("match_found", JSON.stringify(match));
        }
      }
    });

    ws.on("close", () => {
      console.log("Client disconnected");
      activeConnections.forEach((connection, userId) => {
        if (connection === ws) activeConnections.delete(userId);
      });
    });
  });
}
