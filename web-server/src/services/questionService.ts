const QUESTION_SERVICE_URL = "http://localhost:3003/api/questions";

export interface Question {
  _id: string;
  title: string;
  description: string;
  difficulty: "easy" | "medium" | "hard";
  topics: string[];
  createdAt: string;
}

export interface CreateQuestionData {
  title: string;
  description: string;
  difficulty: "easy" | "medium" | "hard";
  topics: string[];
}

export async function getAllQuestions(): Promise<Question[]> {
  const response = await fetch(QUESTION_SERVICE_URL, {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Failed to fetch questions");
  }

  return response.json();
}

export async function createQuestion(
  data: CreateQuestionData
): Promise<Question> {
  const response = await fetch(QUESTION_SERVICE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to create question");
  }

  return response.json();
}

export async function deleteQuestion(title: string): Promise<void> {
  const response = await fetch(
    `${QUESTION_SERVICE_URL}/${encodeURIComponent(title)}`,
    {
      method: "DELETE",
      credentials: "include",
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to delete question");
  }
}
