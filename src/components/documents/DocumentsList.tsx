/**
 * DocumentsList Component
 * Lists all documents and folders for a lead
 */

import React, { useState, useCallback } from 'react';
import {
  FileText,
  Folder,
  FolderOpen,
  Plus,
  MoreVertical,
  Trash2,
  Edit3,
  Pin,
  PinOff,
  ChevronRight,
  ChevronDown,
  FolderPlus,
  Search,
  Clock,
  FolderInput,
  FolderMinus,
} from 'lucide-react';
import type { LeadDocument, LeadDocumentFolder } from '../../types/documents';

interface DocumentsListProps {
  documents: LeadDocument[];
  folders: LeadDocumentFolder[];
  selectedDocumentId?: string | null;
  theme?: 'dark' | 'light';
  onSelectDocument: (document: LeadDocument) => void;
  onCreateDocument: (folderId?: string) => void;
  onDeleteDocument: (documentId: string) => void;
  onPinDocument: (documentId: string, isPinned: boolean) => void;
  onRenameDocument?: (documentId: string, newTitle: string) => void;
  onCreateFolder: (name: string) => void;
  onDeleteFolder: (folderId: string) => void;
  onRenameFolder: (folderId: string, name: string) => void;
  onMoveDocument?: (docId: string, folderId: string | null) => void;
}

export function DocumentsList({
  documents,
  folders,
  selectedDocumentId = null,
  theme = 'dark',
  onSelectDocument,
  onCreateDocument,
  onDeleteDocument,
  onPinDocument,
  onRenameDocument,
  onCreateFolder,
  onDeleteFolder,
  onRenameFolder,
  onMoveDocument,
}: DocumentsListProps) {
  const isDark = theme === 'dark';
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  // Garantir que documents e folders são arrays
  const safeDocuments = Array.isArray(documents) ? documents : [];
  const safeFolders = Array.isArray(folders) ? folders : [];
  const [contextMenu, setContextMenu] = useState<{
    type: 'document' | 'folder';
    id: string;
    x: number;
    y: number;
  } | null>(null);
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editingFolderName, setEditingFolderName] = useState('');
  const [showMoveSubmenu, setShowMoveSubmenu] = useState(false);

  // Toggle folder expansion
  const toggleFolder = useCallback((folderId: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  }, []);

  // Filter documents by search
  const filteredDocuments = safeDocuments.filter(doc =>
    (doc.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (doc.content_text || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group documents by folder
  const pinnedDocuments = filteredDocuments.filter(doc => doc.is_pinned);
  const rootDocuments = filteredDocuments.filter(doc => !doc.folder_id && !doc.is_pinned);
  const documentsByFolder = safeFolders.reduce((acc, folder) => {
    acc[folder.id] = filteredDocuments.filter(doc => doc.folder_id === folder.id && !doc.is_pinned);
    return acc;
  }, {} as Record<string, LeadDocument[]>);

  // Handle context menu
  const handleContextMenu = (e: React.MouseEvent, type: 'document' | 'folder', id: string) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ type, id, x: e.clientX, y: e.clientY });
  };

  // Close context menu when clicking outside
  const closeContextMenu = () => {
    setContextMenu(null);
    setShowMoveSubmenu(false);
  };

  // Start editing folder name
  const startEditingFolder = (folderId: string, currentName: string) => {
    setEditingFolderId(folderId);
    setEditingFolderName(currentName);
    closeContextMenu();
  };

  // Finish editing folder name
  const finishEditingFolder = () => {
    if (editingFolderId && editingFolderName.trim()) {
      onRenameFolder(editingFolderId, editingFolderName.trim());
    }
    setEditingFolderId(null);
    setEditingFolderName('');
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="flex flex-col h-full" onClick={closeContextMenu}>
      {/* Header */}
      <div className={`flex items-center justify-between px-4 py-3 border-b ${
        isDark ? 'border-white/[0.08]' : 'border-gray-200'
      }`}>
        <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Documentos
        </h3>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsCreatingFolder(true)}
            className={`p-1.5 rounded-lg transition-colors ${
              isDark
                ? 'text-white/60 hover:text-white hover:bg-white/10'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
            }`}
            title="Nova pasta"
          >
            <FolderPlus className="w-4 h-4" />
          </button>
          <button
            onClick={() => onCreateDocument()}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#0066FF] hover:bg-[#0052CC] text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Novo
          </button>
        </div>
      </div>

      {/* Modal de criar pasta */}
      {isCreatingFolder && (
        <div className={`px-4 py-2 border-b ${
          isDark ? 'border-white/[0.08] bg-white/[0.02]' : 'border-gray-200 bg-gray-50'
        }`}>
          <div className="flex items-center gap-2">
            <Folder className={`w-4 h-4 ${isDark ? 'text-white/60' : 'text-gray-500'}`} />
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newFolderName.trim()) {
                  onCreateFolder(newFolderName.trim());
                  setNewFolderName('');
                  setIsCreatingFolder(false);
                } else if (e.key === 'Escape') {
                  setNewFolderName('');
                  setIsCreatingFolder(false);
                }
              }}
              placeholder="Nome da pasta..."
              className={`flex-1 bg-transparent border-none outline-none text-sm ${
                isDark
                  ? 'text-white placeholder-white/40'
                  : 'text-gray-900 placeholder-gray-400'
              }`}
              autoFocus
            />
            <button
              onClick={() => {
                if (newFolderName.trim()) {
                  onCreateFolder(newFolderName.trim());
                  setNewFolderName('');
                  setIsCreatingFolder(false);
                }
              }}
              className="px-2 py-1 text-xs font-medium bg-[#0066FF] hover:bg-[#0052CC] text-white rounded transition-colors"
            >
              Criar
            </button>
            <button
              onClick={() => {
                setNewFolderName('');
                setIsCreatingFolder(false);
              }}
              className={`p-1 rounded ${
                isDark ? 'hover:bg-white/10 text-white/60' : 'hover:bg-gray-200 text-gray-500'
              }`}
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Search */}
      <div className={`px-4 py-2 border-b ${
        isDark ? 'border-white/[0.08]' : 'border-gray-200'
      }`}>
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${
          isDark ? 'bg-white/[0.05]' : 'bg-gray-100'
        }`}>
          <Search className={`w-4 h-4 ${isDark ? 'text-white/40' : 'text-gray-400'}`} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar documentos..."
            className={`flex-1 bg-transparent border-none outline-none text-sm ${
              isDark
                ? 'text-white placeholder-white/40'
                : 'text-gray-900 placeholder-gray-400'
            }`}
          />
        </div>
      </div>

      {/* Documents List */}
      <div className="flex-1 overflow-y-auto p-2">
        {/* Pinned Documents */}
        {pinnedDocuments.length > 0 && (
          <div className="mb-3">
            <div className={`flex items-center gap-2 px-2 py-1 text-xs font-medium uppercase tracking-wider ${
              isDark ? 'text-white/40' : 'text-gray-400'
            }`}>
              <Pin className="w-3 h-3" />
              Fixados
            </div>
            {pinnedDocuments.map((doc, index) => (
              <DocumentItem
                key={doc.id || `pinned-doc-${index}`}
                document={doc}
                isSelected={selectedDocumentId === doc.id}
                isDark={isDark}
                onClick={() => onSelectDocument(doc)}
                onContextMenu={(e) => handleContextMenu(e, 'document', doc.id)}
                formatDate={formatDate}
              />
            ))}
          </div>
        )}

        {/* Folders */}
        {safeFolders.map(folder => (
          <div key={folder.id} className="mb-1">
            {/* Folder Header */}
            <div
              className={`group flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-colors ${
                isDark
                  ? 'hover:bg-white/[0.05]'
                  : 'hover:bg-gray-100'
              }`}
              onClick={() => toggleFolder(folder.id)}
              onContextMenu={(e) => handleContextMenu(e, 'folder', folder.id)}
            >
              {expandedFolders.has(folder.id) ? (
                <ChevronDown className={`w-4 h-4 ${isDark ? 'text-white/40' : 'text-gray-400'}`} />
              ) : (
                <ChevronRight className={`w-4 h-4 ${isDark ? 'text-white/40' : 'text-gray-400'}`} />
              )}
              {expandedFolders.has(folder.id) ? (
                <FolderOpen className="w-4 h-4" style={{ color: folder.color }} />
              ) : (
                <Folder className="w-4 h-4" style={{ color: folder.color }} />
              )}
              {editingFolderId === folder.id ? (
                <input
                  type="text"
                  value={editingFolderName}
                  onChange={(e) => setEditingFolderName(e.target.value)}
                  onBlur={finishEditingFolder}
                  onKeyDown={(e) => e.key === 'Enter' && finishEditingFolder()}
                  className={`flex-1 bg-transparent border-none outline-none text-sm font-medium ${
                    isDark ? 'text-white' : 'text-gray-900'
                  }`}
                  autoFocus
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <span className={`flex-1 text-sm font-medium ${
                  isDark ? 'text-white' : 'text-gray-900'
                }`}>
                  {folder.name}
                </span>
              )}
              <span className={`text-xs ${isDark ? 'text-white/30' : 'text-gray-400'}`}>
                {documentsByFolder[folder.id]?.length || 0}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  console.log('[DocumentsList] Criando documento na pasta:', folder.id, folder.name);
                  onCreateDocument(folder.id);
                }}
                className={`p-1.5 rounded transition-all ${
                  isDark
                    ? 'hover:bg-[#0066FF]/30 text-white/40 hover:text-white'
                    : 'hover:bg-blue-100 text-gray-400 hover:text-blue-600'
                }`}
                title="Novo documento nesta pasta"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* Folder Documents */}
            {expandedFolders.has(folder.id) && (
              <div className="ml-6">
                {(documentsByFolder[folder.id] || []).map((doc, index) => (
                  <DocumentItem
                    key={doc.id || `folder-doc-${folder.id}-${index}`}
                    document={doc}
                    isSelected={selectedDocumentId === doc.id}
                    isDark={isDark}
                    onClick={() => onSelectDocument(doc)}
                    onContextMenu={(e) => handleContextMenu(e, 'document', doc.id)}
                    formatDate={formatDate}
                  />
                ))}
                {(documentsByFolder[folder.id] || []).length === 0 && (
                  <div className={`px-2 py-2 text-xs ${
                    isDark ? 'text-white/30' : 'text-gray-400'
                  }`}>
                    Pasta vazia
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {/* Root Documents (no folder) */}
        {rootDocuments.length > 0 && (
          <div className="mt-2">
            {safeFolders.length > 0 && (
              <div className={`px-2 py-1 text-xs font-medium uppercase tracking-wider ${
                isDark ? 'text-white/40' : 'text-gray-400'
              }`}>
                Sem pasta
              </div>
            )}
            {rootDocuments.map((doc, index) => (
              <DocumentItem
                key={doc.id || `root-doc-${index}`}
                document={doc}
                isSelected={selectedDocumentId === doc.id}
                isDark={isDark}
                onClick={() => onSelectDocument(doc)}
                onContextMenu={(e) => handleContextMenu(e, 'document', doc.id)}
                formatDate={formatDate}
              />
            ))}
          </div>
        )}

        {/* Empty State */}
        {safeDocuments.length === 0 && (
          <div className={`flex flex-col items-center justify-center py-12 text-center ${
            isDark ? 'text-white/40' : 'text-gray-400'
          }`}>
            <FileText className="w-12 h-12 mb-3 opacity-50" />
            <p className="text-sm font-medium">Nenhum documento</p>
            <p className="text-xs mt-1">Crie seu primeiro documento clicando em "Novo"</p>
          </div>
        )}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div
          className={`fixed z-50 min-w-[160px] rounded-lg shadow-xl ${
            isDark
              ? 'bg-elevated border border-white/[0.08]'
              : 'bg-white border border-gray-200'
          }`}
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          {contextMenu.type === 'document' && (
            <>
              {(() => {
                const doc = safeDocuments.find(d => d.id === contextMenu.id);
                return (
                  <>
                    <button
                      onClick={() => {
                        if (doc) onPinDocument(doc.id, !doc.is_pinned);
                        closeContextMenu();
                      }}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors ${
                        isDark
                          ? 'text-white/70 hover:bg-white/[0.05]'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      {doc?.is_pinned ? (
                        <>
                          <PinOff className="w-4 h-4" />
                          Desafixar
                        </>
                      ) : (
                        <>
                          <Pin className="w-4 h-4" />
                          Fixar
                        </>
                      )}
                    </button>

                    {/* Move to folder option */}
                    {onMoveDocument && safeFolders.length > 0 && (
                      <div className="relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowMoveSubmenu(!showMoveSubmenu);
                          }}
                          className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-sm transition-colors ${
                            isDark
                              ? 'text-white/70 hover:bg-white/[0.05]'
                              : 'text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <FolderInput className="w-4 h-4" />
                            Mover para pasta
                          </div>
                          <ChevronRight className={`w-3 h-3 transition-transform ${showMoveSubmenu ? 'rotate-90' : ''}`} />
                        </button>

                        {/* Submenu with folders */}
                        {showMoveSubmenu && (
                          <div
                            className={`absolute min-w-[140px] rounded-lg shadow-xl z-[60] ${
                              isDark
                                ? 'bg-elevated border border-white/[0.08]'
                                : 'bg-white border border-gray-200'
                            }`}
                            style={{
                              left: contextMenu && contextMenu.x > window.innerWidth - 300 ? 'auto' : '100%',
                              right: contextMenu && contextMenu.x > window.innerWidth - 300 ? '100%' : 'auto',
                              top: 0,
                              marginLeft: contextMenu && contextMenu.x > window.innerWidth - 300 ? 0 : 4,
                              marginRight: contextMenu && contextMenu.x > window.innerWidth - 300 ? 4 : 0,
                            }}
                          >
                            {/* Remove from folder option */}
                            {doc?.folder_id && (
                              <button
                                onClick={() => {
                                  onMoveDocument(contextMenu.id, null);
                                  closeContextMenu();
                                }}
                                className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors ${
                                  isDark
                                    ? 'text-white/70 hover:bg-white/[0.05]'
                                    : 'text-gray-700 hover:bg-gray-100'
                                }`}
                              >
                                <FolderMinus className="w-4 h-4" />
                                Remover da pasta
                              </button>
                            )}

                            {/* Folder options */}
                            {safeFolders.length > 0 ? (
                              safeFolders
                                .filter(f => f.id !== doc?.folder_id)
                                .map(folder => (
                                  <button
                                    key={folder.id}
                                    onClick={() => {
                                      onMoveDocument(contextMenu.id, folder.id);
                                      closeContextMenu();
                                    }}
                                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors ${
                                      isDark
                                        ? 'text-white/70 hover:bg-white/[0.05]'
                                        : 'text-gray-700 hover:bg-gray-100'
                                    }`}
                                  >
                                    <Folder className="w-4 h-4" style={{ color: folder.color }} />
                                    {folder.name}
                                  </button>
                                ))
                            ) : (
                              <div className={`px-3 py-2 text-xs ${
                                isDark ? 'text-white/40' : 'text-gray-400'
                              }`}>
                                Nenhuma pasta
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                );
              })()}

              {/* Divider */}
              <div className={`my-1 border-t ${
                isDark ? 'border-white/[0.08]' : 'border-gray-200'
              }`} />

              <button
                onClick={() => {
                  onDeleteDocument(contextMenu.id);
                  closeContextMenu();
                }}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors ${
                  isDark
                    ? 'text-red-400 hover:bg-red-500/10'
                    : 'text-red-600 hover:bg-red-50'
                }`}
              >
                <Trash2 className="w-4 h-4" />
                Excluir
              </button>
            </>
          )}
          {contextMenu.type === 'folder' && (
            <>
              {/* Create document in this folder */}
              <button
                onClick={() => {
                  onCreateDocument(contextMenu.id);
                  closeContextMenu();
                }}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors ${
                  isDark
                    ? 'text-white/70 hover:bg-white/[0.05]'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Plus className="w-4 h-4" />
                Novo documento aqui
              </button>

              <button
                onClick={() => {
                  const folder = safeFolders.find(f => f.id === contextMenu.id);
                  if (folder) startEditingFolder(folder.id, folder.name);
                }}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors ${
                  isDark
                    ? 'text-white/70 hover:bg-white/[0.05]'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Edit3 className="w-4 h-4" />
                Renomear
              </button>

              {/* Divider */}
              <div className={`my-1 border-t ${
                isDark ? 'border-white/[0.08]' : 'border-gray-200'
              }`} />

              <button
                onClick={() => {
                  onDeleteFolder(contextMenu.id);
                  closeContextMenu();
                }}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors ${
                  isDark
                    ? 'text-red-400 hover:bg-red-500/10'
                    : 'text-red-600 hover:bg-red-50'
                }`}
              >
                <Trash2 className="w-4 h-4" />
                Excluir pasta
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// Document Item Component
interface DocumentItemProps {
  document: LeadDocument;
  isSelected: boolean;
  isDark: boolean;
  onClick: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
  formatDate: (date: string) => string;
}

function DocumentItem({
  document,
  isSelected,
  isDark,
  onClick,
  onContextMenu,
  formatDate,
}: DocumentItemProps) {
  return (
    <div
      className={`group flex items-center gap-2 px-2 py-2 rounded-lg cursor-pointer transition-colors ${
        isSelected
          ? isDark
            ? 'bg-[#0066FF]/20 text-white'
            : 'bg-blue-50 text-blue-700'
          : isDark
          ? 'text-white/70 hover:bg-white/[0.05]'
          : 'text-gray-700 hover:bg-gray-100'
      }`}
      onClick={onClick}
      onContextMenu={onContextMenu}
    >
      <FileText className={`w-4 h-4 flex-shrink-0 ${
        isSelected
          ? 'text-[#0066FF]'
          : isDark
          ? 'text-white/40'
          : 'text-gray-400'
      }`} />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">{document.title}</div>
        <div className={`flex items-center gap-1 text-xs ${
          isDark ? 'text-white/30' : 'text-gray-400'
        }`}>
          <Clock className="w-3 h-3" />
          {formatDate(document.updated_at)}
        </div>
      </div>
      {document.is_pinned && (
        <Pin className={`w-3 h-3 flex-shrink-0 ${
          isDark ? 'text-[#0066FF]' : 'text-blue-500'
        }`} />
      )}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onContextMenu(e);
        }}
        className={`p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity ${
          isDark
            ? 'hover:bg-white/10 text-white/60'
            : 'hover:bg-gray-200 text-gray-500'
        }`}
      >
        <MoreVertical className="w-3 h-3" />
      </button>
    </div>
  );
}

export default DocumentsList;
