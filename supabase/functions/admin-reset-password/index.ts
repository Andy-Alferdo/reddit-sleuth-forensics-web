import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Verify admin status
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const token = authHeader.replace('Bearer ', '');
    const { data: { user: adminUser }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !adminUser) {
      throw new Error('Invalid authentication');
    }

    // Check if user is admin
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', adminUser.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (roleError || !roleData) {
      throw new Error('Unauthorized: Admin access required');
    }

    const { userId, newPassword } = await req.json();

    if (!userId || !newPassword) {
      throw new Error('userId and newPassword are required');
    }

    if (newPassword.length < 8) {
      throw new Error('Password must be at least 8 characters');
    }

    // Reset password using admin API
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: newPassword,
    });

    if (error) throw error;

    // Log the action
    await supabaseAdmin.rpc('log_audit_event', {
      p_user_id: adminUser.id,
      p_action_type: 'password_reset',
      p_resource_type: 'user',
      p_resource_id: userId,
      p_details: { admin_initiated: true, target_user_id: userId },
    });

    console.log(`[admin-reset-password] Password reset for user ${userId} by admin ${adminUser.id}`);

    return new Response(
      JSON.stringify({ success: true, message: 'Password reset successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('[admin-reset-password] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});