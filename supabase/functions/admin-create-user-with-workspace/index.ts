import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface CreateUserWithWorkspaceRequest {
  email: string;
  password: string;
  name: string;
  phone?: string;
  workspace_name: string;
  workspace_slug?: string;
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Token nao fornecido' }),
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
        JSON.stringify({ success: false, error: 'Token invalido' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: isSuperAdmin } = await supabaseAdmin.rpc('is_super_admin', {
      check_user_id: caller.id
    });

    if (!isSuperAdmin) {
      return new Response(
        JSON.stringify({ success: false, error: 'Apenas super admins podem usar esta funcao' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: CreateUserWithWorkspaceRequest = await req.json();
    const { email, password, name, phone, workspace_name, workspace_slug } = body;

    if (!email || !password || !name || !workspace_name) {
      return new Response(
        JSON.stringify({ success: false, error: 'Campos obrigatorios: email, password, name, workspace_name' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (password.length < 6) {
      return new Response(
        JSON.stringify({ success: false, error: 'Senha deve ter no minimo 6 caracteres' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[ADMIN] Iniciando: ${email} / ${workspace_name}`);

    // Verificar se email ja existe
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase())
      .single();

    if (existingUser) {
      return new Response(
        JSON.stringify({ success: false, error: 'Este e-mail ja esta cadastrado' }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Gerar slug unico
    let finalSlug = workspace_slug || generateSlug(workspace_name);
    let slugSuffix = 0;
    let slugExists = true;
    
    while (slugExists) {
      const checkSlug = slugSuffix === 0 ? finalSlug : `${finalSlug}-${slugSuffix}`;
      const { data: existing } = await supabaseAdmin
        .from('workspaces')
        .select('id')
        .eq('slug', checkSlug)
        .single();
      
      if (!existing) {
        finalSlug = checkSlug;
        slugExists = false;
      } else {
        slugSuffix++;
      }
    }

    // 1. Criar usuario no Auth
    const { data: authData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: email.toLowerCase(),
      password,
      email_confirm: true,
      user_metadata: { name, phone }
    });

    if (createError) {
      console.error('[ADMIN] Auth error:', createError);
      return new Response(
        JSON.stringify({ success: false, error: `Erro ao criar usuario: ${createError.message}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const newUserId = authData.user.id;
    console.log(`[ADMIN] Usuario criado: ${newUserId}`);

    // Aguardar trigger criar perfil
    await new Promise(resolve => setTimeout(resolve, 800));

    // 2. Atualizar telefone se fornecido
    if (phone) {
      await supabaseAdmin
        .from('users')
        .update({ phone })
        .eq('id', newUserId);
    }

    // 3. Criar workspace
    const { data: workspace, error: wsError } = await supabaseAdmin
      .from('workspaces')
      .insert({
        name: workspace_name,
        slug: finalSlug,
        owner_id: newUserId,
        settings: {
          created_by_admin: true,
          created_by: caller.id,
          created_at: new Date().toISOString()
        }
      })
      .select()
      .single();

    if (wsError) {
      console.error('[ADMIN] Workspace error:', wsError);
      await supabaseAdmin.auth.admin.deleteUser(newUserId);
      return new Response(
        JSON.stringify({ success: false, error: `Erro ao criar workspace: ${wsError.message}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[ADMIN] Workspace criado: ${workspace.id}`);

    // 4. Adicionar usuario como owner
    const { error: memberError } = await supabaseAdmin
      .from('workspace_members')
      .insert({
        workspace_id: workspace.id,
        user_id: newUserId,
        role: 'owner',
        invited_by: caller.id
      });

    if (memberError) {
      console.error('[ADMIN] Member error:', memberError);
    }

    // 5. Adicionar na lookup table (ignorar erro se ja existir)
    try {
      await supabaseAdmin
        .from('workspace_membership_lookup')
        .insert({
          workspace_id: workspace.id,
          user_id: newUserId
        });
    } catch (e) {
      console.log('[ADMIN] Lookup insert skipped');
    }

    // 6. Atualizar last_workspace_id
    await supabaseAdmin
      .from('users')
      .update({ last_workspace_id: workspace.id })
      .eq('id', newUserId);

    // 7. Criar funil padrao
    const { data: defaultFunnel } = await supabaseAdmin
      .from('funnels')
      .insert({
        workspace_id: workspace.id,
        name: 'Funil Principal',
        description: 'Funil padrao criado automaticamente',
        is_active: true,
        position: 0,
        created_by: newUserId
      })
      .select()
      .single();

    if (defaultFunnel) {
      const defaultColumns = [
        { title: 'Novos Leads', position: 0, color: '#3B82F6' },
        { title: 'Em Contato', position: 1, color: '#F59E0B' },
        { title: 'Proposta Enviada', position: 2, color: '#8B5CF6' },
        { title: 'Negociacao', position: 3, color: '#EC4899' },
        { title: 'Fechado', position: 4, color: '#10B981' }
      ];

      await supabaseAdmin
        .from('funnel_columns')
        .insert(defaultColumns.map(col => ({
          funnel_id: defaultFunnel.id,
          ...col
        })));
    }

    console.log(`[ADMIN] Sucesso: ${email} / ${workspace_name}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Conta e workspace criados com sucesso!',
        user: {
          id: newUserId,
          email: email.toLowerCase(),
          name,
          phone: phone || null
        },
        workspace: {
          id: workspace.id,
          name: workspace_name,
          slug: finalSlug
        },
        credentials: {
          email: email.toLowerCase(),
          password: password,
          login_url: 'https://hub.pescalead.com.br/login'
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[ADMIN] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});