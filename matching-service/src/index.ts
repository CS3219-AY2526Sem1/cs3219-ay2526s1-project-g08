import "dotenv/config";
import http from "http";
import { startWebSocketServer } from "./websocket";
import { setupRedisSubscriber } from "./redis";

async function main() {
  const PORT = process.env.PORT || 3001;
  
  // Create HTTP server that handles both HTTP and WebSocket
  const server = http.createServer((req, res) => {
    if (req.url === '/health' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'healthy' }));
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not found' }));
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
