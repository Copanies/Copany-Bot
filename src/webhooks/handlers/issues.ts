import { WebhookHandler } from "../types.js";

export const handleIssuesEvent: WebhookHandler = async ({ payload }) => {
  console.log("issues event");
  console.log(`[Issue Event] ${payload.action} - #${payload.issue?.number}`);
  console.log(`[Issue Title] ${payload.issue?.title}`);
};
