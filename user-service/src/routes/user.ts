import { Router, Request, Response } from "express";
import cookieParser from "cookie-parser";
import { verifyJwt } from "../utils/jwt";
import { getUserById, getQuestionHistory, addQuestionToHistory } from "../db/user";

const router = Router();
router.use(cookieParser());

router.get("/profile", async (req: Request, res: Response) => {
  try {
    const token = req.cookies.token;

    if (!token) {
      return res.status(401).json({ error: "Missing authentication token" });
    }

    // Verify JWT and ensure it's an object with userId
    const payload = verifyJwt(token);

    if (typeof payload === "string" || !payload.userId) {
      return res.status(401).json({ error: "Invalid token format" });
    }

    const userId = payload.userId as string;
    console.log("Extracted userId from JWT:", userId);
    const user = await getUserById(userId);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({
      userId: user.userId,
      name: user.name,
      role: user.role || "user", // Include role in profile response
    });
  } catch (err) {
    console.error("Profile fetch error:", err);
    if (err instanceof Error && err.name === "JsonWebTokenError") {
      return res.status(401).json({ error: "Invalid token" });
    }
    res.status(500).json({ error: "Internal server error" });
  }
});

// Endpoint to get JWT token from cookie
router.get("/token", async (req: Request, res: Response) => {
  try {
    const token = req.cookies.token;

    if (!token) {
      return res.status(401).json({ error: "Missing authentication token" });
    }

    // Verify token is valid before returning it
    const payload = verifyJwt(token);
    
    if (typeof payload === "string" || !payload.userId) {
      return res.status(401).json({ error: "Invalid token format" });
    }

    // Return the token for use with other services
    res.json({
      token: token,
      userId: payload.userId
    });
  } catch (err) {
    console.error("Token fetch error:", err);
    if (err instanceof Error && err.name === "JsonWebTokenError") {
      return res.status(401).json({ error: "Invalid token" });
    }
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/:userId/history", async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { questionId } = req.body;

    const success = await addQuestionToHistory(userId, questionId);
    if (!success) {
      return res.status(500).json({ error: "Failed to add question to history" });
    }

    res.status(201).json({ message: "Question added to history" });
  } catch (error) {
    console.error("Error adding question to history:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/profile/history", async (req: Request, res: Response) => {
  try {
    const token = req.cookies.token;
    if (!token) {
      return res.status(401).json({ error: "Missing authentication token" });
    }
    const payload = verifyJwt(token);
    if (typeof payload === "string" || !payload.userId) {
      return res.status(401).json({ error: "Invalid token format" });
    }
    const userId = payload.userId as string;
    const user = await getUserById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    const history = await getQuestionHistory(userId);
    res.json({ history });
  } catch (error) {
    console.error("Error fetching question history:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
