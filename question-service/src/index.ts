import express from "express";
import dotenv from "dotenv";
import connectDB from "./config/db";
import questionRoutes from "./routes/questionRoutes";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3003;

// Middleware
app.use(express.json());

// Routes
app.get("/", (_req, res) => {
  res.send("Question Service is running!");
});
app.use("/api/questions", questionRoutes);

// DB + server start
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Question Service running on port ${PORT}`);
  });
});
