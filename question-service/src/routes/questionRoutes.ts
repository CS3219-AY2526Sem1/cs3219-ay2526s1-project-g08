import { Request, Response } from "express";
import express from "express";
import Question from "../models/questionModel";

const router = express.Router();


// Add a question
router.post("/addquestion", async (req: Request, res: Response) => {
  try {
    const { title, description, difficulty, topics } = req.body;
    const newQuestion = new Question({ title, description, difficulty, topics });
    await newQuestion.save();
    res.status(201).json(newQuestion);
  } catch (err) {
    res.status(400).json({ message: "Invalid data" });
  }
});

// Get all the questions by providing a way to filter questions based on topic and difficulty
router.get("/getquestion", async (req: Request, res: Response) => {
  try {
    const { topic, difficulty } = req.query;
    const query: any = {};

    if (difficulty) {
      query.difficulty = difficulty;
    } 
    if (topic) {
      query.topics = { $in: (topic as string).split(",") };
    }

    const questions = await Question.find(query);
    res.json(questions);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch questions for the given difficulty and set of topics" });
  }
});

export default router;