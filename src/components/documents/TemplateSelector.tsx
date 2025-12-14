/**
 * Template Selector Component
 * Modal to select a template when creating a new document
 */

import { useState, useEffect } from 'react';
import { X, FileText, Plus, Trash2, Loader2 } from 'lucide-react';
import type { LeadDocumentTemplate } from '../../types/documents';
import { getTemplatesByWorkspace, deleteTemplate } from '../../services/documents-service';

interface TemplateSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (template: LeadDocumentTemplate | null) => void;
  workspaceId: string;
  theme?: 'dark' | 'light';
}

export function TemplateSelector({
  isOpen,
  onClose,
  onSelectTemplate,
  workspaceId,
  theme = 'dark',
}: TemplateSelectorProps) {
  const [templates, setTemplates] = useState<LeadDocumentTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const isDark = theme === 'dark';

  // Load templates
  useEffect(() => {
    if (isOpen && workspaceId) {
      loadTemplates();
    }
  }, [isOpen, workspaceId]);

  const loadTemplates = async () => {
    setLoading(true);
    const { templates: data } = await getTemplatesByWorkspace(workspaceId);
    setTemplates(data);
    setLoading(false);
  };

  const handleDeleteTemplate = async (e: React.MouseEvent, templateId: string) => {
    e.stopPropagation();
    if (deletingId) return;

    setDeletingId(templateId);
    const { error } = await deleteTemplate(templateId);
    if (!error) {
      setTemplates(prev => prev.filter(t => t.id !== templateId));
    }
    setDeletingId(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center" style={{ zIndex: 10001 }}>
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className={`relative w-full max-w-lg mx-4 rounded-xl shadow-2xl ${
          isDark ? 'bg-[#1a1a1a]' : 'bg-white'
        }`}
      >
        {/* Header */}
        <div className={`flex items-center justify-between px-5 py-4 border-b ${
          isDark ? 'border-white/10' : 'border-gray-200'
        }`}>
          <h2 className={`text-lg font-semibold ${
            isDark ? 'text-white' : 'text-gray-900'
          }`}>
            Criar Documento
          </h2>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-lg transition-colors ${
              isDark
                ? 'text-white/60 hover:text-white hover:bg-white/10'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5">
          {/* Create Blank */}
          <button
            onClick={() => onSelectTemplate(null)}
            className={`w-full flex items-center gap-3 p-4 rounded-lg border-2 border-dashed transition-colors mb-4 ${
              isDark
                ? 'border-white/20 hover:border-blue-500 hover:bg-blue-500/10'
                : 'border-gray-300 hover:border-blue-500 hover:bg-blue-50'
            }`}
          >
            <div className={`p-2 rounded-lg ${
              isDark ? 'bg-blue-500/20' : 'bg-blue-100'
            }`}>
              <Plus className="w-5 h-5 text-blue-500" />
            </div>
            <div className="text-left">
              <p className={`font-medium ${
                isDark ? 'text-white' : 'text-gray-900'
              }`}>
                Documento em Branco
              </p>
              <p className={`text-sm ${
                isDark ? 'text-white/50' : 'text-gray-500'
              }`}>
                Comece do zero
              </p>
            </div>
          </button>

          {/* Templates List */}
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className={`w-6 h-6 animate-spin ${
                isDark ? 'text-white/40' : 'text-gray-400'
              }`} />
            </div>
          ) : templates.length > 0 ? (
            <>
              <div className={`text-xs font-medium uppercase tracking-wider mb-3 ${
                isDark ? 'text-white/40' : 'text-gray-400'
              }`}>
                Templates ({templates.length})
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {templates.map(template => (
                  <button
                    key={template.id}
                    onClick={() => onSelectTemplate(template)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors group ${
                      isDark
                        ? 'hover:bg-white/5'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className={`p-2 rounded-lg ${
                      isDark ? 'bg-white/10' : 'bg-gray-100'
                    }`}>
                      <FileText className={`w-4 h-4 ${
                        isDark ? 'text-white/60' : 'text-gray-500'
                      }`} />
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <p className={`font-medium truncate ${
                        isDark ? 'text-white' : 'text-gray-900'
                      }`}>
                        {template.title}
                      </p>
                      {template.description && (
                        <p className={`text-xs truncate ${
                          isDark ? 'text-white/50' : 'text-gray-500'
                        }`}>
                          {template.description}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={(e) => handleDeleteTemplate(e, template.id)}
                      disabled={deletingId === template.id}
                      className={`p-1.5 rounded-lg transition-colors ${
                        isDark
                          ? 'text-red-400 hover:bg-red-500/10'
                          : 'text-red-600 hover:bg-red-50'
                      } ${deletingId === template.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                      title="Excluir template"
                    >
                      {deletingId === template.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div className={`text-center py-6 ${
              isDark ? 'text-white/40' : 'text-gray-400'
            }`}>
              <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Nenhum template criado</p>
              <p className="text-xs mt-1">
                Crie um documento e salve como template
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default TemplateSelector;
