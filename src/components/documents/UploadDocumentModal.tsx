import { useState, useEffect } from 'react';
import { X, Upload, Search, Folder, FileText } from 'lucide-react';
import { Theme } from '../../hooks/useTheme';
import { CRMLead } from '../../types/crm';
import { LeadDocumentFolder } from '../../types/documents';
import { createDocument } from '../../services/documents-service';

interface UploadDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: Theme;
  workspaceId: string;
  userId: string;
  leads: CRMLead[];
  folders: LeadDocumentFolder[];
  onSuccess: () => void;
}

export function UploadDocumentModal({
  isOpen,
  onClose,
  theme,
  workspaceId,
  userId,
  leads,
  folders,
  onSuccess
}: UploadDocumentModalProps) {
  const isDark = theme === 'dark';
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLead, setSelectedLead] = useState<CRMLead | null>(null);
  const [selectedFolder, setSelectedFolder] = useState<LeadDocumentFolder | null>(null);
  const [documentTitle, setDocumentTitle] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setSelectedLead(null);
      setSelectedFolder(null);
      setDocumentTitle('');
    }
  }, [isOpen]);

  const filteredLeads = leads.filter(lead => {
    const query = searchQuery.toLowerCase();
    return (
      lead.name?.toLowerCase().includes(query) ||
      lead.email?.toLowerCase().includes(query) ||
      lead.whatsapp?.includes(searchQuery)
    );
  });

  const availableFolders = selectedLead
    ? folders.filter(f => f.lead_id === selectedLead.id)
    : [];

  const handleCreate = async () => {
    if (!documentTitle.trim()) return;

    setIsCreating(true);
    try {
      await createDocument({
        lead_id: selectedLead?.id || null,
        workspace_id: workspaceId,
        folder_id: selectedFolder?.id,
        title: documentTitle.trim(),
        content: { type: 'doc', content: [{ type: 'paragraph' }] },
        content_text: '',
        created_by: userId
      });

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error creating document:', error);
      alert('Erro ao criar documento');
    } finally {
      setIsCreating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className={`relative w-full max-w-lg mx-4 rounded-lg shadow-xl ${
          isDark ? 'bg-true-black border border-white/[0.08]' : 'bg-white border border-border-light'
        }`}
      >
        {/* Header */}
        <div className={`flex items-center justify-between p-6 border-b ${
          isDark ? 'border-white/[0.08]' : 'border-border-light'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${
              isDark ? 'bg-[#0169D9]/10' : 'bg-[#0169D9]/10'
            }`}>
              <FileText className="w-5 h-5 text-[#0169D9]" />
            </div>
            <div>
              <h2 className={`text-lg font-semibold ${
                isDark ? 'text-white' : 'text-text-primary-light'
              }`}>
                Novo Documento
              </h2>
              <p className={`text-sm ${
                isDark ? 'text-white/50' : 'text-text-secondary-light'
              }`}>
                Crie um documento (lead opcional)
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className={`p-2 rounded-lg transition-colors ${
              isDark
                ? 'hover:bg-white/[0.05] text-white/50 hover:text-white'
                : 'hover:bg-light-elevated text-text-secondary-light hover:text-text-primary-light'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Document Title */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${
              isDark ? 'text-white' : 'text-text-primary-light'
            }`}>
              Título do Documento
            </label>
            <input
              type="text"
              value={documentTitle}
              onChange={(e) => setDocumentTitle(e.target.value)}
              placeholder="Digite o título do documento..."
              className={`w-full px-3 py-2 rounded-lg border outline-none transition-colors ${
                isDark
                  ? 'bg-white/[0.03] border-white/[0.08] text-white placeholder:text-white/30 focus:border-[#0169D9]'
                  : 'bg-white border-border-light text-text-primary-light placeholder:text-text-secondary-light focus:border-[#0169D9]'
              }`}
            />
          </div>

          {/* Lead Selection */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${
              isDark ? 'text-white' : 'text-text-primary-light'
            }`}>
              Selecionar Lead (Opcional)
            </label>

            {/* Search */}
            <div className="relative mb-2">
              <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${
                isDark ? 'text-white/30' : 'text-text-secondary-light'
              }`} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar lead..."
                className={`w-full pl-10 pr-4 py-2 rounded-lg border outline-none transition-colors ${
                  isDark
                    ? 'bg-white/[0.03] border-white/[0.08] text-white placeholder:text-white/30 focus:border-[#0169D9]'
                    : 'bg-white border-border-light text-text-primary-light placeholder:text-text-secondary-light focus:border-[#0169D9]'
                }`}
              />
            </div>

            {/* Selected Lead */}
            {selectedLead ? (
              <div className={`p-3 rounded-lg border flex items-center justify-between ${
                isDark ? 'bg-[#0169D9]/10 border-[#0169D9]/20' : 'bg-[#0169D9]/5 border-[#0169D9]/20'
              }`}>
                <div>
                  <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-text-primary-light'}`}>
                    {selectedLead.name}
                  </p>
                  {selectedLead.email && (
                    <p className={`text-xs ${isDark ? 'text-white/50' : 'text-text-secondary-light'}`}>
                      {selectedLead.email}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => setSelectedLead(null)}
                  className={`p-1 rounded transition-colors ${
                    isDark ? 'hover:bg-white/[0.08]' : 'hover:bg-light-elevated'
                  }`}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className={`max-h-48 overflow-y-auto scrollbar-thin rounded-lg border ${
                isDark ? 'border-white/[0.08]' : 'border-border-light'
              }`}>
                {/* Opção "Sem Lead" */}
                <button
                  onClick={() => setSelectedLead({ id: '', name: 'Sem Lead' } as any)}
                  className={`w-full p-3 text-left transition-colors border-b ${
                    isDark
                      ? 'border-white/[0.08] hover:bg-white/[0.03]'
                      : 'border-border-light hover:bg-light-elevated'
                  }`}
                >
                  <p className={`text-sm font-medium italic ${
                    isDark ? 'text-white/70' : 'text-text-secondary-light'
                  }`}>
                    Sem Lead (Documento compartilhado)
                  </p>
                </button>

                {filteredLeads.length === 0 ? (
                  <div className={`p-4 text-center text-sm ${
                    isDark ? 'text-white/50' : 'text-text-secondary-light'
                  }`}>
                    Nenhum lead encontrado
                  </div>
                ) : (
                  filteredLeads.map(lead => (
                    <button
                      key={lead.id}
                      onClick={() => setSelectedLead(lead)}
                      className={`w-full p-3 text-left transition-colors border-b last:border-b-0 ${
                        isDark
                          ? 'border-white/[0.08] hover:bg-white/[0.03]'
                          : 'border-border-light hover:bg-light-elevated'
                      }`}
                    >
                      <p className={`text-sm font-medium ${
                        isDark ? 'text-white' : 'text-text-primary-light'
                      }`}>
                        {lead.name}
                      </p>
                      {lead.email && (
                        <p className={`text-xs mt-0.5 ${
                          isDark ? 'text-white/50' : 'text-text-secondary-light'
                        }`}>
                          {lead.email}
                        </p>
                      )}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Folder Selection (Optional) */}
          {selectedLead && availableFolders.length > 0 && (
            <div>
              <label className={`block text-sm font-medium mb-2 ${
                isDark ? 'text-white' : 'text-text-primary-light'
              }`}>
                Pasta (Opcional)
              </label>

              <div className="space-y-1">
                <button
                  onClick={() => setSelectedFolder(null)}
                  className={`w-full p-2 rounded-lg text-left text-sm transition-colors ${
                    !selectedFolder
                      ? isDark
                        ? 'bg-[#0169D9]/10 border border-[#0169D9]/20 text-white'
                        : 'bg-[#0169D9]/5 border border-[#0169D9]/20 text-text-primary-light'
                      : isDark
                      ? 'hover:bg-white/[0.03] text-white/70'
                      : 'hover:bg-light-elevated text-text-secondary-light'
                  }`}>
                  <Folder className="w-4 h-4 inline mr-2" />
                  Sem pasta
                </button>

                {availableFolders.map(folder => (
                  <button
                    key={folder.id}
                    onClick={() => setSelectedFolder(folder)}
                    className={`w-full p-2 rounded-lg text-left text-sm transition-colors ${
                      selectedFolder?.id === folder.id
                        ? isDark
                          ? 'bg-[#0169D9]/10 border border-[#0169D9]/20 text-white'
                          : 'bg-[#0169D9]/5 border border-[#0169D9]/20 text-text-primary-light'
                        : isDark
                        ? 'hover:bg-white/[0.03] text-white/70'
                        : 'hover:bg-light-elevated text-text-secondary-light'
                    }`}
                  >
                    <Folder
                      className="w-4 h-4 inline mr-2"
                      style={{ color: folder.color }}
                    />
                    {folder.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`flex items-center justify-end gap-3 p-6 border-t ${
          isDark ? 'border-white/[0.08]' : 'border-border-light'
        }`}>
          <button
            onClick={onClose}
            className={`px-4 py-2 rounded-lg transition-colors ${
              isDark
                ? 'hover:bg-white/[0.05] text-white/70'
                : 'hover:bg-light-elevated text-text-secondary-light'
            }`}
          >
            Cancelar
          </button>

          <button
            onClick={handleCreate}
            disabled={!documentTitle.trim() || isCreating}
            className={`px-4 py-2 rounded-lg transition-colors ${
              !documentTitle.trim()
                ? isDark
                  ? 'bg-white/[0.05] text-white/30 cursor-not-allowed'
                  : 'bg-light-elevated text-text-secondary-light cursor-not-allowed'
                : 'bg-[#0169D9] hover:bg-[#0159c9] text-white'
            }`}
          >
            {isCreating ? (
              <>
                <Upload className="w-4 h-4 inline mr-2 animate-pulse" />
                Criando...
              </>
            ) : (
              <>
                <FileText className="w-4 h-4 inline mr-2" />
                Criar Documento
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
