import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "supersecret"; // we shld probably set this in .env

export function signJwt(payload: object) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "1h" });
}

export function verifyJwt(token: string) {
  return jwt.verify(token, JWT_SECRET);
}
