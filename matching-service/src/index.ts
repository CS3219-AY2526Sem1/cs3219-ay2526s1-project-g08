import redis from "./redis";
import { wsServer } from "./websocket";

redis.subscribe("match_found", (err, count) => {
    if (err) console.error("Subscribe error:", err);
});

redis.on("message", (channel, message) => {
    if (channel === "match_found") {
        const match = JSON.parse(message);
        console.log("Match found:", match);
    }
});

console.log("WebSocket server running on ws://localhost:8080");
