import { useState, useEffect, useMemo } from 'react';
import {
  FileText,
  Search,
  Upload,
  Folder,
  FolderOpen,
  Trash2,
  ExternalLink,
  Pin,
  PinOff,
  User,
  Calendar as CalendarIcon,
  Filter,
  X,
  Plus,
  Edit3,
  FolderInput,
  UserX
} from 'lucide-react';
import { Theme } from '../hooks/useTheme';
import { LeadDocument, LeadDocumentFolder } from '../types/documents';
import {
  getDocumentsByWorkspace,
  getFoldersByWorkspace,
  deleteDocument,
  updateDocument,
  createDocument,
  updateFolder,
  deleteFolder
} from '../services/documents-service';
import { DocumentEditor } from './documents/DocumentEditor';
import { UploadDocumentModal } from './documents/UploadDocumentModal';
import { SaveStatus } from '../types/documents';
import { CRMLead } from '../types/crm';
import { toast } from 'sonner';

interface DocumentsViewProps {
  theme: Theme;
  workspaceId: string;
  userId: string;
  leads: CRMLead[];
  onNavigateToLead?: (leadId: string) => void;
}

interface DocumentWithLead extends LeadDocument {
  lead_name?: string;
  folder_name?: string;
  folder_color?: string;
}

interface ContextMenuState {
  isOpen: boolean;
  x: number;
  y: number;
  documentId?: string;
  folderId?: string;
}

export function DocumentsView({ theme, workspaceId, userId, leads, onNavigateToLead }: DocumentsViewProps) {
  const isDark = theme === 'dark';

  // State
  const [documents, setDocuments] = useState<DocumentWithLead[]>([]);
  const [folders, setFolders] = useState<any[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<LeadDocument | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({ isOpen: false, x: 0, y: 0 });
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');
  const [showFilters, setShowFilters] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [foldersPage, setFoldersPage] = useState(1);
  const [rootDocsPage, setRootDocsPage] = useState(1);
  const itemsPerPage = 10;
  const [draggedDocId, setDraggedDocId] = useState<string | null>(null);
  const [dropTargetFolderId, setDropTargetFolderId] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    show: boolean;
    type: 'delete-doc' | 'delete-folder' | 'disconnect-lead' | 'remove-folder';
    id: string;
    title: string;
  }>({ show: false, type: 'delete-doc', id: '', title: '' });
  const [editFolderModal, setEditFolderModal] = useState<{
    show: boolean;
    id: string;
    name: string;
  }>({ show: false, id: '', name: '' });
  const [filters, setFilters] = useState({
    leadName: '',
    folderName: '',
    dateFrom: '',
    dateTo: ''
  });

  // Load data
  useEffect(() => {
    if (workspaceId) {
      loadData();
    }
  }, [workspaceId]);

  const loadData = async () => {
    if (!workspaceId) {
      return;
    }

    setIsLoading(true);
    try {
      const [docsData, foldersData] = await Promise.all([
        getDocumentsByWorkspace(workspaceId),
        getFoldersByWorkspace(workspaceId)
      ]);


      setDocuments(docsData);
      setFolders(foldersData);
    } catch (error) {
      console.error('[DocumentsView] Error loading documents:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Optimized search and filter
  const filteredDocuments = useMemo(() => {
    let filtered = documents;

    // Search query (optimized with includes for performance)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(doc =>
        doc.title.toLowerCase().includes(query) ||
        doc.content_text?.toLowerCase().includes(query) ||
        doc.lead_name?.toLowerCase().includes(query) ||
        doc.folder_name?.toLowerCase().includes(query)
      );
    }

    // Advanced filters
    if (filters.leadName) {
      const leadQuery = filters.leadName.toLowerCase();
      filtered = filtered.filter(doc =>
        doc.lead_name?.toLowerCase().includes(leadQuery)
      );
    }

    if (filters.folderName) {
      const folderQuery = filters.folderName.toLowerCase();
      filtered = filtered.filter(doc =>
        doc.folder_name?.toLowerCase().includes(folderQuery)
      );
    }

    if (filters.dateFrom) {
      const fromDate = new Date(filters.dateFrom);
      filtered = filtered.filter(doc =>
        new Date(doc.created_at) >= fromDate
      );
    }

    if (filters.dateTo) {
      const toDate = new Date(filters.dateTo);
      toDate.setHours(23, 59, 59, 999); // End of day
      filtered = filtered.filter(doc =>
        new Date(doc.created_at) <= toDate
      );
    }

    return filtered;
  }, [documents, searchQuery, filters]);

  // Group documents by folder
  const groupedDocuments = useMemo(() => {
    const pinned = filteredDocuments.filter(doc => doc.is_pinned);
    const inFolders = new Map<string, DocumentWithLead[]>();
    const rootDocs = filteredDocuments.filter(doc => !doc.folder_id && !doc.is_pinned);

    filteredDocuments.forEach(doc => {
      if (doc.folder_id && !doc.is_pinned) {
        if (!inFolders.has(doc.folder_id)) {
          inFolders.set(doc.folder_id, []);
        }
        inFolders.get(doc.folder_id)!.push(doc);
      }
    });

    return { pinned, inFolders, rootDocs };
  }, [filteredDocuments]);

  // Handlers
  const handleDocumentClick = (doc: DocumentWithLead) => {
    setSelectedDocument(doc);
  };

  const handleSaveDocument = async (content: any) => {
    if (!selectedDocument) return;

    setSaveStatus('saving');
    try {
      await updateDocument(selectedDocument.id, { content, content_text: extractText(content) });
      setSaveStatus('saved');
      loadData();
    } catch (error) {
      console.error('Error saving document:', error);
      setSaveStatus('error');
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    const doc = documents.find(d => d.id === docId);
    setConfirmModal({
      show: true,
      type: 'delete-doc',
      id: docId,
      title: doc?.title || 'este documento'
    });
  };

  const confirmDeleteDocument = async () => {
    try {
      await deleteDocument(confirmModal.id);
      loadData();
      if (selectedDocument?.id === confirmModal.id) {
        setSelectedDocument(null);
      }
      toast.success('Documento deletado!');
    } catch (error) {
      console.error('Error deleting document:', error);
      toast.error('Erro ao deletar documento');
    } finally {
      setConfirmModal({ show: false, type: 'delete-doc', id: '', title: '' });
    }
  };

  const handlePinDocument = async (docId: string, isPinned: boolean) => {
    try {
      await updateDocument(docId, { is_pinned: !isPinned });
      loadData();
    } catch (error) {
      console.error('Error pinning document:', error);
    }
  };

  const handleMoveDocument = async (docId: string, targetFolderId: string | null) => {
    try {
      const { error } = await updateDocument(docId, { folder_id: targetFolderId });

      if (error) {
        console.error('Error moving document:', error);
        toast.error('Erro ao mover documento. Verifique se o documento e a pasta pertencem ao mesmo lead.');
        return;
      }

      toast.success(targetFolderId ? 'Documento movido para pasta!' : 'Documento removido da pasta!');
      loadData();
    } catch (error) {
      console.error('Error moving document:', error);
      toast.error('Erro ao mover documento');
    }
  };

  const handleDragStart = (docId: string) => {
    setDraggedDocId(docId);
  };

  const handleDragOver = (e: React.DragEvent, folderId: string | null) => {
    e.preventDefault();
    setDropTargetFolderId(folderId);
  };

  const handleDragLeave = () => {
    setDropTargetFolderId(null);
  };

  const handleDrop = async (e: React.DragEvent, targetFolderId: string | null) => {
    e.preventDefault();

    if (draggedDocId && draggedDocId !== targetFolderId) {
      await handleMoveDocument(draggedDocId, targetFolderId);
    }

    setDraggedDocId(null);
    setDropTargetFolderId(null);
  };

  const handleCreateDocInFolder = async (folderId: string, leadId: string | null) => {
    try {
      const { document: newDoc, error } = await createDocument({
        lead_id: leadId,
        workspace_id: workspaceId,
        folder_id: folderId,
        title: 'Novo Documento',
        content: { type: 'doc', content: [{ type: 'paragraph' }] },
        content_text: '',
        created_by: userId
      });

      if (error || !newDoc) {
        console.error('Error creating document:', error);
        toast.error('Erro ao criar documento');
        return;
      }

      toast.success('Documento criado!');
      loadData();
      setSelectedDocument(newDoc);
    } catch (error) {
      console.error('Error creating document:', error);
      toast.error('Erro ao criar documento');
    }
  };

  const openRenameFolderModal = (folderId: string, currentName: string) => {
    setEditFolderModal({
      show: true,
      id: folderId,
      name: currentName
    });
  };

  const handleRenameFolder = async () => {
    if (!editFolderModal.name.trim()) {
      toast.error('Nome da pasta não pode estar vazio');
      return;
    }

    try {
      const { folder, error } = await updateFolder(editFolderModal.id, { name: editFolderModal.name.trim() });

      if (error || !folder) {
        console.error('Error renaming folder:', error);
        toast.error('Erro ao renomear pasta');
        return;
      }

      toast.success('Pasta renomeada!');
      loadData();
      setEditFolderModal({ show: false, id: '', name: '' });
    } catch (error) {
      console.error('Error renaming folder:', error);
      toast.error('Erro ao renomear pasta');
    }
  };

  const handleDeleteFolder = (folderId: string) => {
    const folder = folders.find(f => f.id === folderId);
    setConfirmModal({
      show: true,
      type: 'delete-folder',
      id: folderId,
      title: folder?.name || 'esta pasta'
    });
  };

  const confirmDeleteFolder = async () => {
    try {
      const { error } = await deleteFolder(confirmModal.id);

      if (error) {
        console.error('Error deleting folder:', error);
        toast.error('Erro ao deletar pasta');
        return;
      }

      toast.success('Pasta deletada!');
      loadData();
    } catch (error) {
      console.error('Error deleting folder:', error);
      toast.error('Erro ao deletar pasta');
    } finally {
      setConfirmModal({ show: false, type: 'delete-folder', id: '', title: '' });
    }
  };

  const handleDisconnectFromLead = (docId: string) => {
    const doc = documents.find(d => d.id === docId);
    setConfirmModal({
      show: true,
      type: 'disconnect-lead',
      id: docId,
      title: doc?.title || 'este documento'
    });
  };

  const confirmDisconnectFromLead = async () => {
    try {
      const { error } = await updateDocument(confirmModal.id, { lead_id: null });

      if (error) {
        console.error('Error disconnecting from lead:', error);
        toast.error('Erro ao desconectar do lead');
        return;
      }

      toast.success('Documento desconectado do lead!');
      loadData();
    } catch (error) {
      console.error('Error disconnecting from lead:', error);
      toast.error('Erro ao desconectar do lead');
    } finally {
      setConfirmModal({ show: false, type: 'disconnect-lead', id: '', title: '' });
    }
  };

  const toggleFolder = (folderId: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    setExpandedFolders(newExpanded);
  };

  const extractText = (content: any): string => {
    // Simple text extraction from TipTap JSON
    if (!content || !content.content) return '';
    return JSON.stringify(content.content);
  };

  const handleClearFilters = () => {
    setFilters({
      leadName: '',
      folderName: '',
      dateFrom: '',
      dateTo: ''
    });
    setSearchQuery('');
  };

  const handleConfirmAction = async () => {
    switch (confirmModal.type) {
      case 'delete-doc':
        await confirmDeleteDocument();
        break;
      case 'delete-folder':
        await confirmDeleteFolder();
        break;
      case 'disconnect-lead':
        await confirmDisconnectFromLead();
        break;
    }
  };

  if (selectedDocument) {
    return (
      <div className="h-full">
        <DocumentEditor
          document={selectedDocument}
          theme={theme}
          onSave={handleSaveDocument}
          saveStatus={saveStatus}
          onBack={() => setSelectedDocument(null)}
          workspaceId={workspaceId}
          userId={userId}
          startExpanded={true}
        />
      </div>
    );
  }

  return (
    <div className={`h-full flex flex-col ${isDark ? 'bg-true-black' : 'bg-light-bg'}`}>
      {/* Header */}
      <div className={`border-b ${isDark ? 'border-white/[0.08]' : 'border-border-light'} p-6`}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className={`text-2xl font-semibold ${isDark ? 'text-white' : 'text-text-primary-light'}`}>
              Documentos
            </h1>
            <p className={`text-sm mt-1 ${isDark ? 'text-white/50' : 'text-text-secondary-light'}`}>
              Gerencie todos os documentos do workspace
            </p>
          </div>

          <button
            onClick={() => setShowUploadModal(true)}
            className={`px-4 py-2 rounded-lg transition-colors ${
              isDark
                ? 'bg-[#0169D9] hover:bg-[#0159c9] text-white'
                : 'bg-[#0169D9] hover:bg-[#0159c9] text-white'
            }`}
          >
            <Upload className="w-4 h-4 inline mr-2" />
            Novo Documento
          </button>
        </div>

        {/* Search and Filters */}
        <div className="space-y-3">
          <div className="flex gap-2">
            <div className={`flex-1 relative`}>
              <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${
                isDark ? 'text-white/30' : 'text-text-secondary-light'
              }`} />
              <input
                type="text"
                placeholder="Buscar documentos, pastas, leads..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full pl-10 pr-4 py-2 rounded-lg border transition-colors ${
                  isDark
                    ? 'bg-white/[0.03] border-white/[0.08] text-white placeholder:text-white/30 focus:border-[#0169D9]'
                    : 'bg-white border-border-light text-text-primary-light placeholder:text-text-secondary-light focus:border-[#0169D9]'
                } outline-none`}
              />
            </div>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-4 py-2 rounded-lg border transition-colors ${
                showFilters
                  ? 'bg-[#0169D9] border-[#0169D9] text-white'
                  : isDark
                  ? 'bg-white/[0.03] border-white/[0.08] text-white hover:bg-white/[0.05]'
                  : 'bg-white border-border-light text-text-primary-light hover:bg-light-elevated'
              }`}
            >
              <Filter className="w-4 h-4" />
            </button>

            {(searchQuery || Object.values(filters).some(v => v)) && (
              <button
                onClick={handleClearFilters}
                className={`px-4 py-2 rounded-lg border transition-colors ${
                  isDark
                    ? 'bg-white/[0.03] border-white/[0.08] text-white hover:bg-white/[0.05]'
                    : 'bg-white border-border-light text-text-primary-light hover:bg-light-elevated'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Advanced Filters */}
          {showFilters && (
            <div className={`p-4 rounded-lg border grid grid-cols-2 gap-3 ${
              isDark ? 'bg-white/[0.03] border-white/[0.08]' : 'bg-white border-border-light'
            }`}>
              <input
                type="text"
                placeholder="Filtrar por lead..."
                value={filters.leadName}
                onChange={(e) => setFilters(prev => ({ ...prev, leadName: e.target.value }))}
                className={`px-3 py-2 rounded-lg border text-sm ${
                  isDark
                    ? 'bg-white/[0.03] border-white/[0.08] text-white placeholder:text-white/30'
                    : 'bg-white border-border-light text-text-primary-light placeholder:text-text-secondary-light'
                } outline-none`}
              />

              <input
                type="text"
                placeholder="Filtrar por pasta..."
                value={filters.folderName}
                onChange={(e) => setFilters(prev => ({ ...prev, folderName: e.target.value }))}
                className={`px-3 py-2 rounded-lg border text-sm ${
                  isDark
                    ? 'bg-white/[0.03] border-white/[0.08] text-white placeholder:text-white/30'
                    : 'bg-white border-border-light text-text-primary-light placeholder:text-text-secondary-light'
                } outline-none`}
              />

              <input
                type="date"
                placeholder="Data de..."
                value={filters.dateFrom}
                onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                className={`px-3 py-2 rounded-lg border text-sm ${
                  isDark
                    ? 'bg-white/[0.03] border-white/[0.08] text-white'
                    : 'bg-white border-border-light text-text-primary-light'
                } outline-none`}
              />

              <input
                type="date"
                placeholder="Data até..."
                value={filters.dateTo}
                onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                className={`px-3 py-2 rounded-lg border text-sm ${
                  isDark
                    ? 'bg-white/[0.03] border-white/[0.08] text-white'
                    : 'bg-white border-border-light text-text-primary-light'
                } outline-none`}
              />
            </div>
          )}
        </div>

        {/* Results count */}
        <div className={`mt-3 text-sm ${isDark ? 'text-white/50' : 'text-text-secondary-light'}`}>
          {filteredDocuments.length} {filteredDocuments.length === 1 ? 'documento encontrado' : 'documentos encontrados'}
        </div>
      </div>

      {/* Documents List */}
      <div className="flex-1 overflow-y-auto scrollbar-thin p-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className={`text-sm ${isDark ? 'text-white/50' : 'text-text-secondary-light'}`}>
              Carregando documentos...
            </div>
          </div>
        ) : filteredDocuments.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64">
            <FileText className={`w-12 h-12 mb-3 ${isDark ? 'text-white/20' : 'text-text-secondary-light/50'}`} />
            <p className={`text-sm ${isDark ? 'text-white/50' : 'text-text-secondary-light'}`}>
              Nenhum documento encontrado
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Pinned Documents */}
            {groupedDocuments.pinned.length > 0 && (
              <div>
                <h3 className={`text-xs font-medium mb-2 ${isDark ? 'text-white/50' : 'text-text-secondary-light'}`}>
                  FIXADOS
                </h3>
                <div className="space-y-1">
                  {groupedDocuments.pinned.map(doc => (
                    <DocumentRow
                      key={doc.id}
                      document={doc}
                      isDark={isDark}
                      onClick={() => handleDocumentClick(doc)}
                      onDelete={() => handleDeleteDocument(doc.id)}
                      onPin={() => handlePinDocument(doc.id, doc.is_pinned)}
                      onNavigateToLead={onNavigateToLead}
                      onDragStart={() => handleDragStart(doc.id)}
                      onDisconnectFromLead={() => handleDisconnectFromLead(doc.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Folders */}
            {folders.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className={`text-xs font-medium ${isDark ? 'text-white/50' : 'text-text-secondary-light'}`}>
                    PASTAS ({folders.length})
                  </h3>
                  {folders.length > itemsPerPage && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setFoldersPage(Math.max(1, foldersPage - 1))}
                        disabled={foldersPage === 1}
                        className={`px-2 py-1 text-xs rounded transition-colors ${
                          foldersPage === 1
                            ? isDark ? 'text-white/20 cursor-not-allowed' : 'text-text-secondary-light/50 cursor-not-allowed'
                            : isDark ? 'text-white/50 hover:bg-white/[0.05]' : 'text-text-secondary-light hover:bg-light-elevated'
                        }`}
                      >
                        Anterior
                      </button>
                      <span className={`text-xs ${isDark ? 'text-white/50' : 'text-text-secondary-light'}`}>
                        {foldersPage} / {Math.ceil(folders.length / itemsPerPage)}
                      </span>
                      <button
                        onClick={() => setFoldersPage(Math.min(Math.ceil(folders.length / itemsPerPage), foldersPage + 1))}
                        disabled={foldersPage >= Math.ceil(folders.length / itemsPerPage)}
                        className={`px-2 py-1 text-xs rounded transition-colors ${
                          foldersPage >= Math.ceil(folders.length / itemsPerPage)
                            ? isDark ? 'text-white/20 cursor-not-allowed' : 'text-text-secondary-light/50 cursor-not-allowed'
                            : isDark ? 'text-white/50 hover:bg-white/[0.05]' : 'text-text-secondary-light hover:bg-light-elevated'
                        }`}
                      >
                        Próxima
                      </button>
                    </div>
                  )}
                </div>

                {folders
                  .slice((foldersPage - 1) * itemsPerPage, foldersPage * itemsPerPage)
                  .map(folder => {
                    const folderDocs = groupedDocuments.inFolders.get(folder.id) || [];
                    const isExpanded = expandedFolders.has(folder.id);

                    return (
                      <div key={folder.id}>
                        <div
                          className={`group flex items-start gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${
                            dropTargetFolderId === folder.id
                              ? isDark ? 'bg-[#0169D9]/20 border-2 border-[#0169D9]' : 'bg-[#0169D9]/10 border-2 border-[#0169D9]'
                              : isDark ? 'hover:bg-white/[0.03]' : 'hover:bg-light-elevated'
                          }`}
                          onDragOver={(e) => handleDragOver(e, folder.id)}
                          onDragLeave={handleDragLeave}
                          onDrop={(e) => handleDrop(e, folder.id)}
                        >
                          <div className="pt-0.5" onClick={() => toggleFolder(folder.id)}>
                            {isExpanded ? (
                              <FolderOpen className="w-4 h-4 flex-shrink-0" style={{ color: folder.color }} />
                            ) : (
                              <Folder className="w-4 h-4 flex-shrink-0" style={{ color: folder.color }} />
                            )}
                          </div>

                          <div className="flex-1 min-w-0" onClick={() => toggleFolder(folder.id)}>
                            <div className={`text-sm font-medium ${isDark ? 'text-white' : 'text-text-primary-light'}`}>
                              {folder.name}
                            </div>
                            <div className={`flex items-center gap-3 text-xs mt-0.5 ${isDark ? 'text-white/30' : 'text-text-secondary-light'}`}>
                              <span className="flex items-center gap-1">
                                <User className="w-3 h-3" />
                                {folder.lead_name}
                              </span>
                              <span className="flex items-center gap-1">
                                <CalendarIcon className="w-3 h-3" />
                                {new Date(folder.created_at).toLocaleDateString('pt-BR')}
                              </span>
                              <span className="flex items-center gap-1">
                                {folderDocs.length} {folderDocs.length === 1 ? 'documento' : 'documentos'}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCreateDocInFolder(folder.id, folder.lead_id);
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
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openRenameFolderModal(folder.id, folder.name);
                              }}
                              className={`p-1.5 rounded transition-all ${
                                isDark
                                  ? 'hover:bg-white/[0.08] text-white/40 hover:text-white'
                                  : 'hover:bg-gray-200 text-gray-400 hover:text-gray-700'
                              }`}
                              title="Renomear pasta"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteFolder(folder.id);
                              }}
                              className={`p-1.5 rounded transition-all ${
                                isDark
                                  ? 'hover:bg-red-500/10 text-white/40 hover:text-red-400'
                                  : 'hover:bg-red-50 text-gray-400 hover:text-red-600'
                              }`}
                              title="Deletar pasta"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="ml-6 space-y-1">
                            {folderDocs.length === 0 ? (
                              <p className={`px-3 py-2 text-xs ${isDark ? 'text-white/30' : 'text-text-secondary-light'}`}>
                                Pasta vazia
                              </p>
                            ) : (
                              folderDocs.map(doc => (
                                <DocumentRow
                                  key={doc.id}
                                  document={doc}
                                  isDark={isDark}
                                  onClick={() => handleDocumentClick(doc)}
                                  onDelete={() => handleDeleteDocument(doc.id)}
                                  onPin={() => handlePinDocument(doc.id, doc.is_pinned)}
                                  onNavigateToLead={onNavigateToLead}
                                  onDragStart={() => handleDragStart(doc.id)}
                                  onRemoveFromFolder={() => handleMoveDocument(doc.id, null)}
                                  onDisconnectFromLead={() => handleDisconnectFromLead(doc.id)}
                                />
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            )}

            {/* Root Documents */}
            {groupedDocuments.rootDocs.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className={`text-xs font-medium ${isDark ? 'text-white/50' : 'text-text-secondary-light'}`}>
                    SEM PASTA ({groupedDocuments.rootDocs.length})
                  </h3>
                  {groupedDocuments.rootDocs.length > itemsPerPage && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setRootDocsPage(Math.max(1, rootDocsPage - 1))}
                        disabled={rootDocsPage === 1}
                        className={`px-2 py-1 text-xs rounded transition-colors ${
                          rootDocsPage === 1
                            ? isDark ? 'text-white/20 cursor-not-allowed' : 'text-text-secondary-light/50 cursor-not-allowed'
                            : isDark ? 'text-white/50 hover:bg-white/[0.05]' : 'text-text-secondary-light hover:bg-light-elevated'
                        }`}
                      >
                        Anterior
                      </button>
                      <span className={`text-xs ${isDark ? 'text-white/50' : 'text-text-secondary-light'}`}>
                        {rootDocsPage} / {Math.ceil(groupedDocuments.rootDocs.length / itemsPerPage)}
                      </span>
                      <button
                        onClick={() => setRootDocsPage(Math.min(Math.ceil(groupedDocuments.rootDocs.length / itemsPerPage), rootDocsPage + 1))}
                        disabled={rootDocsPage >= Math.ceil(groupedDocuments.rootDocs.length / itemsPerPage)}
                        className={`px-2 py-1 text-xs rounded transition-colors ${
                          rootDocsPage >= Math.ceil(groupedDocuments.rootDocs.length / itemsPerPage)
                            ? isDark ? 'text-white/20 cursor-not-allowed' : 'text-text-secondary-light/50 cursor-not-allowed'
                            : isDark ? 'text-white/50 hover:bg-white/[0.05]' : 'text-text-secondary-light hover:bg-light-elevated'
                        }`}
                      >
                        Próxima
                      </button>
                    </div>
                  )}
                </div>
                <div className="space-y-1">
                  {groupedDocuments.rootDocs
                    .slice((rootDocsPage - 1) * itemsPerPage, rootDocsPage * itemsPerPage)
                    .map(doc => (
                      <DocumentRow
                        key={doc.id}
                        document={doc}
                        isDark={isDark}
                        onClick={() => handleDocumentClick(doc)}
                        onDelete={() => handleDeleteDocument(doc.id)}
                        onPin={() => handlePinDocument(doc.id, doc.is_pinned)}
                        onNavigateToLead={onNavigateToLead}
                        onDragStart={() => handleDragStart(doc.id)}
                        onDisconnectFromLead={() => handleDisconnectFromLead(doc.id)}
                      />
                    ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Upload Modal */}
      <UploadDocumentModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        theme={theme}
        workspaceId={workspaceId}
        userId={userId}
        leads={leads}
        folders={folders}
        onSuccess={loadData}
      />

      {/* Edit Folder Modal */}
      {editFolderModal.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setEditFolderModal({ show: false, id: '', name: '' })} />

          <div className={`relative w-full max-w-md mx-4 rounded-lg shadow-xl p-6 ${
            isDark ? 'bg-true-black border border-white/[0.08]' : 'bg-white border border-border-light'
          }`}>
            <h3 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-text-primary-light'}`}>
              Renomear Pasta
            </h3>

            <input
              type="text"
              value={editFolderModal.name}
              onChange={(e) => setEditFolderModal(prev => ({ ...prev, name: e.target.value }))}
              onKeyDown={(e) => e.key === 'Enter' && handleRenameFolder()}
              placeholder="Nome da pasta..."
              autoFocus
              className={`w-full px-3 py-2 rounded-lg border outline-none transition-colors ${
                isDark
                  ? 'bg-white/[0.03] border-white/[0.08] text-white placeholder:text-white/30 focus:border-[#0169D9]'
                  : 'bg-white border-border-light text-text-primary-light placeholder:text-text-secondary-light focus:border-[#0169D9]'
              }`}
            />

            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                onClick={() => setEditFolderModal({ show: false, id: '', name: '' })}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  isDark
                    ? 'hover:bg-white/[0.05] text-white/70'
                    : 'hover:bg-light-elevated text-text-secondary-light'
                }`}
              >
                Cancelar
              </button>

              <button
                onClick={handleRenameFolder}
                disabled={!editFolderModal.name.trim()}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  !editFolderModal.name.trim()
                    ? isDark
                      ? 'bg-white/[0.05] text-white/30 cursor-not-allowed'
                      : 'bg-light-elevated text-text-secondary-light cursor-not-allowed'
                    : 'bg-[#0169D9] hover:bg-[#0159c9] text-white'
                }`}
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Modal */}
      {confirmModal.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setConfirmModal({ show: false, type: 'delete-doc', id: '', title: '' })} />

          <div className={`relative w-full max-w-md mx-4 rounded-lg shadow-xl p-6 ${
            isDark ? 'bg-true-black border border-white/[0.08]' : 'bg-white border border-border-light'
          }`}>
            <h3 className={`text-lg font-semibold mb-2 ${isDark ? 'text-white' : 'text-text-primary-light'}`}>
              {confirmModal.type === 'delete-doc' && 'Deletar documento'}
              {confirmModal.type === 'delete-folder' && 'Deletar pasta'}
              {confirmModal.type === 'disconnect-lead' && 'Desconectar do lead'}
            </h3>

            <p className={`text-sm mb-6 ${isDark ? 'text-white/70' : 'text-text-secondary-light'}`}>
              {confirmModal.type === 'delete-doc' && `Tem certeza que deseja deletar "${confirmModal.title}"?`}
              {confirmModal.type === 'delete-folder' && `Tem certeza que deseja deletar a pasta "${confirmModal.title}"? Os documentos dentro dela não serão deletados.`}
              {confirmModal.type === 'disconnect-lead' && `Desconectar "${confirmModal.title}" do lead? O documento ficará sem associação.`}
            </p>

            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setConfirmModal({ show: false, type: 'delete-doc', id: '', title: '' })}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  isDark
                    ? 'hover:bg-white/[0.05] text-white/70'
                    : 'hover:bg-light-elevated text-text-secondary-light'
                }`}
              >
                Cancelar
              </button>

              <button
                onClick={handleConfirmAction}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  confirmModal.type === 'delete-doc' || confirmModal.type === 'delete-folder'
                    ? 'bg-red-500 hover:bg-red-600 text-white'
                    : 'bg-orange-500 hover:bg-orange-600 text-white'
                }`}
              >
                {confirmModal.type === 'delete-doc' && 'Deletar'}
                {confirmModal.type === 'delete-folder' && 'Deletar Pasta'}
                {confirmModal.type === 'disconnect-lead' && 'Desconectar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Document Row Component
interface DocumentRowProps {
  document: DocumentWithLead;
  isDark: boolean;
  onClick: () => void;
  onDelete: () => void;
  onPin: () => void;
  onNavigateToLead?: (leadId: string) => void;
  onDragStart?: () => void;
  onRemoveFromFolder?: () => void;
  onDisconnectFromLead?: () => void;
}

function DocumentRow({ document, isDark, onClick, onDelete, onPin, onNavigateToLead, onDragStart, onRemoveFromFolder, onDisconnectFromLead }: DocumentRowProps) {
  const [showActions, setShowActions] = useState(false);

  return (
    <div
      draggable
      onDragStart={() => onDragStart?.()}
      className={`group flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-move transition-colors ${
        isDark ? 'hover:bg-white/[0.03]' : 'hover:bg-light-elevated'
      }`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <FileText className={`w-4 h-4 flex-shrink-0 ${isDark ? 'text-white/30' : 'text-text-secondary-light'}`} />

      <div className="flex-1 min-w-0" onClick={onClick}>
        <div className="flex items-center gap-2">
          <p className={`text-sm font-medium truncate ${isDark ? 'text-white' : 'text-text-primary-light'}`}>
            {document.title}
          </p>
          {document.is_pinned && (
            <Pin className="w-3 h-3 text-[#0169D9] flex-shrink-0" />
          )}
        </div>

        <div className={`flex items-center gap-3 text-xs mt-0.5 ${isDark ? 'text-white/30' : 'text-text-secondary-light'}`}>
          {document.lead_name && (
            <span className="flex items-center gap-1">
              <User className="w-3 h-3" />
              {document.lead_name}
            </span>
          )}
          {document.folder_name && (
            <span className="flex items-center gap-1">
              <Folder className="w-3 h-3" style={{ color: document.folder_color }} />
              {document.folder_name}
            </span>
          )}
          <span className="flex items-center gap-1">
            <CalendarIcon className="w-3 h-3" />
            {new Date(document.created_at).toLocaleDateString('pt-BR')}
          </span>
        </div>
      </div>

      {showActions && (
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={(e) => { e.stopPropagation(); onPin(); }}
            className={`p-1.5 rounded transition-colors ${
              isDark ? 'hover:bg-white/[0.08]' : 'hover:bg-light-elevated-hover'
            }`}
            title={document.is_pinned ? 'Desafixar' : 'Fixar'}
          >
            {document.is_pinned ? (
              <PinOff className={`w-3.5 h-3.5 ${isDark ? 'text-white/50' : 'text-text-secondary-light'}`} />
            ) : (
              <Pin className={`w-3.5 h-3.5 ${isDark ? 'text-white/50' : 'text-text-secondary-light'}`} />
            )}
          </button>

          {onRemoveFromFolder && document.folder_id && (
            <button
              onClick={(e) => { e.stopPropagation(); onRemoveFromFolder(); }}
              className={`p-1.5 rounded transition-colors ${
                isDark ? 'hover:bg-white/[0.08]' : 'hover:bg-light-elevated-hover'
              }`}
              title="Remover da pasta"
            >
              <FolderInput className={`w-3.5 h-3.5 ${isDark ? 'text-white/50' : 'text-text-secondary-light'}`} />
            </button>
          )}

          {onNavigateToLead && document.lead_id && (
            <button
              onClick={(e) => { e.stopPropagation(); onNavigateToLead(document.lead_id); }}
              className={`p-1.5 rounded transition-colors ${
                isDark ? 'hover:bg-white/[0.08]' : 'hover:bg-light-elevated-hover'
              }`}
              title="Ir para o lead"
            >
              <ExternalLink className={`w-3.5 h-3.5 ${isDark ? 'text-white/50' : 'text-text-secondary-light'}`} />
            </button>
          )}

          {onDisconnectFromLead && document.lead_id && (
            <button
              onClick={(e) => { e.stopPropagation(); onDisconnectFromLead(); }}
              className={`p-1.5 rounded transition-colors ${
                isDark ? 'hover:bg-orange-500/10' : 'hover:bg-orange-50'
              }`}
              title="Desconectar do lead"
            >
              <UserX className={`w-3.5 h-3.5 ${isDark ? 'text-orange-400' : 'text-orange-500'}`} />
            </button>
          )}

          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className={`p-1.5 rounded transition-colors ${
              isDark ? 'hover:bg-red-500/10' : 'hover:bg-red-50'
            }`}
            title="Deletar"
          >
            <Trash2 className={`w-3.5 h-3.5 ${isDark ? 'text-red-400' : 'text-red-500'}`} />
          </button>
        </div>
      )}
    </div>
  );
}
