/**
 * Documents Service
 * CRUD operations for lead documents, folders, templates, and versions
 */

import { supabase } from '../utils/supabase/client';
import type {
  LeadDocument,
  LeadDocumentFolder,
  LeadDocumentTemplate,
  LeadDocumentVersion,
  CreateDocumentInput,
  UpdateDocumentInput,
  CreateFolderInput,
  UpdateFolderInput,
  CreateTemplateInput,
  UpdateTemplateInput,
  CreateVersionInput,
} from '../types/documents';

// ============================================
// DOCUMENTS CRUD
// ============================================

export async function getDocumentsByLead(leadId: string): Promise<{
  documents: LeadDocument[];
  error: Error | null;
}> {
  try {
    const { data, error } = await supabase
      .from('lead_documents')
      .select(`
        *,
        folder:lead_document_folders(*)
      `)
      .eq('lead_id', leadId)
      .order('is_pinned', { ascending: false })
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('[DOCUMENTS] Error fetching documents:', error);
      return { documents: [], error };
    }

    return { documents: data || [], error: null };
  } catch (error) {
    console.error('[DOCUMENTS] Unexpected error:', error);
    return { documents: [], error: error as Error };
  }
}

export async function getDocumentById(documentId: string): Promise<{
  document: LeadDocument | null;
  error: Error | null;
}> {
  try {
    const { data, error } = await supabase
      .from('lead_documents')
      .select(`
        *,
        folder:lead_document_folders(*)
      `)
      .eq('id', documentId)
      .single();

    if (error) {
      console.error('[DOCUMENTS] Error fetching document:', error);
      return { document: null, error };
    }

    return { document: data, error: null };
  } catch (error) {
    console.error('[DOCUMENTS] Unexpected error:', error);
    return { document: null, error: error as Error };
  }
}

export async function createDocument(input: CreateDocumentInput): Promise<{
  document: LeadDocument | null;
  error: Error | null;
}> {
  try {
    const { data, error } = await supabase
      .from('lead_documents')
      .insert({
        lead_id: input.lead_id,
        workspace_id: input.workspace_id,
        folder_id: input.folder_id || null,
        title: input.title || 'Novo Documento',
        content: input.content || { type: 'doc', content: [{ type: 'paragraph' }] },
        content_text: input.content_text || '',
        created_by: input.created_by,
        updated_by: input.created_by,
      })
      .select()
      .single();

    if (error) {
      console.error('[DOCUMENTS] Error creating document:', error);
      return { document: null, error };
    }

    console.log('[DOCUMENTS] Document created:', data?.id);
    return { document: data, error: null };
  } catch (error) {
    console.error('[DOCUMENTS] Unexpected error:', error);
    return { document: null, error: error as Error };
  }
}

export async function updateDocument(
  documentId: string,
  input: UpdateDocumentInput
): Promise<{ document: LeadDocument | null; error: Error | null }> {
  try {
    const updateData: Record<string, unknown> = {};

    if (input.folder_id !== undefined) updateData.folder_id = input.folder_id;
    if (input.title !== undefined) updateData.title = input.title;
    if (input.content !== undefined) updateData.content = input.content;
    if (input.content_text !== undefined) updateData.content_text = input.content_text;
    if (input.is_pinned !== undefined) updateData.is_pinned = input.is_pinned;
    if (input.updated_by !== undefined) updateData.updated_by = input.updated_by;

    const { data, error } = await supabase
      .from('lead_documents')
      .update(updateData)
      .eq('id', documentId)
      .select()
      .single();

    if (error) {
      console.error('[DOCUMENTS] Error updating document:', error);
      return { document: null, error };
    }

    console.log('[DOCUMENTS] Document updated:', documentId);
    return { document: data, error: null };
  } catch (error) {
    console.error('[DOCUMENTS] Unexpected error:', error);
    return { document: null, error: error as Error };
  }
}

export async function deleteDocument(documentId: string): Promise<{ error: Error | null }> {
  try {
    const { error } = await supabase
      .from('lead_documents')
      .delete()
      .eq('id', documentId);

    if (error) {
      console.error('[DOCUMENTS] Error deleting document:', error);
      return { error };
    }

    console.log('[DOCUMENTS] Document deleted:', documentId);
    return { error: null };
  } catch (error) {
    console.error('[DOCUMENTS] Unexpected error:', error);
    return { error: error as Error };
  }
}

// ============================================
// FOLDERS CRUD
// ============================================

export async function getFoldersByLead(leadId: string): Promise<{
  folders: LeadDocumentFolder[];
  error: Error | null;
}> {
  try {
    const { data, error } = await supabase
      .from('lead_document_folders')
      .select('*')
      .eq('lead_id', leadId)
      .order('position');

    if (error) {
      console.error('[DOCUMENTS] Error fetching folders:', error);
      return { folders: [], error };
    }

    return { folders: data || [], error: null };
  } catch (error) {
    console.error('[DOCUMENTS] Unexpected error:', error);
    return { folders: [], error: error as Error };
  }
}

export async function createFolder(input: CreateFolderInput): Promise<{
  folder: LeadDocumentFolder | null;
  error: Error | null;
}> {
  try {
    const { data, error } = await supabase
      .from('lead_document_folders')
      .insert({
        lead_id: input.lead_id,
        workspace_id: input.workspace_id,
        name: input.name,
        color: input.color || '#6366f1',
        position: input.position || 0,
      })
      .select()
      .single();

    if (error) {
      console.error('[DOCUMENTS] Error creating folder:', error);
      return { folder: null, error };
    }

    console.log('[DOCUMENTS] Folder created:', data?.id);
    return { folder: data, error: null };
  } catch (error) {
    console.error('[DOCUMENTS] Unexpected error:', error);
    return { folder: null, error: error as Error };
  }
}

export async function updateFolder(
  folderId: string,
  input: UpdateFolderInput
): Promise<{ error: Error | null }> {
  try {
    const { error } = await supabase
      .from('lead_document_folders')
      .update(input)
      .eq('id', folderId);

    if (error) {
      console.error('[DOCUMENTS] Error updating folder:', error);
      return { error };
    }

    console.log('[DOCUMENTS] Folder updated:', folderId);
    return { error: null };
  } catch (error) {
    console.error('[DOCUMENTS] Unexpected error:', error);
    return { error: error as Error };
  }
}

export async function deleteFolder(folderId: string): Promise<{ error: Error | null }> {
  try {
    // Documents in this folder will have folder_id set to NULL (ON DELETE SET NULL)
    const { error } = await supabase
      .from('lead_document_folders')
      .delete()
      .eq('id', folderId);

    if (error) {
      console.error('[DOCUMENTS] Error deleting folder:', error);
      return { error };
    }

    console.log('[DOCUMENTS] Folder deleted:', folderId);
    return { error: null };
  } catch (error) {
    console.error('[DOCUMENTS] Unexpected error:', error);
    return { error: error as Error };
  }
}

// ============================================
// TEMPLATES CRUD
// ============================================

export async function getTemplatesByWorkspace(workspaceId: string): Promise<{
  templates: LeadDocumentTemplate[];
  error: Error | null;
}> {
  try {
    const { data, error } = await supabase
      .from('lead_document_templates')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[DOCUMENTS] Error fetching templates:', error);
      return { templates: [], error };
    }

    return { templates: data || [], error: null };
  } catch (error) {
    console.error('[DOCUMENTS] Unexpected error:', error);
    return { templates: [], error: error as Error };
  }
}

export async function createTemplate(input: CreateTemplateInput): Promise<{
  template: LeadDocumentTemplate | null;
  error: Error | null;
}> {
  try {
    const { data, error } = await supabase
      .from('lead_document_templates')
      .insert({
        workspace_id: input.workspace_id,
        title: input.title,
        description: input.description || null,
        content: input.content,
        content_text: input.content_text || '',
        created_by: input.created_by,
      })
      .select()
      .single();

    if (error) {
      console.error('[DOCUMENTS] Error creating template:', error);
      return { template: null, error };
    }

    console.log('[DOCUMENTS] Template created:', data?.id);
    return { template: data, error: null };
  } catch (error) {
    console.error('[DOCUMENTS] Unexpected error:', error);
    return { template: null, error: error as Error };
  }
}

export async function updateTemplate(
  templateId: string,
  input: UpdateTemplateInput
): Promise<{ error: Error | null }> {
  try {
    const { error } = await supabase
      .from('lead_document_templates')
      .update(input)
      .eq('id', templateId);

    if (error) {
      console.error('[DOCUMENTS] Error updating template:', error);
      return { error };
    }

    console.log('[DOCUMENTS] Template updated:', templateId);
    return { error: null };
  } catch (error) {
    console.error('[DOCUMENTS] Unexpected error:', error);
    return { error: error as Error };
  }
}

export async function deleteTemplate(templateId: string): Promise<{ error: Error | null }> {
  try {
    const { error } = await supabase
      .from('lead_document_templates')
      .delete()
      .eq('id', templateId);

    if (error) {
      console.error('[DOCUMENTS] Error deleting template:', error);
      return { error };
    }

    console.log('[DOCUMENTS] Template deleted:', templateId);
    return { error: null };
  } catch (error) {
    console.error('[DOCUMENTS] Unexpected error:', error);
    return { error: error as Error };
  }
}

// ============================================
// VERSIONS CRUD
// ============================================

export async function getVersionsByDocument(documentId: string): Promise<{
  versions: LeadDocumentVersion[];
  error: Error | null;
}> {
  try {
    const { data, error } = await supabase
      .from('lead_document_versions')
      .select('*')
      .eq('document_id', documentId)
      .order('version_number', { ascending: false });

    if (error) {
      console.error('[DOCUMENTS] Error fetching versions:', error);
      return { versions: [], error };
    }

    return { versions: data || [], error: null };
  } catch (error) {
    console.error('[DOCUMENTS] Unexpected error:', error);
    return { versions: [], error: error as Error };
  }
}

// Maximum number of versions to keep per document
const MAX_VERSIONS_PER_DOCUMENT = 30;

export async function createVersion(input: CreateVersionInput): Promise<{
  version: LeadDocumentVersion | null;
  error: Error | null;
}> {
  try {
    const { data, error } = await supabase
      .from('lead_document_versions')
      .insert({
        document_id: input.document_id,
        content: input.content,
        content_text: input.content_text || '',
        version_number: input.version_number,
        created_by: input.created_by,
      })
      .select()
      .single();

    if (error) {
      console.error('[DOCUMENTS] Error creating version:', error);
      return { version: null, error };
    }

    console.log('[DOCUMENTS] Version created:', data?.id);

    // Cleanup old versions - keep only the latest MAX_VERSIONS_PER_DOCUMENT
    cleanupOldVersions(input.document_id).catch(err => {
      console.warn('[DOCUMENTS] Error cleaning up old versions (non-blocking):', err);
    });

    return { version: data, error: null };
  } catch (error) {
    console.error('[DOCUMENTS] Unexpected error:', error);
    return { version: null, error: error as Error };
  }
}

/**
 * Delete old versions keeping only the latest MAX_VERSIONS_PER_DOCUMENT
 */
async function cleanupOldVersions(documentId: string): Promise<void> {
  try {
    // Get all versions ordered by version_number descending
    const { data: versions, error: fetchError } = await supabase
      .from('lead_document_versions')
      .select('id, version_number')
      .eq('document_id', documentId)
      .order('version_number', { ascending: false });

    if (fetchError || !versions) {
      console.error('[DOCUMENTS] Error fetching versions for cleanup:', fetchError);
      return;
    }

    // If we have more than MAX_VERSIONS_PER_DOCUMENT, delete the oldest ones
    if (versions.length > MAX_VERSIONS_PER_DOCUMENT) {
      const versionsToDelete = versions.slice(MAX_VERSIONS_PER_DOCUMENT);
      const idsToDelete = versionsToDelete.map(v => v.id);

      console.log(`[DOCUMENTS] Cleaning up ${idsToDelete.length} old versions for document ${documentId}`);

      const { error: deleteError } = await supabase
        .from('lead_document_versions')
        .delete()
        .in('id', idsToDelete);

      if (deleteError) {
        console.error('[DOCUMENTS] Error deleting old versions:', deleteError);
      } else {
        console.log(`[DOCUMENTS] Successfully deleted ${idsToDelete.length} old versions`);
      }
    }
  } catch (error) {
    console.error('[DOCUMENTS] Unexpected error during cleanup:', error);
  }
}

export async function getLatestVersionNumber(documentId: string): Promise<number> {
  try {
    const { data, error } = await supabase
      .from('lead_document_versions')
      .select('version_number')
      .eq('document_id', documentId)
      .order('version_number', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      return 0;
    }

    return data.version_number;
  } catch {
    return 0;
  }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Extract plain text from TipTap JSON content
 */
export function extractTextFromContent(content: unknown): string {
  if (!content || typeof content !== 'object') return '';

  const extractText = (node: Record<string, unknown>): string => {
    if (node.text && typeof node.text === 'string') {
      return node.text;
    }
    if (Array.isArray(node.content)) {
      return node.content.map(child => extractText(child as Record<string, unknown>)).join(' ');
    }
    return '';
  };

  return extractText(content as Record<string, unknown>).trim();
}

/**
 * Convert TipTap JSON to Markdown
 */
export function contentToMarkdown(content: unknown): string {
  if (!content || typeof content !== 'object') {
    return '';
  }

  const convertNode = (node: Record<string, unknown>, depth = 0): string => {
    if (!node || typeof node !== 'object') {
      return '';
    }

    const type = node.type as string;
    const nodeContent = node.content as Record<string, unknown>[] | undefined;

    switch (type) {
      case 'doc':
        if (!nodeContent || !Array.isArray(nodeContent)) return '';
        return nodeContent
          .map(child => convertNode(child as Record<string, unknown>, depth))
          .filter(text => text !== '')
          .join('\n\n');

      case 'paragraph': {
        if (!nodeContent || !Array.isArray(nodeContent)) return '';
        const text = nodeContent.map(child => convertNode(child as Record<string, unknown>, depth)).join('');
        return text;
      }

      case 'heading': {
        const level = (node.attrs as { level: number })?.level || 1;
        const prefix = '#'.repeat(level);
        if (!nodeContent || !Array.isArray(nodeContent)) return `${prefix} `;
        const text = nodeContent.map(child => convertNode(child as Record<string, unknown>, depth)).join('');
        return `${prefix} ${text}`;
      }

      case 'bulletList':
        if (!nodeContent || !Array.isArray(nodeContent)) return '';
        return nodeContent.map(child => convertNode(child as Record<string, unknown>, depth)).join('\n');

      case 'orderedList':
        if (!nodeContent || !Array.isArray(nodeContent)) return '';
        return nodeContent.map((child, i) => {
          const text = convertNode(child as Record<string, unknown>, depth);
          return text.replace(/^- /, `${i + 1}. `);
        }).join('\n');

      case 'listItem': {
        if (!nodeContent || !Array.isArray(nodeContent)) return '- ';
        const text = nodeContent.map(child => convertNode(child as Record<string, unknown>, depth + 1)).join('');
        return `- ${text}`;
      }

      case 'taskList':
        if (!nodeContent || !Array.isArray(nodeContent)) return '';
        return nodeContent.map(child => convertNode(child as Record<string, unknown>, depth)).join('\n');

      case 'taskItem': {
        const checked = (node.attrs as { checked: boolean })?.checked;
        if (!nodeContent || !Array.isArray(nodeContent)) return `- [${checked ? 'x' : ' '}] `;
        const text = nodeContent.map(child => convertNode(child as Record<string, unknown>, depth)).join('');
        return `- [${checked ? 'x' : ' '}] ${text}`;
      }

      case 'blockquote': {
        if (!nodeContent || !Array.isArray(nodeContent)) return '> ';
        const text = nodeContent.map(child => convertNode(child as Record<string, unknown>, depth)).join('\n');
        return text.split('\n').map(line => `> ${line}`).join('\n');
      }

      case 'codeBlock': {
        const language = (node.attrs as { language?: string })?.language || '';
        if (!nodeContent || !Array.isArray(nodeContent)) return `\`\`\`${language}\n\`\`\``;
        const text = nodeContent.map(child => convertNode(child as Record<string, unknown>, depth)).join('');
        return `\`\`\`${language}\n${text}\n\`\`\``;
      }

      case 'horizontalRule':
        return '---';

      case 'hardBreak':
        return '\n';

      case 'text': {
        let text = (node.text as string) || '';
        const marks = node.marks as { type: string }[] | undefined;

        if (marks && Array.isArray(marks)) {
          marks.forEach(mark => {
            switch (mark.type) {
              case 'bold':
                text = `**${text}**`;
                break;
              case 'italic':
                text = `*${text}*`;
                break;
              case 'strike':
                text = `~~${text}~~`;
                break;
              case 'code':
                text = `\`${text}\``;
                break;
              case 'highlight':
                text = `==${text}==`;
                break;
            }
          });
        }
        return text;
      }

      default:
        // Try to process content if it exists
        if (nodeContent && Array.isArray(nodeContent)) {
          return nodeContent.map(child => convertNode(child as Record<string, unknown>, depth)).join('');
        }
        return '';
    }
  };

  return convertNode(content as Record<string, unknown>);
}
