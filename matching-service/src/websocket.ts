import WebSocket from "ws";
import { joinQueue, leaveQueue } from "./queue";
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
        await handleMatchDecline(data.matchId, ws.userId);
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

    // Send acceptance update to both users showing current count
    users.forEach((uid) => {
      const ws = activeConnections.get(uid);
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(
          JSON.stringify({
            event: "match_acceptance_update",
            match: {
              id: matchId,
              users,
              status: "pending",
              acceptedCount: acceptedUsers.length,
            },
          })
        );
      }
    });
  }

  if (acceptedUsers.length === 2) {
    // Both users accepted, now create the collaboration session
    const fullMatchData = await redis.hgetall(matchId);

    const match = {
      id: matchId,
      users,
      questionId: fullMatchData.questionId,
      difficulty: fullMatchData.difficulty,
      language: fullMatchData.language,
      matchedTopics: JSON.parse(fullMatchData.matchedTopics || "[]"),
    };

    // Create collaboration session only now
    const sessionId = await createCollaborationSession(match);

    if (!sessionId) {
      console.error("Failed to create collaboration session");
      // Notify users of failure
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
      await redis.hset(matchId, { status: "declined" });
      return;
    }
    
    // Store sessionId and update status
    await redis.hset(matchId, { status: "accepted", sessionId: sessionId });

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
              sessionId: sessionId,
              questionId: fullMatchData.questionId,
              difficulty: fullMatchData.difficulty,
              language: fullMatchData.language,
              matchedTopics: JSON.parse(fullMatchData.matchedTopics || "[]"),
              acceptedCount: 2,
            },
          })
        );
      }
    });

    console.log(`Both users accepted. Created session: ${sessionId}`);
  }
}

// Create a collaboration session
async function createCollaborationSession(match: any): Promise<string | null> {
  try {
    if (!match.questionId) {
      console.error("No question in match for session creation");
      return null;
    }

    const response = await fetch(
      "http://collaboration-service:3004/api/collaboration/sessions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          participants: match.users,
          questionId: match.questionId,
          difficulty: match.difficulty,
          topics: match.matchedTopics,
          language: match.language,
        }),
      }
    );

    if (response.ok) {
      const data = await response.json();
      console.log("Collaboration session created:", data.data.sessionId);
      return data.data.sessionId;
    } else {
      const error = await response.json();
      console.error("Failed to create collaboration session:", error);
      return null;
    }
  } catch (error) {
    console.error("Error creating collaboration session:", error);
    return null;
  }
}
async function handleMatchDecline(matchId: string, decliningUserId: string) {
  const matchData = await redis.hgetall(matchId);
  if (!matchData.users) return;

  // If match already timed out, don't process manual decline
  if (matchData.status === "timeout") {
    console.log(
      `Match ${matchId} already timed out, skipping manual decline processing`
    );
    return;
  }

  const users: string[] = JSON.parse(matchData.users);
  const sessionId = matchData.sessionId;

  // Find the other user who didn't decline
  const otherUserId = users.find((uid) => uid !== decliningUserId);

  // Delete the collaboration session only if it was created (i.e., both had accepted)
  if (sessionId) {
    try {
      await deleteCollaborationSession(sessionId);
      console.log(
        `Deleted collaboration session: ${sessionId} due to match decline`
      );
    } catch (error) {
      console.error(
        `Failed to delete collaboration session ${sessionId}:`,
        error
      );
    }
  } else {
    console.log(
      `No session to delete for match ${matchId} - users declined before both accepted`
    );
  }

  // Re-queue the other user with their original queue position if they exist
  if (otherUserId) {
    // Get stored user data from match (since it was deleted from queue)
    const user1Data = matchData.user1Data
      ? JSON.parse(matchData.user1Data)
      : null;
    const user2Data = matchData.user2Data
      ? JSON.parse(matchData.user2Data)
      : null;

    // Find the data for the other user
    const otherUserData =
      user1Data?.id === otherUserId
        ? user1Data
        : user2Data?.id === otherUserId
        ? user2Data
        : null;

    if (otherUserData) {
      console.log(`Re-queueing user ${otherUserId} after match decline`);

      const userToRequeue = {
        id: otherUserData.id,
        difficulty: otherUserData.difficulty,
        language: otherUserData.language,
        topics: otherUserData.topics,
        joinTime: otherUserData.joinTime,
        ws: activeConnections.get(otherUserId),
      };

      await joinQueue(userToRequeue);
      console.log(
        `Re-queued user ${otherUserId} with original joinTime ${otherUserData.joinTime}`
      );

      // Trigger matching for the re-queued user
      const newMatch = await findMatch(userToRequeue);
      if (newMatch) {
        console.log(
          `Found new match for re-queued user ${otherUserId}: ${newMatch.id}`
        );
        await redis.publish("match_found", JSON.stringify(newMatch));
      } else {
        console.log(
          `No immediate match found for re-queued user ${otherUserId}`
        );
      }
    } else {
      console.log(
        `No stored data found for user ${otherUserId}, cannot re-queue`
      );
    }
  }

  await redis.hset(matchId, { status: "declined", decliningUserId });

  users.forEach((uid) => {
    const ws = activeConnections.get(uid);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(
        JSON.stringify({
          event: "match_declined",
          match: {
            id: matchId,
            users,
            status: "declined",
            decliningUserId, // Let clients know who declined
          },
          reason: "manual_decline", // This is a manual decline by a user
        })
      );
    }
  });
}

// Delete a collaboration session - exported for use in redis.ts
export async function deleteCollaborationSession(
  sessionId: string
): Promise<void> {
  try {
    const response = await fetch(
      `http://collaboration-service:3004/api/collaboration/internal/sessions/${sessionId}`,
      {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      console.error("Failed to delete collaboration session:", error);
    }
  } catch (error) {
    console.error("Error deleting collaboration session:", error);
    throw error;
  }
}
