import express from "express";
import dotenv from "dotenv";
import crypto from "crypto";
import { saveInstallation } from "./supabase";

dotenv.config();

const app = express();

// Use raw body parser to get original payload for signature verification
app.use("/github/webhook", express.raw({ type: "application/json" }));
app.use(express.json());

/**
 * Verify GitHub webhook signature
 * @param payload Raw request body
 * @param signature GitHub signature header
 * @param secret Webhook secret
 * @returns Whether verification passed
 */
function verifyGitHubSignature(
  payload: Buffer,
  signature: string,
  secret: string
): boolean {
  if (!signature) {
    console.log("[Verification Failed] Missing X-Hub-Signature-256 header");
    return false;
  }

  // Calculate expected signature
  const expectedSignature =
    "sha256=" +
    crypto.createHmac("sha256", secret).update(payload).digest("hex");

  // Use secure comparison method
  const isValid = crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );

  if (!isValid) {
    console.log("[Verification Failed] Signature mismatch");
    console.log("Expected signature:", expectedSignature);
    console.log("Received signature:", signature);
  }

  return isValid;
}

app.post("/github/webhook", async (req, res) => {
  const signature = req.headers["x-hub-signature-256"] as string;
  const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET;

  console.log("\n=== GitHub Webhook Request Details ===");

  // Print request headers
  console.log("[Request Headers]");
  Object.entries(req.headers).forEach(([key, value]) => {
    console.log(`  ${key}: ${value}`);
  });

  // Verify webhook secret is configured
  if (!webhookSecret) {
    console.log(
      "[Error] Environment variable GITHUB_WEBHOOK_SECRET is not set"
    );
    return res.status(500).send("Server configuration error");
  }

  // Verify signature
  const payload = req.body as Buffer;
  if (!verifyGitHubSignature(payload, signature, webhookSecret)) {
    console.log("[Error] Webhook signature verification failed");
    return res.status(403).send("Unauthorized request");
  }

  console.log("[✓] Webhook signature verification passed");

  // Parse and print request body
  try {
    const jsonPayload = JSON.parse(payload.toString());

    console.log("[Event Type]", req.headers["x-github-event"]);
    console.log("[Delivery ID]", req.headers["x-github-delivery"]);
    console.log("[Hook ID]", req.headers["x-github-hook-id"]);
    console.log(
      "[Hook Installation Target ID]",
      req.headers["x-github-hook-installation-target-id"]
    );
    console.log(
      "[Hook Installation Target Type]",
      req.headers["x-github-hook-installation-target-type"]
    );

    console.log("[Complete Request Body]");
    console.log(JSON.stringify(jsonPayload, null, 2));

    // Handle different event types
    const eventType = req.headers["x-github-event"];
    switch (eventType) {
      case "push":
        console.log(`[Push Event] Pushed to ${jsonPayload.ref} branch`);
        console.log(
          `[Commit Count] ${jsonPayload.commits?.length || 0} commits`
        );
        break;
      case "pull_request":
        console.log(
          `[PR Event] ${jsonPayload.action} - #${jsonPayload.number}`
        );
        console.log(`[PR Title] ${jsonPayload.pull_request?.title}`);
        break;
      case "issues":
        console.log(
          `[Issue Event] ${jsonPayload.action} - #${jsonPayload.issue?.number}`
        );
        console.log(`[Issue Title] ${jsonPayload.issue?.title}`);
        break;
      case "installation":
        console.log(
          `[Installation Event] ${jsonPayload.action} - ID: ${jsonPayload.installation?.id}`
        );
        console.log(
          `[Target] ${jsonPayload.installation?.target_type}: ${jsonPayload.installation?.account?.login}`
        );

        // If it's an installation creation event, save to database
        if (jsonPayload.action === "created") {
          try {
            const result = await saveInstallation(jsonPayload);
            if (result.success) {
              console.log(
                `[✓] Installation info saved to database:`,
                result.data
              );
            } else {
              console.error(
                `[✗] Failed to save installation info:`,
                result.error
              );
            }
          } catch (error) {
            console.error(
              `[✗] Error occurred while saving installation info:`,
              error
            );
          }
        }
        break;
      default:
        console.log(`[${eventType} Event] Received`);
    }
  } catch (error) {
    console.log("[Error] Failed to parse request body:", error);
    return res.status(400).send("Invalid request body format");
  }

  console.log("=== Webhook Processing Complete ===\n");
  res.status(200).send("Webhook processed successfully");
});

const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
  console.log(`📡 Webhook endpoint: http://localhost:${port}/github/webhook`);
  console.log(`🔑 Make sure to set GITHUB_WEBHOOK_SECRET environment variable`);
});
