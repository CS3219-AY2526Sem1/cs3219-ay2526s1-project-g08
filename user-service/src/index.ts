import "dotenv/config";
import express from "express";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/auth";
import userRoutes from "./routes/user";
import { connectToDatabase, closeDatabaseConnection } from "./db/connection";
import { initializeRefreshTokenIndexes } from "./db/refreshToken";

const app = express();
const port = Number(process.env.PORT) || 3002;
const host = "0.0.0.0";

app.use(express.json());
app.use(cookieParser());

// CORS allows web servers to grant browsers permission to access resources
// from a different domain than the one the webpage was served from
app.use((req, res, next) => {
  const origin = req.headers.origin;
  const allowedOrigins = [
    "http://localhost:3000",
    "http://localhost:3002",
    "http://localhost:5173",
    "https://dtdp1nnlnq3yh.cloudfront.net",  // CloudFront frontend
    process.env.FRONTEND_URL  // Environment variable for flexibility
  ].filter(Boolean);  // Remove undefined values

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

// Health check endpoint for ALB (must be before route mounting)
app.get("/user/health", (req, res) => {
  console.log(`Health check received from ${req.ip}`);
  res.status(200).json({ status: "healthy", timestamp: new Date().toISOString() });
});

// Environment-aware routing
// Local development: /auth and /user (no prefix)
// AWS deployment: /user/auth and /user (ALB routes /user/* to this service)
const isLocalDevelopment = process.env.NODE_ENV !== 'production';

if (isLocalDevelopment) {
  // Local development - no /user prefix
  app.use("/auth", authRoutes);
  app.use("/", userRoutes);
  console.log("Routes configured for LOCAL development (no /user prefix)");
} else {
  // AWS deployment - with /user prefix
  app.use("/user/auth", authRoutes);
  app.use("/user", userRoutes);
  console.log("Routes configured for AWS deployment (with /user prefix)");
}

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
      console.log(`User service running on port ${port}`);
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
