import { WebhookHandler } from "../types.js";

export const handlePushEvent: WebhookHandler = async ({ payload }) => {
  console.log("push event");
  console.log(`[Push Event] Pushed to ${payload.ref} branch`);
  console.log(`[Commit Count] ${payload.commits?.length || 0} commits`);
};
