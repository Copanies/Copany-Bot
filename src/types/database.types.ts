export interface CopanyBotInstallation {
  id: string;
  created_at: string;
  github_user_id?: string | null;
  installation_id?: string | null;
  target_type?: number | null;
  target_login?: string | null;
  repository_ids?: string[] | null;
}
