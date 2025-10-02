import express from "express";
import { getQuestions, addQuestion } from "../controllers/questionController";

const router = express.Router();

router.get("/", getQuestions);
router.post("/", addQuestion);

export default router;
