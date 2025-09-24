import { getQueueUsers, leaveQueue } from "./queue";
import { Match, User } from "./types";
import { redis } from "./redis";

// Find a match for the given user based on difficulty, language, and topics
export async function findMatch(user: User): Promise<Match | undefined> {
  const users = await getQueueUsers(user.difficulty, user.language);

  if (users.length < 2) return undefined;

  for (const u of users) {
    if (u.id === user.id) continue;

    if (u.topics.some((t) => user.topics.includes(t))) {
      await leaveQueue(user.id);
      await leaveQueue(u.id);

      const matchId = `match:${Date.now()}`;
      const match: Match = {
        id: matchId,
        users: [user.id, u.id],
        status: "pending",
      };

      await redis.hset(matchId, {
        users: JSON.stringify(match.users),
        status: match.status,
      });
      await redis.expire(matchId, 15);

      return match;
    }
  }

  return undefined;
}
