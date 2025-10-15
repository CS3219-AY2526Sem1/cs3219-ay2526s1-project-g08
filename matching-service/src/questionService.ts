// Client for communicating with the Question Service

const QUESTION_SERVICE_URL =
  process.env.QUESTION_SERVICE_URL || "http://question-service:3003";

export interface Question {
  _id: string;
  title: string;
  description: string;
  difficulty: "easy" | "medium" | "hard";
  topics: string[];
  isDeleted: boolean;
  createdAt: string;
}

/**
 * Fetch a random question matching the specified difficulty and topics
 * @param difficulty - The difficulty level (easy, medium, hard)
 * @param topics - Array of topics to match (question must have at least one)
 * @returns A random question matching the criteria, or null if none found
 */
export async function getRandomQuestion(
  difficulty: string,
  topics: string[]
): Promise<Question | null> {
  try {
    // Build query parameters
    const params = new URLSearchParams();
    params.append("difficulty", difficulty);

    // Only add topics if array is not empty
    if (topics.length > 0) {
      params.append("topics", topics.join(","));
    }

    const url = `${QUESTION_SERVICE_URL}/api/questions/random?${params.toString()}`;
    console.log(`Fetching random question from: ${url}`);

    const response = await fetch(url);

    if (!response.ok) {
      if (response.status === 404) {
        console.log("No questions found matching criteria");
        return null;
      }
      throw new Error(`Question service responded with ${response.status}`);
    }

    const question: Question = await response.json();
    console.log(
      `Retrieved question: ${question.title} (${question.difficulty})`
    );
    return question;
  } catch (error) {
    console.error("Error fetching random question:", error);
    return null;
  }
}
