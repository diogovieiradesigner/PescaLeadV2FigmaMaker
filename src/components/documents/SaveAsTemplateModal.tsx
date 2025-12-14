/**
 * Save As Template Modal
 * Modal to save current document as a reusable template
 */

import { useState } from 'react';
import { X, FileText, Loader2 } from 'lucide-react';
import type { JSONContent } from '@tiptap/react';
import { createTemplate } from '../../services/documents-service';
import { extractTextFromContent } from '../../services/documents-service';

interface SaveAsTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  content: JSONContent;
  defaultTitle: string;
  workspaceId: string;
  userId: string;
  theme?: 'dark' | 'light';
}

export function SaveAsTemplateModal({
  isOpen,
  onClose,
  onSaved,
  content,
  defaultTitle,
  workspaceId,
  userId,
  theme = 'dark',
}: SaveAsTemplateModalProps) {
  const [title, setTitle] = useState(defaultTitle ? `Template: ${defaultTitle}` : '');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isDark = theme === 'dark';

  const handleSave = async () => {
    if (!title.trim()) {
      setError('Digite um nome para o template');
      return;
    }

    setSaving(true);
    setError(null);

    const { template, error: saveError } = await createTemplate({
      workspace_id: workspaceId,
      title: title.trim(),
      description: description.trim() || undefined,
      content,
      content_text: extractTextFromContent(content),
      created_by: userId,
    });

    setSaving(false);

    if (saveError || !template) {
      setError('Erro ao salvar template. Tente novamente.');
      return;
    }

    onSaved();
    onClose();
  };

  const handleClose = () => {
    setTitle('');
    setDescription('');
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center" style={{ zIndex: 10001 }}>
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div
        className={`relative w-full max-w-md mx-4 rounded-xl shadow-2xl ${
          isDark ? 'bg-[#1a1a1a]' : 'bg-white'
        }`}
      >
        {/* Header */}
        <div className={`flex items-center justify-between px-5 py-4 border-b ${
          isDark ? 'border-white/10' : 'border-gray-200'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${
              isDark ? 'bg-blue-500/20' : 'bg-blue-100'
            }`}>
              <FileText className="w-5 h-5 text-blue-500" />
            </div>
            <h2 className={`text-lg font-semibold ${
              isDark ? 'text-white' : 'text-gray-900'
            }`}>
              Salvar como Template
            </h2>
          </div>
          <button
            onClick={handleClose}
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
        <div className="p-5 space-y-4">
          {/* Title */}
          <div>
            <label className={`block text-sm font-medium mb-1.5 ${
              isDark ? 'text-white/70' : 'text-gray-700'
            }`}>
              Nome do Template *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Proposta Comercial"
              className={`w-full px-3 py-2 rounded-lg border transition-colors ${
                isDark
                  ? 'bg-white/5 border-white/10 text-white placeholder-white/30 focus:border-blue-500'
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-blue-500'
              } focus:outline-none focus:ring-1 focus:ring-blue-500`}
            />
          </div>

          {/* Description */}
          <div>
            <label className={`block text-sm font-medium mb-1.5 ${
              isDark ? 'text-white/70' : 'text-gray-700'
            }`}>
              Descrição (opcional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Breve descrição do template..."
              rows={2}
              className={`w-full px-3 py-2 rounded-lg border transition-colors resize-none ${
                isDark
                  ? 'bg-white/5 border-white/10 text-white placeholder-white/30 focus:border-blue-500'
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-blue-500'
              } focus:outline-none focus:ring-1 focus:ring-blue-500`}
            />
          </div>

          {/* Error */}
          {error && (
            <p className="text-sm text-red-500">{error}</p>
          )}

          {/* Info */}
          <p className={`text-xs ${
            isDark ? 'text-white/40' : 'text-gray-400'
          }`}>
            O template estará disponível para todos os leads deste workspace.
          </p>
        </div>

        {/* Footer */}
        <div className={`flex justify-end gap-3 px-5 py-4 border-t ${
          isDark ? 'border-white/10' : 'border-gray-200'
        }`}>
          <button
            onClick={handleClose}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              isDark
                ? 'text-white/70 hover:bg-white/10'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className={`px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors flex items-center gap-2 ${
              saving
                ? 'bg-blue-500/50 cursor-not-allowed'
                : 'bg-blue-500 hover:bg-blue-600'
            }`}
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {saving ? 'Salvando...' : 'Salvar Template'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default SaveAsTemplateModal;
