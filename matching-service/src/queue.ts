import { redis } from "./redis";
import { User } from "./types";

function getQueueKey(difficulty: string, language: string) {
  return `queue:${difficulty}:${language}`;
}

export async function joinQueue(user: User) {
  // There exists a separate queue for each difficulty-language pair
  const QUEUE_KEY = getQueueKey(user.difficulty, user.language);

  // joinTime is the score, user.id is the member
  await redis.zadd(QUEUE_KEY, user.joinTime, user.id);
  await redis.hset(`user:${user.id}`, {
    // still include difficulty & language for easy retrieval, better not infer from queue key
    difficulty: user.difficulty,
    language: user.language,
    topics: JSON.stringify(user.topics),
    joinTime: user.joinTime.toString(),
  });
}

// Find user's queue based on stored difficulty & language
// Then remove user from that queue
export async function leaveQueue(userId: string) {
  const data = await redis.hgetall(`user:${userId}`);
  if (!data || !data.difficulty || !data.language) return;

  const QUEUE_KEY = getQueueKey(data.difficulty, data.language);
  await redis.zrem(QUEUE_KEY, userId);
  await redis.del(`user:${userId}`);
}

export async function getQueueUsers(
  difficulty: string,
  language: string
): Promise<User[]> {
  const QUEUE_KEY = getQueueKey(difficulty, language);
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
        joinTime: Number(data.joinTime),
      });
    }
  }
  return users;
}
