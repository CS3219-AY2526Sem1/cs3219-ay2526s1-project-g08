import { Request, Response, NextFunction } from "express";
import { verifyJwt } from "../utils/jwt";

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies.token; // cookie name

  if (!token) return res.status(401).json({ message: "Unauthorized" });

  try {
    verifyJwt(token);
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }
}
