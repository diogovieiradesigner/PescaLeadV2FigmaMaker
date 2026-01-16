import { createClient } from '../utils/supabase/client';
import { projectId } from '../utils/supabase/info';

const supabase = createClient();

export async function inviteMemberByEmail(
  workspaceId: string,
  email: string,
  role: 'admin' | 'member' | 'viewer' = 'member'
) {

  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    console.error('[TEAM-SERVICE] No session found');
    throw new Error('Não autenticado');
  }


  const url = `https://${projectId}.supabase.co/functions/v1/invite-member-by-email`;
  const payload = {
    workspace_id: workspaceId,
    email: email.toLowerCase().trim(),
    role
  };


  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });


    const data = await response.json();
    
    if (!response.ok) {
      console.error('[TEAM-SERVICE] Request failed:', data);
      throw {
        code: data.error_code || 'UNKNOWN_ERROR',
        message: data.message || data.error || 'Erro ao convidar'
      };
    }

    return data;
  } catch (error) {
    console.error('[TEAM-SERVICE] Exception caught:', error);
    throw error;
  }
}