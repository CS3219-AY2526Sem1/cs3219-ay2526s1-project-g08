import { Request, Response } from "express";
import Question from "../models/questionModel";

// Get all questions
export const getQuestions = async (req: Request, res: Response) => {
  try {
    const questions = await Question.find();
    res.json(questions);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// Add a new question
export const addQuestion = async (req: Request, res: Response) => {
  try {
    const { title, description, difficulty } = req.body;
    const newQuestion = new Question({ title, description, difficulty });
    await newQuestion.save();
    res.status(201).json(newQuestion);
  } catch (err) {
    res.status(400).json({ message: "Invalid data" });
  }
};
