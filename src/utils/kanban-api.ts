import { projectId, publicAnonKey } from './supabase/info.tsx';

const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-e4f9d774`;

// Get auth token from localStorage (set by AuthContext)
function getAuthToken(): string {
  return localStorage.getItem('supabase_auth_token') || '';
}

// ==================================
// FUNNEL API
// ==================================

export async function getFunnels(workspaceId: string) {
  const response = await fetch(`${API_URL}/workspaces/${workspaceId}/funnels`, {
    headers: {
      'Authorization': `Bearer ${getAuthToken()}`,
      'Content-Type': 'application/json',
    },
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to get funnels');
  }
  
  return response.json();
}

export async function getFunnel(workspaceId: string, funnelId: string) {
  const response = await fetch(`${API_URL}/workspaces/${workspaceId}/funnels/${funnelId}`, {
    headers: {
      'Authorization': `Bearer ${getAuthToken()}`,
      'Content-Type': 'application/json',
    },
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to get funnel');
  }
  
  return response.json();
}

export async function createFunnel(workspaceId: string, data: { name: string; columns: any[] }) {
  const response = await fetch(`${API_URL}/workspaces/${workspaceId}/funnels`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${getAuthToken()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create funnel');
  }
  
  return response.json();
}

export async function updateFunnel(workspaceId: string, funnelId: string, data: { name?: string; columns?: any[] }) {
  const response = await fetch(`${API_URL}/workspaces/${workspaceId}/funnels/${funnelId}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${getAuthToken()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update funnel');
  }
  
  return response.json();
}

export async function deleteFunnel(workspaceId: string, funnelId: string) {
  const response = await fetch(`${API_URL}/workspaces/${workspaceId}/funnels/${funnelId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${getAuthToken()}`,
      'Content-Type': 'application/json',
    },
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete funnel');
  }
  
  return response.json();
}

export async function getFunnelStats(workspaceId: string, funnelId: string) {
  const response = await fetch(`${API_URL}/workspaces/${workspaceId}/funnels/${funnelId}/stats`, {
    headers: {
      'Authorization': `Bearer ${getAuthToken()}`,
      'Content-Type': 'application/json',
    },
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to get stats');
  }
  
  return response.json();
}

// ==================================
// LEAD API
// ==================================

export async function getColumnLeads(
  workspaceId: string,
  funnelId: string,
  columnId: string,
  offset: number = 0,
  limit: number = 10
) {
  const response = await fetch(
    `${API_URL}/workspaces/${workspaceId}/funnels/${funnelId}/columns/${columnId}/leads?offset=${offset}&limit=${limit}`,
    {
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`,
        'Content-Type': 'application/json',
      },
    }
  );
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to get leads');
  }
  
  return response.json();
}

export async function getAllLeads(
  workspaceId: string,
  funnelId: string,
  offset: number = 0,
  limit: number = 30
) {
  const response = await fetch(
    `${API_URL}/workspaces/${workspaceId}/funnels/${funnelId}/leads?offset=${offset}&limit=${limit}`,
    {
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`,
        'Content-Type': 'application/json',
      },
    }
  );
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to get leads');
  }
  
  return response.json();
}

export async function getLead(workspaceId: string, leadId: string) {
  const response = await fetch(`${API_URL}/workspaces/${workspaceId}/leads/${leadId}`, {
    headers: {
      'Authorization': `Bearer ${getAuthToken()}`,
      'Content-Type': 'application/json',
    },
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to get lead');
  }
  
  return response.json();
}

export async function createLead(workspaceId: string, funnelId: string, leadData: any) {
  const response = await fetch(`${API_URL}/workspaces/${workspaceId}/funnels/${funnelId}/leads`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${getAuthToken()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(leadData),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create lead');
  }
  
  return response.json();
}

export async function updateLead(workspaceId: string, leadId: string, updates: any) {
  const response = await fetch(`${API_URL}/workspaces/${workspaceId}/leads/${leadId}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${getAuthToken()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updates),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update lead');
  }
  
  return response.json();
}

export async function moveLead(
  workspaceId: string,
  leadId: string,
  toColumnId: string,
  toPosition: number,
  timestamp?: number
) {
  const response = await fetch(`${API_URL}/workspaces/${workspaceId}/leads/${leadId}/move`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${getAuthToken()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ toColumnId, toPosition, timestamp }),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to move lead');
  }
  
  return response.json();
}

export async function deleteLead(workspaceId: string, leadId: string) {
  const response = await fetch(`${API_URL}/workspaces/${workspaceId}/leads/${leadId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${getAuthToken()}`,
      'Content-Type': 'application/json',
    },
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete lead');
  }
  
  return response.json();
}

// ==================================
// SEARCH API
// ==================================

export async function searchLeads(
  workspaceId: string,
  funnelId: string,
  filters: {
    q?: string;
    priority?: string;
    assignee?: string;
    tags?: string[];
  }
) {
  const params = new URLSearchParams();
  if (filters.q) params.append('q', filters.q);
  if (filters.priority) params.append('priority', filters.priority);
  if (filters.assignee) params.append('assignee', filters.assignee);
  if (filters.tags && filters.tags.length > 0) params.append('tags', filters.tags.join(','));
  
  const response = await fetch(
    `${API_URL}/workspaces/${workspaceId}/funnels/${funnelId}/search?${params.toString()}`,
    {
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`,
        'Content-Type': 'application/json',
      },
    }
  );
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to search leads');
  }
  
  return response.json();
}

// ==================================
// CHANGELOG API (for realtime polling)
// ==================================

export async function getChangelog(workspaceId: string, since: number = 0) {
  const response = await fetch(
    `${API_URL}/workspaces/${workspaceId}/changelog?since=${since}`,
    {
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`,
        'Content-Type': 'application/json',
      },
    }
  );
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to get changelog');
  }
  
  return response.json();
}
