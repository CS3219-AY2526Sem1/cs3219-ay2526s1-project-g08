import WebSocket from "ws";
import { Redis } from "ioredis";
import { activeConnections } from "./connections";
import { deleteCollaborationSession } from "./websocket";
import { leaveQueue } from "./queue";

export const redis = new Redis({
  host: "redis",
  port: 6379,
});

redis.on("connect", () => console.log("Connected to Redis"));
redis.on("error", (err) => console.error("Redis error:", err));

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
