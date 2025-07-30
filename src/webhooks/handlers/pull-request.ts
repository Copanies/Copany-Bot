import { WebhookHandler } from "../types.js";

export const handlePullRequestEvent: WebhookHandler = async ({ payload }) => {
  console.log("pull_request event");
  console.log(`[PR Event] ${payload.action} - #${payload.number}`);
  console.log(`[PR Title] ${payload.pull_request?.title}`);
};
