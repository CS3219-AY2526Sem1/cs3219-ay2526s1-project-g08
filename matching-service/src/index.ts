import "dotenv/config";
import http from "http";
import { startWebSocketServer } from "./websocket";
import { setupRedisSubscriber } from "./redis";

async function main() {
  const PORT = process.env.PORT || 3001;

  // Create HTTP server that handles both HTTP and WebSocket
  const server = http.createServer((req, res) => {
    // CORS headers for CloudFront
    const origin = req.headers.origin;
    const allowedOrigins = [
      "http://localhost:3000",
      "http://localhost:5173",
      "https://dtdp1nnlnq3yh.cloudfront.net",
      process.env.FRONTEND_URL,
    ].filter(Boolean);

    if (origin && allowedOrigins.includes(origin)) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Access-Control-Allow-Credentials", "true");
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    }

    if (req.method === "OPTIONS") {
      res.writeHead(200);
      res.end();
      return;
    }

    if (req.url === "/health" && req.method === "GET") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "healthy" }));
    } else {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Not found" }));
    }
  });

  server.listen(PORT, () => {
    console.log(`HTTP server running on port ${PORT}`);
  });

  // Attach WebSocket server to HTTP server
  setupRedisSubscriber();
  startWebSocketServer(server);
}

main();
