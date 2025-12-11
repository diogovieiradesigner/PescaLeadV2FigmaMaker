import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface FunnelColumn {
  title: string;
  color: string;
}

interface FunnelTemplate {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  columns: FunnelColumn[];
}

interface UserInput {
  name: string;
  email: string;
  password: string;
  phone?: string;
  role?: 'owner' | 'admin' | 'member' | 'viewer';
}

interface CreateWorkspaceWithUsersRequest {
  workspace_name: string;
  workspace_slug?: string;
  users: UserInput[];
  funnels?: string[];  // Opcional - se nao passar, nao cria nenhum funil
}

interface UserResult {
  email: string;
  name: string;
  role: string;
  success: boolean;
  error?: string;
  user_id?: string;
}

interface FunnelResult {
  template: string;
  name: string;
  success: boolean;
  columns_count: number;
  funnel_id?: string;
  error?: string;
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
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  // GET - Listar templates disponíveis
  if (req.method === 'GET') {
    const { data: templates, error } = await supabaseAdmin
      .from('funnel_templates')
      .select('id, name, slug, description, icon, columns')
      .eq('is_active', true)
      .order('position');

    if (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const formattedTemplates = templates.map(t => ({
      id: t.slug,
      name: t.name,
      description: t.description,
      icon: t.icon,
      columns_count: (t.columns as FunnelColumn[]).length,
      columns: (t.columns as FunnelColumn[]).map(c => c.title)
    }));
    
    return new Response(
      JSON.stringify({ templates: formattedTemplates }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const results: UserResult[] = [];
  const funnelResults: FunnelResult[] = [];

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Token nao fornecido' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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

    const body: CreateWorkspaceWithUsersRequest = await req.json();
    const { workspace_name, workspace_slug, users, funnels } = body;

    if (!workspace_name) {
      return new Response(
        JSON.stringify({ success: false, error: 'workspace_name e obrigatorio' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!users || users.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'Pelo menos um usuario e obrigatorio' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Buscar templates do banco APENAS se funnels foi passado
    let dbTemplates: any[] = [];
    if (funnels && funnels.length > 0) {
      const { data: templates, error: templatesError } = await supabaseAdmin
        .from('funnel_templates')
        .select('*')
        .eq('is_active', true)
        .in('slug', funnels);

      if (templatesError) {
        return new Response(
          JSON.stringify({ success: false, error: `Erro ao buscar templates: ${templatesError.message}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      dbTemplates = templates || [];

      // Validar se todos os templates existem
      const foundSlugs = dbTemplates.map(t => t.slug);
      const missingSlugs = funnels.filter(f => !foundSlugs.includes(f));
      if (missingSlugs.length > 0) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `Templates nao encontrados: ${missingSlugs.join(', ')}` 
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    const validRoles = ['owner', 'admin', 'member', 'viewer'];
    const hasOwner = users.some(u => u.role === 'owner');
    if (!hasOwner) {
      users[0].role = 'owner';
    }

    for (let i = 0; i < users.length; i++) {
      const u = users[i];
      if (!u.email || !u.password || !u.name) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `Usuario ${i + 1}: email, password e name sao obrigatorios` 
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (u.password.length < 6) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `Usuario ${i + 1} (${u.email}): senha deve ter no minimo 6 caracteres` 
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (u.role && !validRoles.includes(u.role)) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `Usuario ${i + 1}: role invalido. Use: owner, admin, member, viewer` 
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (!u.role) {
        u.role = 'member';
      }
    }

    const emails = users.map(u => u.email.toLowerCase());
    const uniqueEmails = new Set(emails);
    if (uniqueEmails.size !== emails.length) {
      return new Response(
        JSON.stringify({ success: false, error: 'Existem emails duplicados na lista' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: existingUsers } = await supabaseAdmin
      .from('users')
      .select('email')
      .in('email', emails);

    if (existingUsers && existingUsers.length > 0) {
      const existingEmails = existingUsers.map(u => u.email).join(', ');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Emails ja cadastrados: ${existingEmails}` 
        }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[ADMIN-BATCH] Iniciando: ${workspace_name} com ${users.length} usuarios e ${funnels?.length || 0} funis`);

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

    const createdUsers: { id: string; email: string; role: string; index: number }[] = [];

    for (let i = 0; i < users.length; i++) {
      const u = users[i];
      const role = u.role || 'member';
      
      try {
        const { data: authData, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email: u.email.toLowerCase(),
          password: u.password,
          email_confirm: true,
          user_metadata: { name: u.name, phone: u.phone }
        });

        if (createError) {
          results.push({
            email: u.email,
            name: u.name,
            role,
            success: false,
            error: createError.message
          });
          continue;
        }

        createdUsers.push({ id: authData.user.id, email: u.email.toLowerCase(), role, index: i });
        
        if (u.phone) {
          await supabaseAdmin
            .from('users')
            .update({ phone: u.phone })
            .eq('id', authData.user.id);
        }

        results.push({
          email: u.email,
          name: u.name,
          role,
          success: true,
          user_id: authData.user.id
        });

        console.log(`[ADMIN-BATCH] Usuario criado: ${u.email} (${role})`);

      } catch (err: any) {
        results.push({
          email: u.email,
          name: u.name,
          role,
          success: false,
          error: err.message
        });
      }
    }

    const ownerCreated = createdUsers.find(u => u.role === 'owner');
    if (!ownerCreated) {
      for (const u of createdUsers) {
        await supabaseAdmin.auth.admin.deleteUser(u.id);
      }
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Falha ao criar o owner. Nenhum workspace foi criado.',
          results 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    await new Promise(resolve => setTimeout(resolve, 1000));

    const { data: workspace, error: wsError } = await supabaseAdmin
      .from('workspaces')
      .insert({
        name: workspace_name,
        slug: finalSlug,
        owner_id: ownerCreated.id,
        settings: {
          created_by_admin: true,
          created_by: caller.id,
          created_at: new Date().toISOString(),
          total_users_created: createdUsers.length,
          funnels_templates: funnels || []
        }
      })
      .select()
      .single();

    if (wsError) {
      console.error('[ADMIN-BATCH] Workspace error:', wsError);
      for (const u of createdUsers) {
        await supabaseAdmin.auth.admin.deleteUser(u.id);
      }
      return new Response(
        JSON.stringify({ success: false, error: `Erro ao criar workspace: ${wsError.message}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[ADMIN-BATCH] Workspace criado: ${workspace.id}`);

    for (const u of createdUsers) {
      await supabaseAdmin
        .from('workspace_members')
        .insert({
          workspace_id: workspace.id,
          user_id: u.id,
          role: u.role,
          invited_by: caller.id
        });

      try {
        await supabaseAdmin
          .from('workspace_membership_lookup')
          .insert({
            workspace_id: workspace.id,
            user_id: u.id
          });
      } catch (e) {}

      await supabaseAdmin
        .from('users')
        .update({ last_workspace_id: workspace.id })
        .eq('id', u.id);
    }

    // CRIAR FUNIS APENAS SE TEMPLATES FORAM SELECIONADOS
    if (funnels && funnels.length > 0 && dbTemplates.length > 0) {
      for (let i = 0; i < funnels.length; i++) {
        const templateSlug = funnels[i];
        const template = dbTemplates.find(t => t.slug === templateSlug);
        
        if (!template) continue;

        try {
          const { data: funnel, error: funnelError } = await supabaseAdmin
            .from('funnels')
            .insert({
              workspace_id: workspace.id,
              name: template.name,
              description: template.description,
              is_active: true,
              position: i,
              created_by: ownerCreated.id
            })
            .select()
            .single();

          if (funnelError) {
            funnelResults.push({
              template: templateSlug,
              name: template.name,
              success: false,
              columns_count: 0,
              error: funnelError.message
            });
            continue;
          }

          const templateColumns = template.columns as FunnelColumn[];
          const columns = templateColumns.map((col, idx) => ({
            funnel_id: funnel.id,
            title: col.title,
            color: col.color,
            position: idx
          }));

          await supabaseAdmin
            .from('funnel_columns')
            .insert(columns);

          funnelResults.push({
            template: templateSlug,
            name: template.name,
            success: true,
            columns_count: templateColumns.length,
            funnel_id: funnel.id
          });

          console.log(`[ADMIN-BATCH] Funil criado: ${template.name} com ${templateColumns.length} colunas`);

        } catch (err: any) {
          funnelResults.push({
            template: templateSlug,
            name: template.name,
            success: false,
            columns_count: 0,
            error: err.message
          });
        }
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;
    const funnelSuccessCount = funnelResults.filter(f => f.success).length;

    console.log(`[ADMIN-BATCH] Concluido: ${successCount} usuarios, ${funnelSuccessCount} funis`);

    const credentials = users.map((u) => ({
      name: u.name,
      email: u.email.toLowerCase(),
      password: u.password,
      role: u.role || 'member'
    }));

    return new Response(
      JSON.stringify({
        success: true,
        message: funnelSuccessCount > 0 
          ? `Workspace criado com ${successCount} usuario(s) e ${funnelSuccessCount} funil(is)!`
          : `Workspace criado com ${successCount} usuario(s)!`,
        workspace: {
          id: workspace.id,
          name: workspace_name,
          slug: finalSlug
        },
        summary: {
          users: { total: users.length, success: successCount, failed: failCount },
          funnels: { total: funnels?.length || 0, success: funnelSuccessCount, failed: (funnels?.length || 0) - funnelSuccessCount }
        },
        users: results,
        funnels: funnelResults,
        credentials,
        login_url: 'https://hub.pescalead.com.br/login'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[ADMIN-BATCH] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});