import { WebhookHandler } from "../types.js";
import { saveInstallation, deleteInstallation } from "../../supabase.js";

export const handleInstallationEvent: WebhookHandler = async ({ payload }) => {
  console.log("installation event");
  console.log(
    `[Installation Event] ${payload.action} - ID: ${payload.installation?.id}`
  );
  console.log(
    `[Target] ${payload.installation?.target_type}: ${payload.installation?.account?.login}`
  );

  if (payload.action === "created") {
    try {
      const result = await saveInstallation(payload);
      if (!result.success) {
        console.error(`[✗] Failed to save installation info:`, result.error);
      }
    } catch (error) {
      console.error(
        `[✗] Error occurred while saving installation info:`,
        error
      );
    }
  } else if (payload.action === "deleted") {
    try {
      const installationId = payload.installation?.id?.toString();
      if (!installationId) {
        console.error(`[✗] Missing installation ID`);
        return;
      }
      await deleteInstallation(installationId);
    } catch (error) {
      console.error(`[✗] Error occurred while deleting installation:`, error);
    }
  }
};
