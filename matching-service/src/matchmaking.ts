import { getQueueUsers, leaveQueue } from "./queue";
import { Match, User } from "./types";
import { redis } from "./redis";
import { getRandomQuestionId, getQuestionById } from "./questionService";

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

    // Determine session topics:
    // - If both users had no preferences (matchedTopics is empty), use the question's actual topics
    // - Otherwise, use the matchedTopics from user preferences
    let sessionTopics = matchedTopics;
    
    if (matchedTopics.length === 0) {
      // Both users selected no preferences - fetch question details to get its topics
      const question = await getQuestionById(questionId);
      
      if (!question) {
        console.error(`Failed to fetch question details for ${questionId}`);
        return undefined;
      }
      
      sessionTopics = question.topics;
      console.log(`Using question's topics for session: ${sessionTopics.join(", ")}`);
    }

    const matchId = `match:${Date.now()}`;
    const match: Match = {
      id: matchId,
      users: [user.id, u.id],
      status: "pending",
      questionId: questionId,
      difficulty: user.difficulty,
      language: user.language,
      matchedTopics: sessionTopics,
      sessionId: "" // Placeholder, will be set after session creation

    };

    // Create collaboration session
    const sessionId = await createCollaborationSession(match);
    
    if (!sessionId) {
      console.error('Failed to create collaboration session, match cancelled');
      // Put users back in queue since session creation failed
      return undefined;
    }

    // Store match in Redis with extended data
    await redis.hset(matchId, {
      users: JSON.stringify(match.users),
      status: match.status,
      questionId: questionId,
      difficulty: match.difficulty,
      language: match.language,
      matchedTopics: JSON.stringify(sessionTopics),
      sessionId: sessionId
    });
    await redis.expire(matchId, 15);

    console.log(`Match created with question: ${questionId} and session: ${sessionId}`);

    // Add sessionId to match
    const matchWithSessionId: Match = {
      ...match,
      sessionId,
    };

    return matchWithSessionId;
  }

  return undefined;
}

// Create a collaboration session via the collaboration service
async function createCollaborationSession(match: Match): Promise<string | null> {
  try {
    if (!match.questionId) {
      console.error('No question in match for session creation');
      return null;
    }

    const response = await fetch('http://collaboration-service:3004/api/collaboration/sessions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        participants: match.users,
        questionId: match.questionId,
        difficulty: match.difficulty,
        topics: match.matchedTopics,
        language: match.language
      })
    });

    if (response.ok) {
      const data = await response.json();
      console.log('Collaboration session created:', data.data.sessionId);
      return data.data.sessionId;
    } else {
      const error = await response.json();
      console.error('Failed to create collaboration session:', error);
      return null;
    }
  } catch (error) {
    console.error('Error creating collaboration session:', error);
    return null;
  }
}
