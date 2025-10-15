import { Request, Response } from "express";
import express from "express";
import Question from "../models/questionModel";

const router = express.Router({ mergeParams: true });

// Helper function to decode URI components safely
const decodeTitle = (title: string): string => {
  try {
    return decodeURIComponent(title);
  } catch {
    return title;
  }
};

// Get all unique topics from non-deleted questions
router.get("/topics", async (req: Request, res: Response) => {
  try {
    // Db finds all unique topics from non-deteleted questions
    const uniqueTopics = await Question.distinct("topics", {
      isDeleted: false,
    });

    uniqueTopics.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));

    res.json(uniqueTopics);
  } catch (err) {
    console.error("Failed to fetch topics:", err);
    res.status(500).json({
      message: "Failed to fetch available topics",
    });
  }
});

// Get a random question matching difficulty and topics
// IMPORTANT: This route must come before /:id routes to avoid matching "random" as an ID
router.get("/random", async (req: Request, res: Response) => {
  try {
    const { difficulty, topics } = req.query;

    console.log("Random question request:", { difficulty, topics });

    // Build query
    const query: Record<string, any> = { isDeleted: false };

    // Add difficulty filter if provided
    if (difficulty) {
      if (!["easy", "medium", "hard"].includes(difficulty as string)) {
        return res.status(400).json({
          message: "Difficulty must be one of 'easy', 'medium', or 'hard'",
        });
      }
      query.difficulty = difficulty;
    }

    // Add topics filter if provided (intersection - question must have at least one of the topics)
    if (topics) {
      let topicArray: string[] = [];
      if (Array.isArray(topics)) {
        topicArray = topics.flatMap((t) =>
          typeof t === "string" ? t.split(",") : []
        );
      } else if (typeof topics === "string") {
        topicArray = topics.split(",");
      }

      // Only add filter if topics array is not empty
      if (topicArray.length > 0) {
        query.topics = { $in: topicArray };
      }
    }

    console.log("Query for random question:", query);

    // Find all matching questions
    const matchingQuestions = await Question.find(query);

    if (matchingQuestions.length === 0) {
      return res.status(404).json({
        message: "No questions found matching the specified criteria",
      });
    }

    // Select a random question from matching questions
    const randomIndex = Math.floor(Math.random() * matchingQuestions.length);
    const selectedQuestion = matchingQuestions[randomIndex];

    console.log(
      `Selected random question: ${selectedQuestion.title} (${
        randomIndex + 1
      }/${matchingQuestions.length} matches)`
    );

    res.json(selectedQuestion);
  } catch (err) {
    console.error("Failed to fetch random question:", err);
    res.status(500).json({
      message: "Failed to fetch random question",
    });
  }
});

// Get a random question matching difficulty and topics
// IMPORTANT: This route must come before /:id routes to avoid matching "random" as an ID
router.get("/random", async (req: Request, res: Response) => {
  try {
    const { difficulty, topics } = req.query;

    console.log("Random question request:", { difficulty, topics });

    // Build query
    const query: Record<string, any> = { isDeleted: false };

    // Add difficulty filter if provided
    if (difficulty) {
      if (!["easy", "medium", "hard"].includes(difficulty as string)) {
        return res.status(400).json({
          message: "Difficulty must be one of 'easy', 'medium', or 'hard'",
        });
      }
      query.difficulty = difficulty;
    }

    // Add topics filter if provided (intersection - question must have at least one of the topics)
    if (topics) {
      let topicArray: string[] = [];
      if (Array.isArray(topics)) {
        topicArray = topics.flatMap((t) =>
          typeof t === "string" ? t.split(",") : []
        );
      } else if (typeof topics === "string") {
        topicArray = topics.split(",");
      }

      // Only add filter if topics array is not empty
      if (topicArray.length > 0) {
        query.topics = { $in: topicArray };
      }
    }

    console.log("Query for random question:", query);

    // Find all matching questions
    const matchingQuestions = await Question.find(query);

    if (matchingQuestions.length === 0) {
      return res.status(404).json({
        message: "No questions found matching the specified criteria",
      });
    }

    // Select a random question from matching questions
    const randomIndex = Math.floor(Math.random() * matchingQuestions.length);
    const selectedQuestion = matchingQuestions[randomIndex];

    console.log(
      `Selected random question: ${selectedQuestion.title} (${
        randomIndex + 1
      }/${matchingQuestions.length} matches)`
    );

    res.json(selectedQuestion);
  } catch (err) {
    console.error("Failed to fetch random question:", err);
    res.status(500).json({
      message: "Failed to fetch random question",
    });
  }
});

// Add a question (Admin only)
router.post("/", async (req: Request, res: Response) => {
  try {
    const { title, description, difficulty, topics } = req.body;

    if (!title || typeof title !== "string" || title.trim() === "") {
      return res
        .status(400)
        .json({ message: "Title is required and must be a non-empty string" });
    }
    if (
      !description ||
      typeof description !== "string" ||
      description.trim() === ""
    ) {
      return res.status(400).json({
        message: "Description is required and must be a non-empty string",
      });
    }

    if (!["easy", "medium", "hard"].includes(difficulty) || !difficulty) {
      return res.status(400).json({
        message: "Difficulty must be one of 'easy', 'medium', or 'hard'",
      });
    }

    if (
      !Array.isArray(topics) ||
      topics.length === 0 ||
      !topics.every((topic) => typeof topic === "string" && topic.trim() !== "")
    ) {
      return res
        .status(400)
        .json({
          message: "Topics must be an array of at least one non-empty string",
        });
    }

    const existing = await Question.findOne({
      title,
      isDeleted: false, // Only check for non-deleted duplicates
    });

    if (existing) {
      return res
        .status(400)
        .json({ message: "Duplicate question already exists" });
    }

    const newQuestion = new Question({
      title,
      description,
      difficulty,
      topics,
    });
    await newQuestion.save();
    res.status(201).json(newQuestion);
  } catch (err) {
    if (err instanceof Error) {
      res.status(400).json({ message: "Invalid data", error: err.message });
    } else {
      res
        .status(400)
        .json({ message: "Invalid data", error: "An unknown error occurred." });
    }
  }
});

// Update a question by ID (Admin only)
router.put("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { description, difficulty, topics, newTitle } = req.body;

    console.log("Update request received:", {
      id,
      body: req.body,
    });

    if (!id || id.trim() === "") {
      return res.status(400).json({ message: "Question ID is required" });
    }

    // Try to find the question by ID
    const question = await Question.findOne({ _id: id, isDeleted: false });

    if (!question) {
      console.log("Question not found with ID:", id);
      return res.status(404).json({
        message: `Question not found with ID: "${id}"`,
      });
    }

    // Validate updates
    if (description !== undefined) {
      if (typeof description !== "string" || description.trim() === "") {
        return res.status(400).json({
          message: "Description must be a non-empty string",
        });
      }
      question.description = description;
    }

    if (difficulty !== undefined) {
      if (!["easy", "medium", "hard"].includes(difficulty)) {
        return res.status(400).json({
          message: "Difficulty must be one of 'easy', 'medium', or 'hard'",
        });
      }
      question.difficulty = difficulty;
    }

    if (topics !== undefined) {
      if (
        !Array.isArray(topics) ||
        topics.length === 0 ||
        !topics.every(
          (topic) => typeof topic === "string" && topic.trim() !== ""
        )
      ) {
        return res
          .status(400)
          .json({
            message: "Topics must be an array of at least one non-empty string",
          });
      }
      question.topics = topics;
    }

    // Handle title change - check for duplicates
    if (newTitle !== undefined && newTitle !== question.title) {
      if (typeof newTitle !== "string" || newTitle.trim() === "") {
        return res.status(400).json({
          message: "New title must be a non-empty string",
        });
      }

      const existing = await Question.findOne({
        title: newTitle,
        isDeleted: false,
      });

      if (existing) {
        return res.status(400).json({
          message: "A question with this title already exists",
        });
      }

      question.title = newTitle;
    }

    await question.save();
    console.log("Question updated successfully:", question);
    res.status(200).json(question);
  } catch (err) {
    console.error("Update question error:", err);
    res.status(500).json({ message: "Failed to update question" });
  }
});

// Delete a question by ID (Admin only - Soft Delete)
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id || id.trim() === "") {
      return res.status(400).json({ message: "Question ID is required" });
    }

    const question = await Question.findOne({ _id: id, isDeleted: false });

    if (!question) {
      return res.status(404).json({ message: "Question not found" });
    }

    // Soft delete: set isDeleted flag and deletedAt timestamp
    question.isDeleted = true;
    question.deletedAt = new Date();
    await question.save();

    res.status(200).json({
      message:
        "Question marked as deleted successfully. Active sessions can continue, but this question will not be available for new sessions.",
      title: question.title,
    });
  } catch (err) {
    console.error("Delete question error:", err);
    res.status(500).json({ message: "Failed to delete question" });
  }
});

// Get all the questions by providing a way to filter questions based on topic and difficulty
router.get("/", async (req: Request, res: Response) => {
  try {
    const { topic, difficulty } = req.query;
    const query: Record<string, any> = { isDeleted: false }; // Only return non-deleted questions

    if (difficulty) {
      query.difficulty = difficulty;
    }
    if (topic) {
      let topicArray: string[] = [];
      if (Array.isArray(topic)) {
        topicArray = topic.flatMap((t) =>
          typeof t === "string" ? t.split(",") : []
        );
      } else if (typeof topic === "string") {
        topicArray = topic.split(",");
      }
      query.topics = { $in: topicArray };
    }

    const questions = await Question.find(query);
    res.json(questions);
  } catch (err) {
    res.status(500).json({
      message:
        "Failed to fetch questions for the given difficulty and set of topics",
    });
  }
});

export default router;
