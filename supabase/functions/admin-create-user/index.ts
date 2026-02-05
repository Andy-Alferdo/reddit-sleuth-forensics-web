import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

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

    const { email, password, fullName, role } = await req.json();

    if (!email || !password) {
      throw new Error('Email and password are required');
    }

    if (password.length < 8) {
      throw new Error('Password must be at least 8 characters');
    }

    // Check if user already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const userExists = existingUsers?.users?.some(u => u.email === email);
    
    if (userExists) {
      throw new Error('A user with this email already exists');
    }

    // Create the user using admin API
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
      user_metadata: { full_name: fullName || '' },
    });

    if (createError) throw createError;

    if (!newUser.user) {
      throw new Error('Failed to create user');
    }

    // The handle_new_user trigger will create the profile and default role
    // If a different role is specified, update it
    if (role && role !== 'user') {
      // Wait a moment for the trigger to complete
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Update the role
      await supabaseAdmin
        .from('user_roles')
        .update({ role })
        .eq('user_id', newUser.user.id);
    }

    // Log the action
    await supabaseAdmin.rpc('log_audit_event', {
      p_user_id: adminUser.id,
      p_action_type: 'user_create',
      p_resource_type: 'user',
      p_resource_id: newUser.user.id,
      p_details: { email, role: role || 'user', created_by_admin: true },
    });

    console.log(`[admin-create-user] User ${email} created by admin ${adminUser.id}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'User created successfully',
        user: { id: newUser.user.id, email: newUser.user.email }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('[admin-create-user] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
