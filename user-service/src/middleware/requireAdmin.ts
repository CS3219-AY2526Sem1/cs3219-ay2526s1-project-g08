import { Request, Response, NextFunction } from "express";
import { verifyJwt } from "../utils/jwt";
import { getUserById } from "../db/user";

export async function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const token = req.cookies.token;

  if (!token) {
    return res
      .status(401)
      .json({ message: "Unauthorized - No token provided" });
  }

  try {
    const payload = verifyJwt(token);

    if (typeof payload === "string" || !payload.userId) {
      return res.status(401).json({ message: "Invalid token format" });
    }

    const userId = payload.userId as string;
    const user = await getUserById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.role !== "admin") {
      return res
        .status(403)
        .json({ message: "Forbidden - Admin access required" });
    }

    // Attach user to request for downstream use
    (req as any).user = user;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }
}
