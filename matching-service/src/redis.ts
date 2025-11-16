import WebSocket from "ws";

import { Redis } from "ioredis";
import { activeConnections } from "./connections";
import { deleteCollaborationSession } from "./websocket";
import { leaveQueue } from "./queue";

// Configure Redis connection with TLS support for AWS ElastiCache
const redisUri = process.env.REDIS_URI || "redis://redis:6379";

// Parse the Redis URI to ensure correct format
let redisConfig: any;
try {
  const url = new URL(redisUri);

  redisConfig = {
    host: url.hostname,
    port: parseInt(url.port) || 6379,
    // Enable TLS for AWS ElastiCache (rediss:// protocol or .amazonaws.com hostname)
    ...(url.protocol === "rediss:" ||
    url.hostname.includes("cache.amazonaws.com")
      ? { tls: { rejectUnauthorized: false } }
      : {}),
    // Add username/password if present in URI
    ...(url.username ? { username: url.username } : {}),
    ...(url.password ? { password: url.password } : {}),
    // Connection retry strategy
    retryStrategy: (times: number) => {
      const delay = Math.min(times * 50, 2000);
      console.log(`Redis connection attempt ${times}, retrying in ${delay}ms`);
      return delay;
    },
    maxRetriesPerRequest: 3,
  };

  console.log(
    `Redis configuration: ${url.protocol}//${url.hostname}:${
      redisConfig.port
    } (TLS: ${!!redisConfig.tls})`
  );
} catch (error) {
  console.error("Error parsing REDIS_URI:", error);
  console.error("REDIS_URI value:", redisUri);
  throw new Error(
    "Invalid REDIS_URI format. Expected format: redis://host:port or rediss://host:port"
  );
}

export const redis = new Redis(redisConfig);

redis.on("connect", () => {
  console.log(
    `✅ Connected to Redis at ${redisConfig.host}:${
      redisConfig.port
    } (TLS: ${!!redisConfig.tls})`
  );
});

redis.on("error", (err) => {
  console.error("❌ Redis error:", err);
  console.error("Redis config:", {
    host: redisConfig.host,
    port: redisConfig.port,
    tls: !!redisConfig.tls,
  });
});

redis.on("reconnecting", (delay: number) => {
  console.log(`🔄 Reconnecting to Redis in ${delay}ms...`);
});

redis.on("close", () => {
  console.log("📴 Redis connection closed");
});

export function setupRedisSubscriber() {
  const subscriber = redis.duplicate();

  subscriber.subscribe("match_found", "match_timeout", (err) => {
    if (err) console.error("Subscribe error:", err);
  });

  subscriber.on("message", async (channel, message) => {
    try {
      if (channel === "match_found") {
        const match = JSON.parse(message);

        // Set up a 15-second timeout for match acceptance
        setTimeout(async () => {
          try {
            const matchData = await redis.hgetall(match.id);
            if (matchData.status === "pending") {
              // Match timed out, publish timeout event
              await redis.publish(
                "match_timeout",
                JSON.stringify({ matchId: match.id })
              );
            }
          } catch (error) {
            console.error(
              `Error in match timeout handler for ${match.id}:`,
              error
            );
          }
        }, 15000);

        match.users.forEach((userId: string) => {
          const ws = activeConnections.get(userId);
          if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ event: "match_found", match }));
          }
        });
      }

      if (channel === "match_timeout") {
        const { matchId } = JSON.parse(message);
        const matchData = await redis.hgetall(matchId);

        console.log(
          `Processing timeout for match ${matchId}, status: ${
            matchData.status
          }, hasData: ${!!matchData.users}`
        );

        if (matchData.users && matchData.status === "pending") {
          const users: string[] = JSON.parse(matchData.users);
          const sessionId = matchData.sessionId;

          console.log(
            `Match ${matchId} timed out. SessionId: ${
              sessionId || "none"
            }, Users: ${users.join(", ")}`
          );

          // Delete the collaboration session only if it was created (i.e., both had accepted)
          if (sessionId) {
            try {
              await deleteCollaborationSession(sessionId);
              console.log(
                `Deleted collaboration session: ${sessionId} due to timeout`
              );
            } catch (error) {
              console.error(
                `Failed to delete collaboration session ${sessionId}:`,
                error
              );
            }
          } else {
            console.log(
              `No session to delete for match ${matchId} - timed out before both users accepted`
            );
          }

          // Mark match as timed out (not declined)
          await redis.hset(matchId, { status: "timeout" });

          // Remove both users from queue (don't re-queue AFK users)
          for (const uid of users) {
            await leaveQueue(uid);
            console.log(
              `Removed user ${uid} from queue due to match timeout (AFK)`
            );
          }

          // Notify users about timeout
          users.forEach((uid) => {
            const ws = activeConnections.get(uid);
            if (ws && ws.readyState === WebSocket.OPEN) {
              ws.send(
                JSON.stringify({
                  event: "match_declined",
                  match: { id: matchId, users, status: "declined" },
                  reason: "timeout", // Indicate this is a timeout, not a manual decline
                })
              );
            }
          });

          console.log(`Match ${matchId} timed out after 15 seconds`);
        } else {
          console.log(
            `Match ${matchId} already processed or expired from Redis`
          );
        }
      }
    } catch (error) {
      console.error(
        `Error processing Redis message on channel ${channel}:`,
        error
      );
    }
  });
}
