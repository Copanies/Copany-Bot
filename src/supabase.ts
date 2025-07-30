import { createClient } from "@supabase/supabase-js";
import { CopanyBotInstallation } from "./types/database.types.js";

// Create a function to get Supabase client with lazy initialization
let supabaseClient: ReturnType<typeof createClient> | null = null;

function getSupabaseClient() {
  if (!supabaseClient) {
    // Get Supabase configuration from environment variables
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error(
        "Missing Supabase environment variables: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY"
      );
    }

    // Create Supabase client
    supabaseClient = createClient(supabaseUrl, supabaseKey);
  }

  return supabaseClient;
}

// Export a getter function for the supabase client
export function getSupabase() {
  return getSupabaseClient();
}

/**
 * Save GitHub App installation information to database
 * @param installationData Installation data from webhook
 * @returns Save result
 */
export async function saveInstallation(
  installationData: any
): Promise<{ success: boolean; error?: string; data?: CopanyBotInstallation }> {
  try {
    // Convert target_type string to number
    const getTargetTypeNumber = (targetType: string): number => {
      switch (targetType.toLowerCase()) {
        case "organization":
          return 1;
        case "user":
          return 0;
        default:
          return 1; // Default to organization
      }
    };

    // Construct data to insert
    const installationRecord: Omit<CopanyBotInstallation, "id" | "created_at"> =
      {
        github_user_id: installationData.sender?.id?.toString() || null,
        installation_id: installationData.installation?.id?.toString() || null,
        target_type: getTargetTypeNumber(
          installationData.installation?.target_type || "organization"
        ),
        target_login: installationData.installation?.account?.login || null,
        repository_ids: installationData.repositories.map((repo: any) =>
          repo.id.toString()
        ),
      };

    console.log(
      "[Supabase] Preparing to save installation:",
      installationRecord
    );

    // Insert data into database
    const { data, error } = await getSupabase()
      .from("copany_bot_installation")
      .insert(installationRecord)
      .select()
      .single();

    if (error) {
      console.error("[Supabase] Save failed:", error);
      return { success: false, error: error.message };
    }

    // 更新相关的 copany 记录
    await updateCopanyGithubConnection(installationRecord.repository_ids || []);

    console.log("[Supabase] Save successful:", data);
    return { success: true, data: data as unknown as CopanyBotInstallation };
  } catch (error) {
    console.error("[Supabase] Error occurred during save:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Query installation record by installation_id
 * @param installationId GitHub installation ID
 * @returns Query result
 */
export async function getInstallationById(
  installationId: string
): Promise<CopanyBotInstallation | null> {
  try {
    const { data, error } = await getSupabase()
      .from("copany_bot_installation")
      .select("*")
      .eq("installation_id", installationId)
      .single();

    if (error) {
      console.error("[Supabase] Query failed:", error);
      return null;
    }

    return data as unknown as CopanyBotInstallation;
  } catch (error) {
    console.error("[Supabase] Error occurred during query:", error);
    return null;
  }
}

/**
 * Delete installation record by installation_id
 * @param installationId GitHub installation ID
 */
export async function deleteInstallation(installationId: string) {
  try {
    // 先获取要删除的安装记录，以便更新相关的 copany 记录
    const installation = await getInstallationById(installationId);
    if (!installation) {
      console.error("[Supabase] Installation not found:", installationId);
      return;
    }

    const { error } = await getSupabase()
      .from("copany_bot_installation")
      .delete()
      .eq("installation_id", installationId);

    if (error) {
      console.error("[Supabase] Delete failed:", error);
      return;
    }

    // 更新相关的 copany 记录
    if (installation.repository_ids) {
      await updateCopanyGithubConnection(installation.repository_ids);
    }
  } catch (error) {
    console.error("[Supabase] Error occurred during deletion:", error);
  }
}

/**
 * Delete repositories from installation record by installation_id
 * @param installationId GitHub installation ID
 * @param removedRepositories Array of repository IDs to delete
 * @returns Updated installation record or null if operation fails
 */
export async function removedRepositoriesForInstallation(
  installationId: string,
  removedRepositories: string[]
): Promise<CopanyBotInstallation | null> {
  const installation = await getInstallationById(installationId);

  if (!installation) {
    return null;
  }

  try {
    const repositoryIds = installation.repository_ids || [];

    const newRepositoryIds = repositoryIds.filter(
      (id) => !removedRepositories.includes(id)
    );
    const { data, error } = await getSupabase()
      .from("copany_bot_installation")
      .update({ repository_ids: newRepositoryIds })
      .eq("installation_id", installationId)
      .select()
      .single();

    if (error) {
      return null;
    }

    // 更新相关的 copany 记录
    await updateCopanyGithubConnection(removedRepositories);

    return data as unknown as CopanyBotInstallation;
  } catch (error) {
    console.error(
      "[Debug] Error details:",
      error instanceof Error ? error : String(error)
    );
    return null;
  }
}

/**
 * Add repositories to installation record by installation_id
 * @param installationId GitHub installation ID
 * @param addedRepositories Array of repository IDs to add
 * @returns Updated installation record or null if operation fails
 */
export async function addedRepositoriesForInstallation(
  installationId: string,
  addedRepositories: string[]
): Promise<CopanyBotInstallation | null> {
  const installation = await getInstallationById(installationId);

  if (!installation) {
    console.log(`[Debug] Installation ${installationId} not found`);
    return null;
  }

  try {
    const repositoryIds = installation.repository_ids;

    const newRepositoryIds = Array.from(
      new Set([...(repositoryIds || []), ...addedRepositories])
    );

    const { data, error } = await getSupabase()
      .from("copany_bot_installation")
      .update({ repository_ids: newRepositoryIds })
      .eq("installation_id", installationId)
      .select()
      .single();

    if (error) {
      console.error("[Debug] Update failed with error:", error);
      return null;
    }

    // 更新相关的 copany 记录
    await updateCopanyGithubConnection(addedRepositories);

    return data as unknown as CopanyBotInstallation;
  } catch (error) {
    console.error(
      "[Debug] Error details:",
      error instanceof Error ? error : String(error)
    );
    return null;
  }
}

/**
 * 更新 copany 表中记录的 GitHub 连接状态
 * @param repositoryIds 需要检查的仓库 ID 数组
 */
async function updateCopanyGithubConnection(repositoryIds: string[]) {
  try {
    console.log(
      `[Debug] updateCopanyGithubConnection called with repositoryIds:`,
      repositoryIds
    );
    // 1. 获取所有受影响的 copany 记录
    const { data: copanyRecords, error: queryError } = await getSupabase()
      .from("copany")
      .select("id, github_repository_id")
      .in("github_repository_id", repositoryIds);

    if (queryError) {
      console.error("[Supabase] Failed to query copany records:", queryError);
      return;
    }

    console.log(
      `[Debug] Fetched copany records:`,
      copanyRecords?.map((r) => ({
        id: r.id,
        github_repository_id: r.github_repository_id,
      }))
    );

    // 2. 对于每个受影响的 copany，检查是否在任何安装中
    for (const record of copanyRecords || []) {
      console.log(
        `[Debug] Checking installations for copany id=${record.id}, github_repository_id=${record.github_repository_id}`
      );
      const { data: installations, error: installationError } =
        await getSupabase()
          .from("copany_bot_installation")
          .select("repository_ids")
          .contains("repository_ids", [record.github_repository_id]);

      if (installationError) {
        console.error(
          "[Supabase] Failed to check installations:",
          installationError
        );
        continue;
      }

      console.log(
        `[Debug] Found ${
          installations?.length || 0
        } installations for copany id=${record.id}`
      );

      // 3. 更新 is_connected_github 状态
      const isConnected = (installations?.length || 0) > 0;
      const { error: updateError } = await getSupabase()
        .from("copany")
        .update({ is_connected_github: isConnected })
        .eq("id", record.id as string);

      if (updateError) {
        console.error(
          "[Supabase] Failed to update copany record:",
          updateError
        );
      } else {
        console.log(
          `[Debug] Updated copany id=${record.id} is_connected_github=${isConnected}`
        );
      }
    }
    console.log("[Debug] updateCopanyGithubConnection finished");
  } catch (error) {
    console.error("[Supabase] Error in updateCopanyGithubConnection:", error);
  }
}
