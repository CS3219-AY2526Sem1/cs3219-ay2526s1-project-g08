import "dotenv/config";
import { startWebSocketServer } from "./websocket";
import { setupRedisSubscriber } from "./redis";

async function main() {
  setupRedisSubscriber();
  startWebSocketServer(3001);
}

main();
