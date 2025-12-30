import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getAdminCorsHeaders } from '../_shared/cors.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface DeleteUserRequest {
  user_id: string;
  hard_delete?: boolean;
}

Deno.serve(async (req) => {
  const corsHeaders = getAdminCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const token = authHeader.replace('Bearer ', '');
    const { data: { user: caller }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !caller) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verificar se e super admin
    const { data: isSuperAdmin } = await supabaseAdmin.rpc('is_super_admin', {
      check_user_id: caller.id
    });

    if (!isSuperAdmin) {
      return new Response(
        JSON.stringify({ error: 'Only super admins can delete users' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: DeleteUserRequest = await req.json();
    const { user_id, hard_delete = false } = body;

    if (!user_id) {
      return new Response(
        JSON.stringify({ error: 'user_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Nao permitir deletar a si mesmo
    if (user_id === caller.id) {
      return new Response(
        JSON.stringify({ error: 'Cannot delete yourself' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[ADMIN-DELETE-USER] Deleting user: ${user_id}, hard_delete: ${hard_delete}`);

    // Buscar info do usuario antes de deletar
    const { data: userToDelete } = await supabaseAdmin
      .from('users')
      .select('email, name')
      .eq('id', user_id)
      .single();

    if (!userToDelete) {
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (hard_delete) {
      // 1. Remover de super_admins
      await supabaseAdmin
        .from('super_admins')
        .delete()
        .eq('user_id', user_id);

      // 2. Remover de workspace_members
      await supabaseAdmin
        .from('workspace_members')
        .delete()
        .eq('user_id', user_id);

      // 3. Remover de users
      await supabaseAdmin
        .from('users')
        .delete()
        .eq('id', user_id);

      // 4. Remover de auth.users
      const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(user_id);

      if (authDeleteError) {
        console.error('[ADMIN-DELETE-USER] Auth delete error:', authDeleteError);
        return new Response(
          JSON.stringify({ error: authDeleteError.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`[ADMIN-DELETE-USER] Hard deleted user`);
    } else {
      // Soft delete - apenas desativar super admin se existir
      await supabaseAdmin
        .from('super_admins')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('user_id', user_id);

      console.log(`[ADMIN-DELETE-USER] Soft deleted user`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: hard_delete ? 'User permanently deleted' : 'User deactivated',
        deleted_user: userToDelete
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[ADMIN-DELETE-USER] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});