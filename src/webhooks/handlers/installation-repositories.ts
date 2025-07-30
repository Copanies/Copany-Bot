import { WebhookHandler } from "../types.js";
import {
  addedRepositoriesForInstallation,
  removedRepositoriesForInstallation,
} from "../../supabase.js";

export const handleInstallationRepositoriesEvent: WebhookHandler = async ({
  payload,
}) => {
  console.log("installation_repositories event");

  const installationId = payload.installation?.id?.toString();
  if (!installationId) {
    console.error(`[✗] Missing installation ID`);
    return;
  }

  if (
    payload.action === "added" &&
    Array.isArray(payload.repositories_added) &&
    payload.repositories_added.length > 0
  ) {
    console.log("added repositories");
    try {
      const addedRepoIds = payload.repositories_added.map((repo) =>
        repo.id.toString()
      );
      const result = await addedRepositoriesForInstallation(
        installationId,
        addedRepoIds
      );
      if (!result) {
        console.error(`[✗] Failed to add repositories`);
      }
    } catch (error) {
      console.error(`[✗] Error occurred while adding repositories:`, error);
    }
  } else if (
    payload.action === "removed" &&
    Array.isArray(payload.repositories_removed) &&
    payload.repositories_removed.length > 0
  ) {
    console.log("removed repositories");
    try {
      const removedRepoIds = payload.repositories_removed.map((repo) =>
        repo.id.toString()
      );
      const result = await removedRepositoriesForInstallation(
        installationId,
        removedRepoIds
      );
      if (!result) {
        console.error(`[✗] Failed to remove repositories`);
      }
    } catch (error) {
      console.error(`[✗] Error occurred while removing repositories:`, error);
    }
  }
};
