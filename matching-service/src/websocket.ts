import WebSocket from "ws";
import { joinQueue } from "./queue";
import { findMatch } from "./matchmaking";
import { User, ExtendedWebSocket } from "./types";
import { redis } from "./redis";
import { activeConnections } from "./connections";

export function startWebSocketServer(port: number) {
  const wss = new WebSocket.Server({ port });
  console.log(`WebSocket server running on ws://localhost:${port}`);

  wss.on("connection", (ws: ExtendedWebSocket) => {
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
        // Store reverse mapping for cleanup
        ws.userId = user.id;

        await joinQueue(user);
        console.log(`User ${user.id} joined queue`);

        const match = await findMatch(user);
        if (match) {
          console.log(
            `Match found: ${match.id} for users ${match.users.join(", ")}`
          );
          await redis.publish("match_found", JSON.stringify(match));
        } else {
          console.log(`No match found for user ${user.id}`);
        }
      }
    });

    ws.on("close", async () => {
      console.log("Client disconnected");
      // Get user ID from WebSocket connection
      const disconnectedUserId = ws.userId;

      if (disconnectedUserId) {
        // Remove from active connections
        activeConnections.delete(disconnectedUserId);

        // Remove from queue
        const { leaveQueue } = await import("./queue");
        await leaveQueue(disconnectedUserId);
        console.log(
          `User ${disconnectedUserId} removed from queue due to disconnect`
        );
      }
    });
  });
}
