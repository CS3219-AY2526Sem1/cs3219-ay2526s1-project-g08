import { getQueueUsers, leaveQueue } from "./queue";
import { Match, User } from "./types";
import { redis } from "./redis";

export async function findMatch(): Promise<Match | null> {
  const users = await getQueueUsers();
  if (users.length < 2) return null;

  for (let i = 0; i < users.length; i++) {
    const u1 = users[i];
    for (let j = i + 1; j < users.length; j++) {
      const u2 = users[j];

      // simple match condition: same difficulty & language & intersecting topics
      if (
        u1.difficulty === u2.difficulty &&
        u1.language === u2.language &&
        u1.topics.some((t) => u2.topics.includes(t))
      ) {
        // remove matched users from queue
        await leaveQueue(u1.id);
        await leaveQueue(u2.id);

        const matchId = `match:${Date.now()}`;
        const match: Match = { id: matchId, users: [u1.id, u2.id], status: "pending" };
        await redis.hset(matchId, {
          users: JSON.stringify(match.users),
          status: match.status,
        });
        await redis.expire(matchId, 15); // 15s TTL
        await redis.publish("match_found", JSON.stringify(match));

        return match;
      }
    }
  }
  return null;
}
