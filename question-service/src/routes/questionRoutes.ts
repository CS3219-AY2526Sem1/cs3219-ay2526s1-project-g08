import { Request, Response } from "express";
import express from "express";
import Question from "../models/questionModel";

const router = express.Router();

// Add a question (Admin only - middleware should be added in main app)
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
      !topics.every((topic) => typeof topic === "string")
    ) {
      return res
        .status(400)
        .json({ message: "Topics must be an array of non-empty strings" });
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
    res.status(400).json({ message: "Invalid data" });
  }
});

// Delete a question by title (Admin only - Soft Delete)
router.delete("/:title", async (req: Request, res: Response) => {
  try {
    const { title } = req.params;

    if (!title || title.trim() === "") {
      return res.status(400).json({ message: "Question title is required" });
    }

    const question = await Question.findOne({ title, isDeleted: false });

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
      title,
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
