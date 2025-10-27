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
    origin: "http://localhost:3000",
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

app.use("/api/questions", questionRoutes);

// DB + server start
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Question Service running on port ${PORT}`);
  });
});
