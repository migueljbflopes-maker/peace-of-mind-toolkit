import { createClient } from '@supabase/supabase-js';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create client with user's token to verify they're logged in
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get the current user
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user is admin using service role
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);
    
    const { data: adminRole, error: roleError } = await serviceClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (roleError || !adminRole) {
      console.log('Admin check failed:', { roleError, adminRole, userId: user.id });
      return new Response(
        JSON.stringify({ error: 'Forbidden - Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body once
    const body = await req.json();
    const { action, user_id, email, password, make_premium } = body;
    console.log('Admin action:', { action, user_id, adminId: user.id });

    switch (action) {
      case 'list_users': {
        // Get all users from auth
        const { data: { users }, error: listError } = await serviceClient.auth.admin.listUsers();
        if (listError) throw listError;

        return new Response(
          JSON.stringify({ users: users.map(u => ({ id: u.id, email: u.email })) }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'upgrade_premium': {
        if (!user_id) throw new Error('user_id required');

        // Upsert premium entitlement
        const { error: upsertError } = await serviceClient
          .from('premium_entitlements')
          .upsert({
            user_id,
            is_premium: true,
            granted_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }, { onConflict: 'user_id' });

        if (upsertError) throw upsertError;

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'revoke_premium': {
        if (!user_id) throw new Error('user_id required');

        // Update premium entitlement
        const { error: updateError } = await serviceClient
          .from('premium_entitlements')
          .update({
            is_premium: false,
            revoked_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', user_id);

        if (updateError) throw updateError;

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'delete_user': {
        if (!user_id) throw new Error('user_id required');

        // Delete from public tables first
        const tablesToClear = [
          'premium_entitlements',
          'risk_assessments',
          'supplies_plans',
          'vault_items',
          'plan_items',
          'backups',
          'exports',
          'bookmarks',
          'alert_preferences',
          'user_profiles',
          'onboarding_state',
          'ai_jobs',
          'panic_contacts',
          'panic_scenarios',
          'panic_activations',
          'checkin_sessions',
          'user_devices',
          'sync_cursors',
          'expert_questions',
          'user_roles',
        ];

        for (const table of tablesToClear) {
          await serviceClient.from(table).delete().eq('user_id', user_id);
        }

        // Delete the auth user
        const { error: deleteError } = await serviceClient.auth.admin.deleteUser(user_id);
        if (deleteError) throw deleteError;

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'create_test_user': {
        if (!email || !password) {
          throw new Error('email and password required');
        }

        console.log('Creating test user:', { email, make_premium });

        // Create user via admin API with auto-confirm
        const { data: newUserData, error: createError } = await serviceClient.auth.admin.createUser({
          email,
          password,
          email_confirm: true, // Auto-confirm email
        });

        if (createError) {
          console.error('Error creating user:', createError);
          throw createError;
        }

        const newUserId = newUserData.user.id;
        console.log('User created:', newUserId);

        // Create user profile
        const { error: profileError } = await serviceClient
          .from('user_profiles')
          .insert({
            user_id: newUserId,
            locale: 'en',
          });

        if (profileError) {
          console.error('Error creating profile:', profileError);
          // Don't throw - profile creation is not critical
        }

        // If premium requested, add entitlement
        if (make_premium) {
          const { error: premiumError } = await serviceClient
            .from('premium_entitlements')
            .insert({
              user_id: newUserId,
              is_premium: true,
              plan_name: 'Test Premium',
              price_eur: 0,
              granted_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });

          if (premiumError) {
            console.error('Error granting premium:', premiumError);
            throw premiumError;
          }
          console.log('Premium granted to user:', newUserId);
        }

        return new Response(
          JSON.stringify({ 
            success: true, 
            user_id: newUserId,
            email,
            is_premium: make_premium || false
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: `Unknown action: ${action}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Admin function error:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
