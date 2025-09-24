// index.ts
import { startWebSocketServer } from "./websocket";
import { setupRedisSubscriber } from "./redis";

async function main() {
  setupRedisSubscriber();
  startWebSocketServer(8080);
}

main();