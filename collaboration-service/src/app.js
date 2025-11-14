const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const { createServer } = require("http");
const sessionRoutes = require("./controllers/sessionController");

const app = express();
const httpServer = createServer(app);

// Middleware
app.use(helmet());

const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:5173",
  "https://dtdp1nnlnq3yh.cloudfront.net",
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true, // enable cookies and credentials
  })
);
// allow JSON data in request body to be parsed
app.use(express.json());
// allow URL-encoded data in request body to be parsed
app.use(express.urlencoded({ extended: true }));

// Routes
app.use("/collaboration", sessionRoutes);

// Health check (direct access without ALB prefix)
app.get("/health", (req, res) => {
  res.status(200).json({ status: "OK", service: "collaboration-service" });
});

module.exports = { app, httpServer };
