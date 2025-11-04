import "dotenv/config";
import express from "express";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/auth";
import userRoutes from "./routes/user";
import { connectToDatabase, closeDatabaseConnection } from "./db/connection";
import { initializeRefreshTokenIndexes } from "./db/refreshToken";

const app = express();
const port = Number(process.env.PORT) || 3002;
const isProduction = process.env.NODE_ENV === "production";
const host = isProduction ? "0.0.0.0" : "localhost";

app.use(express.json());
app.use(cookieParser());

// CORS allows web servers to grant browsers permission to access resources
// from a different domain than the one the webpage was served from
app.use((req, res, next) => {
  const origin = req.headers.origin;
  const allowedOrigins = ["http://localhost:3000", "http://localhost:3002"];

  if (origin && allowedOrigins.includes(origin)) {
    res.header("Access-Control-Allow-Origin", origin);
  }

  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization, Cookie"
  );
  res.header("Access-Control-Allow-Credentials", "true");

  if (req.method === "OPTIONS") {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Routes
app.use("/auth", authRoutes);
app.use("/user", userRoutes);

app.get("/", (_req, res) => {
  res.send("User Service running");
});

// Initialize database and start server
async function startServer() {
  try {
    await connectToDatabase();

    // Initialize refresh token indexes
    await initializeRefreshTokenIndexes();

    app.listen(port, host, () => {
      const serverUrl = isProduction
        ? `http://${host}:${port}`
        : `http://localhost:${port}`;
      console.log(`User service running on ${serverUrl}`);
      console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
    });

    // Graceful shutdown
    process.on("SIGINT", async () => {
      console.log("Shutting down gracefully...");
      await closeDatabaseConnection();
      process.exit(0);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

startServer();
