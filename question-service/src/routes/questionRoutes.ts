import { Request, Response } from "express";
import express from "express";
import Question from "../models/questionModel";

const router = express.Router();


// Add a question
router.post("/addquestion", async (req: Request, res: Response) => {
  try {
    const { title, description, difficulty, topics } = req.body;
    
    const existing = await Question.findOne({ 
      title, 
      difficulty, 
      topics: { $all: topics, $size: topics.length } 
    });

    if (existing) {
      return res.status(400).json({ message: "Duplicate question already exists" });
    }
    
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
    const query: Record<string, any> = {};

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
    res.status(500).json({ message: "Failed to fetch questions for the given difficulty and set of topics" });
  }
});

export default router;