import { supabase } from '@/integrations/supabase/client';

type ActionType = 
  | 'case_create' | 'case_view' | 'case_update' | 'case_delete' | 'case_lock' | 'case_unlock'
  | 'user_profile_view' | 'user_profile_analyze'
  | 'monitoring_start' | 'monitoring_stop'
  | 'analysis_run' | 'analysis_view'
  | 'report_generate' | 'report_view' | 'report_download'
  | 'login' | 'logout'
  | 'user_create' | 'password_reset' | 'role_change'
  | 'scrape_reddit';

type ResourceType = 
  | 'case' | 'user_profile' | 'monitoring_session' 
  | 'analysis' | 'report' | 'user' | 'invite' | 'reddit_data';

interface AuditLogParams {
  actionType: ActionType;
  resourceType: ResourceType;
  resourceId?: string;
  details?: Record<string, any>;
}

export const useAuditLog = () => {
  const logAction = async ({ actionType, resourceType, resourceId, details }: AuditLogParams) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.warn('[AuditLog] No user found, skipping audit log');
        return;
      }

      const { error } = await supabase.rpc('log_audit_event', {
        p_user_id: user.id,
        p_action_type: actionType,
        p_resource_type: resourceType,
        p_resource_id: resourceId || null,
        p_details: details || null,
      });

      if (error) {
        console.error('[AuditLog] Failed to log action:', error);
      } else {
        console.log(`[AuditLog] Logged: ${actionType} on ${resourceType}`);
      }
    } catch (err) {
      console.error('[AuditLog] Error:', err);
    }
  };

  return { logAction };
};

export type { ActionType, ResourceType, AuditLogParams };