import WebSocket from "ws";
import { Redis } from "ioredis";
import { activeConnections } from "./connections";

export const redis = new Redis({
  host: "redis",
  port: 6379,
});

redis.on("connect", () => console.log("Connected to Redis"));
redis.on("error", (err) => console.error("Redis error:", err));

export function setupRedisSubscriber() {
  const subscriber = redis.duplicate();

  subscriber.subscribe("match_found", (err) => {
    if (err) console.error("Subscribe error:", err);
  });

  subscriber.on("message", (channel, message) => {
    if (channel === "match_found") {
      const match = JSON.parse(message);
      match.users.forEach((userId: string) => {
        const ws = activeConnections.get(userId);
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ event: "match_found", match }));
        }
      });
    }
  });
}
