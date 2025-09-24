import { redis } from "./redis";
import { User } from "./types";

export const QUEUE_KEY = "match_queue";

export async function joinQueue(user: User) {
  await redis.zadd(QUEUE_KEY, user.joinedAt, user.id);
  await redis.hset(`user:${user.id}`, {
    difficulty: user.difficulty,
    language: user.language,
    topics: JSON.stringify(user.topics),
    joinedAt: user.joinedAt.toString(),
  });
}

export async function leaveQueue(userId: string) {
  await redis.zrem(QUEUE_KEY, userId);
  await redis.del(`user:${userId}`);
}

export async function getQueueUsers(): Promise<User[]> {
  const ids = await redis.zrange(QUEUE_KEY, 0, -1);
  const users: User[] = [];
  for (const id of ids) {
    const data = await redis.hgetall(`user:${id}`);
    if (Object.keys(data).length > 0) {
      users.push({
        id,
        difficulty: data.difficulty,
        language: data.language,
        topics: JSON.parse(data.topics),
        joinedAt: Number(data.joinedAt),
      });
    }
  }
  return users;
}
