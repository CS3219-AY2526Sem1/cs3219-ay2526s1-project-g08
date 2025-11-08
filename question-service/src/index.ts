import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "./config/db";
import questionRoutes from "./routes/questionRoutes";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3003;

// Middleware
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Set strict routing to false to handle trailing slashes
app.set("strict routing", false);

// Routes
app.get("/", (_req, res) => {
  res.send("Question Service is running!");
});

// Health check endpoint for ALB
app.get("/questions/health", (_req, res) => {
  res.status(200).json({ status: "healthy" });
});

app.use("/questions", questionRoutes);

// DB + server start
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Question Service running on port ${PORT}`);
  });
});
