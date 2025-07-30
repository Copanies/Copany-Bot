import { Request, Response } from "express";
import crypto from "crypto";
import {
  handlePushEvent,
  handlePullRequestEvent,
  handleIssuesEvent,
  handleInstallationEvent,
  handleInstallationRepositoriesEvent,
} from "./handlers/index.js";
import { WebhookContext } from "./types.js";

/**
 * Verify GitHub webhook signature
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

  const expectedSignature =
    "sha256=" +
    crypto.createHmac("sha256", secret).update(payload).digest("hex");

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

/**
 * Main webhook handler
 */
export async function handleWebhook(req: Request, res: Response) {
  const signature = req.headers["x-hub-signature-256"] as string;
  const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET;

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

  try {
    const jsonPayload = JSON.parse(payload.toString());
    const eventType = req.headers["x-github-event"] as string;

    const context: WebhookContext = {
      req,
      res,
      payload: jsonPayload,
      eventType,
    };

    // Handle different event types
    switch (eventType) {
      case "push":
        await handlePushEvent(context);
        break;
      case "pull_request":
        await handlePullRequestEvent(context);
        break;
      case "issues":
        await handleIssuesEvent(context);
        break;
      case "installation":
        await handleInstallationEvent(context);
        break;
      case "installation_repositories":
        await handleInstallationRepositoriesEvent(context);
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
}
