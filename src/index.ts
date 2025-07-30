import express from "express";
import dotenv from "dotenv";
import { handleWebhook } from "./webhooks/index.js";

dotenv.config();

const app = express();

// Use raw body parser to get original payload for signature verification
app.use("/github/webhook", express.raw({ type: "application/json" }));
app.use(express.json());

app.post("/github/webhook", handleWebhook);

const port = Number(process.env.PORT) || 8080;
const hostname = process.env.HOSTNAME || "0.0.0.0";

// Add startup error handling
const server = app
  .listen(port, hostname, () => {
    console.log(`🚀 Server running on port ${port}`);
    console.log(
      `📡 Webhook endpoint: http://${hostname}:${port}/github/webhook`
    );
    console.log(
      `🔑 Make sure to set GITHUB_WEBHOOK_SECRET environment variable`
    );
  })
  .on("error", (err) => {
    console.error("Failed to start server:", err);
    process.exit(1);
  });

// Add graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received, shutting down...");
  server.close(() => {
    console.log("Server closed");
    process.exit(0);
  });
});
