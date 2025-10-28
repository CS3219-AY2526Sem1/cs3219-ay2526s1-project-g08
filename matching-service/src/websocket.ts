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

      if (data.action === "accept_match") {
        if (!ws.userId) return;
        await handleMatchAccept(data.matchId, ws.userId);
      }

      if (data.action === "decline_match") {
        if (!ws.userId) return;
        await handleMatchDecline(data.matchId);
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

async function handleMatchAccept(matchId: string, userId: string) {
  const matchData = await redis.hgetall(matchId);
  if (!matchData.users) return;

  const users: string[] = JSON.parse(matchData.users);
  const acceptedUsers: string[] = JSON.parse(matchData.acceptedUsers || "[]");

  if (!acceptedUsers.includes(userId)) {
    acceptedUsers.push(userId);
    await redis.hset(matchId, { acceptedUsers: JSON.stringify(acceptedUsers) });
  }

  if (acceptedUsers.length === 2) {
    await redis.hset(matchId, { status: "accepted" });

    // Retrieve full match data including sessionId and other fields
    const fullMatchData = await redis.hgetall(matchId);

    users.forEach((uid) => {
      const ws = activeConnections.get(uid);
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(
          JSON.stringify({
            event: "match_accepted",
            match: {
              id: matchId,
              users,
              status: "accepted",
              sessionId: fullMatchData.sessionId,
              questionId: fullMatchData.questionId,
              difficulty: fullMatchData.difficulty,
              language: fullMatchData.language,
              matchedTopics: JSON.parse(fullMatchData.matchedTopics || "[]"),
            },
          })
        );
      }
    });
  }
}

async function handleMatchDecline(matchId: string) {
  const matchData = await redis.hgetall(matchId);
  if (!matchData.users) return;

  const users: string[] = JSON.parse(matchData.users);
  await redis.hset(matchId, { status: "declined" });

  users.forEach((uid) => {
    const ws = activeConnections.get(uid);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(
        JSON.stringify({
          event: "match_declined",
          match: { id: matchId, users, status: "declined" },
        })
      );
    }
  });
}
