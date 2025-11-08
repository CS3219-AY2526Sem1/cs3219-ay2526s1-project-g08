// Client for communicating with the Question Service

const QUESTION_SERVICE_URL =
  process.env.QUESTION_SERVICE_URL || "http://peerprep-alb-1487410036.ap-southeast-1.elb.amazonaws.com/questions";

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
 * Fetch a random question ID matching the specified difficulty and topics
 * @param difficulty - The difficulty level (easy, medium, hard)
 * @param topics - Array of topics to match (question must have at least one)
 * @returns A random question ID matching the criteria, or null if none found
 */
export async function getRandomQuestionId(
  difficulty: string,
  topics: string[]
): Promise<string | null> {
  try {
    // Build query parameters
    const params = new URLSearchParams();
    params.append("difficulty", difficulty);

    // Only add topics if array is not empty
    if (topics.length > 0) {
      params.append("topics", topics.join(","));
    }

    const url = `${QUESTION_SERVICE_URL}/random?${params.toString()}`;
    console.log(`Fetching random question ID from: ${url}`);

    const response = await fetch(url);

    if (!response.ok) {
      if (response.status === 404) {
        console.log("No questions found matching criteria");
        return null;
      }
      throw new Error(`Question service responded with ${response.status}`);
    }

    const data: { questionId: string } = await response.json();
    console.log(`Retrieved question ID: ${data.questionId}`);
    return data.questionId;
  } catch (error) {
    console.error("Error fetching random question ID:", error);
    return null;
  }
}

/**
 * Fetch question details by ID
 * @param questionId - The question ID
 * @returns The full question object, or null if not found
 */
export async function getQuestionById(
  questionId: string
): Promise<Question | null> {
  try {
    const url = `${QUESTION_SERVICE_URL}/${questionId}`;
    console.log(`Fetching question details from: ${url}`);

    const response = await fetch(url);

    if (!response.ok) {
      if (response.status === 404) {
        console.log(`Question ${questionId} not found`);
        return null;
      }
      throw new Error(`Question service responded with ${response.status}`);
    }

    const question: Question = await response.json();
    console.log(`Retrieved question: ${question.title} with topics: ${question.topics.join(", ")}`);
    return question;
  } catch (error) {
    console.error("Error fetching question by ID:", error);
    return null;
  }
}
