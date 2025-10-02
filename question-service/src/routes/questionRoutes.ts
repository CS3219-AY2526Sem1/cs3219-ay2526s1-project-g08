import express from "express";
import { getQuestions, addQuestion } from "../controllers/questionController";

const router = express.Router();

router.get("/getquestions", getQuestions);
router.post("/addquestion", addQuestion);

export default router;
