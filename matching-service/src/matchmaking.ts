import { getQueueUsers, leaveQueue } from "./queue";
import { Match, User } from "./types";
import { redis } from "./redis";
import { getRandomQuestionId } from "./questionService";

// Find a match for the given user based on difficulty, language, and topics
export async function findMatch(user: User): Promise<Match | undefined> {
  const users = await getQueueUsers(user.difficulty, user.language);

  if (users.length < 2) return undefined;

  for (const u of users) {
    if (u.id === user.id) continue;

    // Calculate intersection of topics
    // If either user has no topics, treat as wildcard (match with any)
    let matchedTopics: string[] = [];

    if (user.topics.length === 0 || u.topics.length === 0) {
      // Wildcard match - use all topics from the user who has topics
      // or empty array if both have no topics
      matchedTopics = user.topics.length > 0 ? user.topics : u.topics;
      console.log(`Wildcard topic match for users ${user.id} and ${u.id}`);
    } else {
      // Find intersection of topics
      matchedTopics = u.topics.filter((t) => user.topics.includes(t));

      // Only match if there's at least one common topic
      if (matchedTopics.length === 0) {
        continue; // No common topics, try next user
      }
    }

    console.log(
      `Match found between ${user.id} and ${
        u.id
      } with topics: ${matchedTopics.join(", ")}`
    );

    // Remove both users from queue
    await leaveQueue(user.id);
    await leaveQueue(u.id);

    // Fetch a random question ID matching the criteria
    const questionId = await getRandomQuestionId(
      user.difficulty,
      matchedTopics
    );

    if (!questionId) {
      console.error(
        `No question found for difficulty: ${
          user.difficulty
        }, topics: ${matchedTopics.join(", ")}`
      );
      // Put users back in queue if no question found
      return undefined;
    }

    const matchId = `match:${Date.now()}`;
    const match: Match = {
      id: matchId,
      users: [user.id, u.id],
      status: "pending",
      questionId: questionId,
      difficulty: user.difficulty,
      language: user.language,
      matchedTopics,
    };

    // Store match in Redis with extended data
    await redis.hset(matchId, {
      users: JSON.stringify(match.users),
      status: match.status,
      questionId: questionId,
      difficulty: match.difficulty,
      language: match.language,
      matchedTopics: JSON.stringify(matchedTopics),
    });
    await redis.expire(matchId, 15);

    console.log(`Match created with question ID: ${questionId}`);

    return match;
  }

  return undefined;
}
