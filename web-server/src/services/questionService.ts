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

export interface UpdateQuestionData {
  description?: string;
  difficulty?: "easy" | "medium" | "hard";
  topics?: string[];
  newTitle?: string;
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
    let errorMessage = "Failed to create question";
    try {
      const error = await response.json();
      errorMessage = error.message || errorMessage;
    } catch (e) {
      // If response is not JSON, use status text
      errorMessage = `Failed to create question: ${response.status} ${response.statusText}`;
    }
    throw new Error(errorMessage);
  }

  return response.json();
}

export async function updateQuestion(
  questionId: string,
  data: UpdateQuestionData
): Promise<Question> {
  console.log("Updating question:", { questionId, data });
  
  const response = await fetch(
    `${QUESTION_SERVICE_URL}/${questionId}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(data),
    }
  );

  if (!response.ok) {
    let errorMessage = "Failed to update question";
    try {
      const error = await response.json();
      errorMessage = error.message || errorMessage;
    } catch (e) {
      // If response is not JSON, use status text
      errorMessage = `Failed to update question: ${response.status} ${response.statusText}`;
    }
    throw new Error(errorMessage);
  }

  return response.json();
}

export async function deleteQuestion(questionId: string): Promise<void> {
  console.log("Deleting question:", questionId);
  
  const response = await fetch(
    `${QUESTION_SERVICE_URL}/${questionId}`,
    {
      method: "DELETE",
      credentials: "include",
    }
  );

  if (!response.ok) {
    let errorMessage = "Failed to delete question";
    try {
      const error = await response.json();
      errorMessage = error.message || errorMessage;
    } catch (e) {
      // If response is not JSON, use status text
      errorMessage = `Failed to delete question: ${response.status} ${response.statusText}`;
    }
    throw new Error(errorMessage);
  }
}
