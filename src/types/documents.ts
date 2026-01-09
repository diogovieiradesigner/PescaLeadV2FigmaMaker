/**
 * Types for Lead Documents System
 * Sistema de documentos estilo ClickUp/Notion
 */

import type { JSONContent } from '@tiptap/react';

// ============================================
// DOCUMENT FOLDER
// ============================================

export interface LeadDocumentFolder {
  id: string;
  lead_id: string;
  workspace_id: string;
  name: string;
  color: string;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface CreateFolderInput {
  lead_id: string;
  workspace_id: string;
  name: string;
  color?: string;
  position?: number;
}

export interface UpdateFolderInput {
  name?: string;
  color?: string;
  position?: number;
}

// ============================================
// DOCUMENT
// ============================================

export interface LeadDocument {
  id: string;
  lead_id: string;
  workspace_id: string;
  folder_id: string | null;
  title: string;
  content: JSONContent;
  content_text: string;
  is_pinned: boolean;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  // Populated fields
  folder?: LeadDocumentFolder;
}

export interface CreateDocumentInput {
  lead_id: string;
  workspace_id: string;
  folder_id?: string | null;
  title?: string;
  content?: JSONContent;
  content_text?: string;
  created_by?: string;
}

export interface UpdateDocumentInput {
  folder_id?: string | null;
  title?: string;
  content?: JSONContent;
  content_text?: string;
  is_pinned?: boolean;
  updated_by?: string;
}

// ============================================
// DOCUMENT TEMPLATE
// ============================================

export interface LeadDocumentTemplate {
  id: string;
  workspace_id: string;
  title: string;
  description: string | null;
  content: JSONContent;
  content_text: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateTemplateInput {
  workspace_id: string;
  title: string;
  description?: string;
  content: JSONContent;
  content_text?: string;
  created_by?: string;
}

export interface UpdateTemplateInput {
  title?: string;
  description?: string;
  content?: JSONContent;
  content_text?: string;
}

// ============================================
// DOCUMENT VERSION
// ============================================

export interface LeadDocumentVersion {
  id: string;
  document_id: string;
  content: JSONContent;
  content_text: string;
  version_number: number;
  created_by: string | null;
  created_at: string;
}

export interface CreateVersionInput {
  document_id: string;
  content: JSONContent;
  content_text?: string;
  version_number: number;
  created_by?: string;
}

// ============================================
// SAVE STATUS
// ============================================

export type SaveStatus = 'saved' | 'saving' | 'unsaved' | 'error';

// ============================================
// EDITOR STATE
// ============================================

export interface DocumentEditorState {
  document: LeadDocument | null;
  isEditing: boolean;
  saveStatus: SaveStatus;
  lastSavedAt: Date | null;
}

// ============================================
// DOCUMENTS VIEW STATE
// ============================================

export interface DocumentsViewState {
  documents: LeadDocument[];
  folders: LeadDocumentFolder[];
  templates: LeadDocumentTemplate[];
  selectedDocument: LeadDocument | null;
  selectedFolder: string | null; // null = root
  isLoading: boolean;
  error: string | null;
}

// ============================================
// SLASH COMMAND ITEM
// ============================================

export interface SlashCommandItem {
  title: string;
  description: string;
  icon: string;
  command: (props: { editor: any; range: any }) => void;
}

// ============================================
// PUBLIC SHARING
// ============================================

export interface LeadDocumentShare {
  id: string;
  document_id: string;
  workspace_id: string;
  share_slug: string;
  is_active: boolean;
  allow_edit: boolean;
  edit_password_hash: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  view_count: number;
  last_viewed_at: string | null;
}

export interface CreateShareInput {
  document_id: string;
  workspace_id: string;
  allow_edit?: boolean;
  edit_password?: string; // 4 dígitos
  created_by?: string;
}

export interface UpdateShareInput {
  is_active?: boolean;
  allow_edit?: boolean;
  edit_password?: string | null; // null para remover senha
}

export interface PublicDocumentData {
  id: string;
  title: string;
  content: JSONContent;
  content_text: string;
  updated_at: string;
  lead_name: string | null;
  allow_edit: boolean;
  has_password: boolean;
}
