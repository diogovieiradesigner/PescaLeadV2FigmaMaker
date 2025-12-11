import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface CreateUserRequest {
  email: string;
  password: string;
  name: string;
  phone?: string;
  make_super_admin?: boolean;
  workspace_id?: string;
  workspace_role?: 'owner' | 'admin' | 'member' | 'viewer';
}

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verificar autenticacao
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Criar cliente com service role para operacoes admin
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Verificar se o usuario que esta chamando e super admin
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
        JSON.stringify({ error: 'Only super admins can create users' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Ler dados do request
    const body: CreateUserRequest = await req.json();
    const { email, password, name, phone, make_super_admin, workspace_id, workspace_role } = body;

    // Validar campos obrigatorios
    if (!email || !password || !name) {
      return new Response(
        JSON.stringify({ error: 'Email, password and name are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[ADMIN-CREATE-USER] Creating user: ${email}`);

    // 1. Criar usuario no auth.users
    const { data: authData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name }
    });

    if (createError) {
      console.error('[ADMIN-CREATE-USER] Auth error:', createError);
      return new Response(
        JSON.stringify({ error: createError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const newUserId = authData.user.id;
    console.log(`[ADMIN-CREATE-USER] Auth user created: ${newUserId}`);

    // 2. Atualizar dados extras na tabela users (trigger ja criou o registro basico)
    if (phone) {
      await supabaseAdmin
        .from('users')
        .update({ phone })
        .eq('id', newUserId);
    }

    // 3. Se especificou workspace, adicionar como membro
    if (workspace_id) {
      const { error: memberError } = await supabaseAdmin
        .from('workspace_members')
        .insert({
          workspace_id,
          user_id: newUserId,
          role: workspace_role || 'member',
          invited_by: caller.id
        });

      if (memberError) {
        console.error('[ADMIN-CREATE-USER] Member error:', memberError);
      } else {
        console.log(`[ADMIN-CREATE-USER] Added to workspace: ${workspace_id}`);
      }
    }

    // 4. Se solicitado, tornar super admin
    if (make_super_admin) {
      const { error: saError } = await supabaseAdmin
        .from('super_admins')
        .insert({
          user_id: newUserId,
          is_active: true,
          created_by: caller.id,
          notes: `Criado via painel admin por ${caller.email}`
        });

      if (saError) {
        console.error('[ADMIN-CREATE-USER] Super admin error:', saError);
      } else {
        console.log(`[ADMIN-CREATE-USER] Made super admin`);
      }
    }

    // 5. Buscar usuario completo para retornar
    const { data: newUser } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', newUserId)
      .single();

    console.log(`[ADMIN-CREATE-USER] Success: ${email}`);

    return new Response(
      JSON.stringify({
        success: true,
        user: newUser,
        message: 'User created successfully'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[ADMIN-CREATE-USER] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});