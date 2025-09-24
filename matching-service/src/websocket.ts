import WebSocket from "ws";
import { joinQueue } from "./queue";
import { findMatch } from "./matchmaking";
import { User } from "./types";

const wss = new WebSocket.Server({ port: 8080 });

export const wsServer = wss;

wss.on("connection", (ws) => {
  console.log("Client connected");

  ws.on("message", async (msg) => {
    const data = JSON.parse(msg.toString());
    if (data.action === "join") {
      const user: User = {
        id: data.id,
        difficulty: data.difficulty,
        language: data.language,
        topics: data.topics,
        joinedAt: Date.now(),
        ws,
      };
      await joinQueue(user);
      console.log(`User ${user.id} joined queue`);

      const match = await findMatch();
      if (match) {
        match.users.forEach((u) => {
          if (u === user.id) ws.send(JSON.stringify({ event: "match_found", match }));
        });
      }
    }
  });

  ws.on("close", () => console.log("Client disconnected"));
});
