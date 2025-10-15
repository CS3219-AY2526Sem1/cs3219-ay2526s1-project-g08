import { Router, Request, Response } from "express";
import cookieParser from "cookie-parser";
import { verifyJwt } from "../utils/jwt";
import { getUserById } from "../db/user";
import { JwtPayload } from "jsonwebtoken";

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

export default router;
