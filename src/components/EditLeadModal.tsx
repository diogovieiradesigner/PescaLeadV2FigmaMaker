import { useState, useEffect } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { CRMLead, CustomField } from '../types/crm';
import { Theme } from '../hooks/useTheme';

interface EditLeadModalProps {
  lead: CRMLead | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedLead: CRMLead) => void;
  mode: 'create' | 'edit';
  initialStatus?: 'new' | 'contacted' | 'qualified' | 'proposal' | 'negotiation';
  theme: Theme;
}

export function EditLeadModal({ lead, isOpen, onClose, onSave, mode, initialStatus, theme }: EditLeadModalProps) {
  const [formData, setFormData] = useState<CRMLead | null>(lead);
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldType, setNewFieldType] = useState<CustomField['fieldType']>('text');
  const [showAddField, setShowAddField] = useState(false);
  const [newTag, setNewTag] = useState('');

  // Update formData when lead or isOpen changes
  useEffect(() => {
    if (isOpen) {
      if (mode === 'create') {
        // Create empty lead for new card
        const emptyLead: CRMLead = {
          id: `lead-${Date.now()}`,
          clientName: '',
          company: '',
          dealValue: 0,
          priority: 'medium',
          dueDate: new Date().toISOString().split('T')[0],
          tags: [],
          status: initialStatus || 'new',
          assignee: {
            name: 'Usuário',
            avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=user',
          },
          avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=default',
          activities: {
            comments: 0,
            attachments: 0,
            calls: 0,
            emails: 0,
          },
          customFields: [],
        };
        setFormData(emptyLead);
      } else if (lead) {
        setFormData(lead);
      }
      setShowAddField(false);
      setNewFieldName('');
      setNewFieldType('text');
      setNewTag('');
    }
  }, [isOpen, lead, mode, initialStatus]);

  if (!isOpen || !formData) return null;

  const isDark = theme === 'dark';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  const handleAddCustomField = () => {
    if (!newFieldName.trim()) return;

    const newField: CustomField = {
      id: `field-${Date.now()}`,
      fieldName: newFieldName,
      fieldType: newFieldType,
      fieldValue: '',
    };

    setFormData({
      ...formData,
      customFields: [newField, ...(formData.customFields || [])],
    });

    setNewFieldName('');
    setNewFieldType('text');
    setShowAddField(false);
  };

  const handleRemoveCustomField = (fieldId: string) => {
    setFormData({
      ...formData,
      customFields: (formData.customFields || []).filter(f => f.id !== fieldId),
    });
  };

  const handleCustomFieldChange = (fieldId: string, value: string) => {
    setFormData({
      ...formData,
      customFields: (formData.customFields || []).map(f =>
        f.id === fieldId ? { ...f, fieldValue: value } : f
      ),
    });
  };

  const handleAddTag = () => {
    if (!newTag.trim()) return;
    if (formData.tags.includes(newTag.trim())) return; // Avoid duplicates
    
    setFormData({
      ...formData,
      tags: [...formData.tags, newTag.trim()],
    });
    
    setNewTag('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter(tag => tag !== tagToRemove),
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  const fieldTypeLabels: Record<CustomField['fieldType'], string> = {
    text: 'Texto',
    number: 'Número',
    date: 'Data',
    email: 'Email',
    phone: 'Telefone',
    url: 'URL',
    textarea: 'Texto Longo',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className={`relative w-full max-w-3xl rounded-xl border shadow-2xl transition-colors ${
          isDark
            ? 'bg-elevated border-white/[0.08]'
            : 'bg-white border-border-light'
        }`}
      >
        {/* Header */}
        <div className={`flex items-center justify-between p-6 border-b ${
          isDark ? 'border-white/[0.08]' : 'border-border-light'
        }`}>
          <h2 className={`text-xl ${
            isDark ? 'text-white' : 'text-text-primary-light'
          }`}>
            {mode === 'create' ? 'Adicionar Lead' : 'Editar Lead'}
          </h2>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg transition-colors ${
              isDark
                ? 'hover:bg-white/[0.05] text-white/60 hover:text-white'
                : 'hover:bg-light-elevated text-text-secondary-light hover:text-text-primary-light'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
            {/* Basic Information */}
            <div>
              <h3 className={`text-sm mb-4 ${
                isDark ? 'text-white/70' : 'text-text-secondary-light'
              }`}>
                Informações Básicas
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm mb-2 ${
                    isDark ? 'text-white/70' : 'text-text-secondary-light'
                  }`}>
                    Nome do Lead *
                  </label>
                  <input
                    type="text"
                    value={formData.clientName}
                    onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                    required
                    className={`w-full px-3 py-2 rounded-lg border text-sm transition-colors focus:outline-none focus:border-[#0169D9] ${
                      isDark
                        ? 'bg-white/[0.05] border-white/[0.08] text-white'
                        : 'bg-light-elevated border-border-light text-text-primary-light'
                    }`}
                  />
                </div>

                <div>
                  <label className={`block text-sm mb-2 ${
                    isDark ? 'text-white/70' : 'text-text-secondary-light'
                  }`}>
                    Empresa *
                  </label>
                  <input
                    type="text"
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    required
                    className={`w-full px-3 py-2 rounded-lg border text-sm transition-colors focus:outline-none focus:border-[#0169D9] ${
                      isDark
                        ? 'bg-white/[0.05] border-white/[0.08] text-white'
                        : 'bg-light-elevated border-border-light text-text-primary-light'
                    }`}
                  />
                </div>

                <div>
                  <label className={`block text-sm mb-2 ${
                    isDark ? 'text-white/70' : 'text-text-secondary-light'
                  }`}>
                    Valor do Negócio *
                  </label>
                  <input
                    type="number"
                    value={formData.dealValue}
                    onChange={(e) => setFormData({ ...formData, dealValue: parseFloat(e.target.value) })}
                    required
                    className={`w-full px-3 py-2 rounded-lg border text-sm transition-colors focus:outline-none focus:border-[#0169D9] ${
                      isDark
                        ? 'bg-white/[0.05] border-white/[0.08] text-white'
                        : 'bg-light-elevated border-border-light text-text-primary-light'
                    }`}
                  />
                </div>

                <div>
                  <label className={`block text-sm mb-2 ${
                    isDark ? 'text-white/70' : 'text-text-secondary-light'
                  }`}>
                    Prioridade *
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value as CRMLead['priority'] })}
                    required
                    className={`w-full px-3 py-2 rounded-lg border text-sm transition-colors focus:outline-none focus:border-[#0169D9] ${
                      isDark
                        ? 'bg-white/[0.05] border-white/[0.08] text-white'
                        : 'bg-light-elevated border-border-light text-text-primary-light'
                    }`}
                  >
                    <option value="low">Baixa</option>
                    <option value="medium">Média</option>
                    <option value="high">Alta</option>
                  </select>
                </div>

                <div>
                  <label className={`block text-sm mb-2 ${
                    isDark ? 'text-white/70' : 'text-text-secondary-light'
                  }`}>
                    Data de Vencimento *
                  </label>
                  <input
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    required
                    className={`w-full px-3 py-2 rounded-lg border text-sm transition-colors focus:outline-none focus:border-[#0169D9] ${
                      isDark
                        ? 'bg-white/[0.05] border-white/[0.08] text-white'
                        : 'bg-light-elevated border-border-light text-text-primary-light'
                    }`}
                  />
                </div>

                <div>
                  <label className={`block text-sm mb-2 ${
                    isDark ? 'text-white/70' : 'text-text-secondary-light'
                  }`}>
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as CRMLead['status'] })}
                    className={`w-full px-3 py-2 rounded-lg border text-sm transition-colors focus:outline-none focus:border-[#0169D9] ${
                      isDark
                        ? 'bg-white/[0.05] border-white/[0.08] text-white'
                        : 'bg-light-elevated border-border-light text-text-primary-light'
                    }`}
                  >
                    <option value="new">Novo</option>
                    <option value="contacted">Contactado</option>
                    <option value="qualified">Qualificado</option>
                    <option value="proposal">Proposta</option>
                    <option value="negotiation">Negociação</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Tags */}
            <div>
              <h3 className={`text-sm mb-4 ${
                isDark ? 'text-white/70' : 'text-text-secondary-light'
              }`}>
                Tags
              </h3>
              
              {/* Add New Tag Input */}
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder="Adicionar tag (pressione Enter)"
                  onKeyDown={handleKeyDown}
                  className={`flex-1 px-3 py-2 rounded-lg border text-sm transition-colors focus:outline-none focus:border-[#0169D9] ${
                    isDark
                      ? 'bg-white/[0.05] border-white/[0.08] text-white placeholder-white/40'
                      : 'bg-light-elevated border-border-light text-text-primary-light'
                  }`}
                />
                <button
                  type="button"
                  onClick={handleAddTag}
                  className="px-3 py-2 rounded-lg text-sm bg-[#0169D9] hover:bg-[#0159c9] text-white transition-colors"
                >
                  Adicionar
                </button>
              </div>

              {/* Tags List */}
              {formData.tags && formData.tags.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {formData.tags.map((tag) => (
                    <span
                      key={tag}
                      className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-lg border text-sm ${
                        isDark
                          ? 'text-white/80 bg-white/[0.05] border-white/[0.08]'
                          : 'text-text-primary-light bg-light-elevated border-border-light'
                      }`}
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className={`hover:text-red-400 transition-colors ${
                          isDark ? 'text-white/40' : 'text-text-secondary-light'
                        }`}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  ))}
                </div>
              ) : (
                <div className={`text-center py-6 rounded-lg border border-dashed text-sm ${
                  isDark 
                    ? 'border-white/[0.08] text-white/40' 
                    : 'border-border-light text-text-secondary-light'
                }`}>
                  Nenhuma tag adicionada
                </div>
              )}
            </div>

            {/* Custom Fields */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className={`text-sm ${
                  isDark ? 'text-white/70' : 'text-text-secondary-light'
                }`}>
                  Campos Personalizados
                </h3>
                <button
                  type="button"
                  onClick={() => setShowAddField(!showAddField)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm bg-[#0169D9] hover:bg-[#0159c9] text-white transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Adicionar Campo
                </button>
              </div>

              {/* Add New Field Form */}
              {showAddField && (
                <div className={`p-4 rounded-lg border mb-4 ${
                  isDark 
                    ? 'bg-white/[0.02] border-white/[0.08]' 
                    : 'bg-light-elevated border-border-light'
                }`}>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className={`block text-xs mb-1.5 ${
                        isDark ? 'text-white/60' : 'text-text-secondary-light'
                      }`}>
                        Nome do Campo
                      </label>
                      <input
                        type="text"
                        value={newFieldName}
                        onChange={(e) => setNewFieldName(e.target.value)}
                        placeholder="Ex: Telefone Celular"
                        className={`w-full px-3 py-1.5 rounded-lg border text-sm transition-colors focus:outline-none focus:border-[#0169D9] ${
                          isDark
                            ? 'bg-white/[0.05] border-white/[0.08] text-white placeholder-white/40'
                            : 'bg-white border-border-light text-text-primary-light'
                        }`}
                      />
                    </div>
                    <div>
                      <label className={`block text-xs mb-1.5 ${
                        isDark ? 'text-white/60' : 'text-text-secondary-light'
                      }`}>
                        Tipo do Campo
                      </label>
                      <select
                        value={newFieldType}
                        onChange={(e) => setNewFieldType(e.target.value as CustomField['fieldType'])}
                        className={`w-full px-3 py-1.5 rounded-lg border text-sm transition-colors focus:outline-none focus:border-[#0169D9] ${
                          isDark
                            ? 'bg-white/[0.05] border-white/[0.08] text-white'
                            : 'bg-white border-border-light text-text-primary-light'
                        }`}
                      >
                        {Object.entries(fieldTypeLabels).map(([value, label]) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleAddCustomField}
                      className="px-3 py-1.5 rounded-lg text-sm bg-[#0169D9] hover:bg-[#0159c9] text-white transition-colors"
                    >
                      Adicionar
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddField(false);
                        setNewFieldName('');
                        setNewFieldType('text');
                      }}
                      className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                        isDark
                          ? 'bg-white/[0.05] hover:bg-white/[0.08] text-white'
                          : 'bg-light-elevated hover:bg-light-elevated-hover text-text-primary-light'
                      }`}
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}

              {/* Custom Fields List */}
              {formData.customFields && formData.customFields.length > 0 ? (
                <div className="space-y-3">
                  {formData.customFields.map((field) => (
                    <div
                      key={field.id}
                      className={`p-4 rounded-lg border ${
                        isDark 
                          ? 'bg-white/[0.02] border-white/[0.08]' 
                          : 'bg-light-elevated border-border-light'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <label className={`block text-sm mb-1.5 ${
                            isDark ? 'text-white' : 'text-text-primary-light'
                          }`}>
                            {field.fieldName}
                          </label>
                          <span className={`text-xs ${
                            isDark ? 'text-white/40' : 'text-text-secondary-light'
                          }`}>
                            {fieldTypeLabels[field.fieldType]}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveCustomField(field.id)}
                          className={`p-1.5 rounded-lg transition-colors ${
                            isDark
                              ? 'hover:bg-white/[0.05] text-white/40 hover:text-red-400'
                              : 'hover:bg-light-elevated text-text-secondary-light hover:text-red-500'
                          }`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      {field.fieldType === 'textarea' ? (
                        <textarea
                          value={field.fieldValue}
                          onChange={(e) => handleCustomFieldChange(field.id, e.target.value)}
                          rows={3}
                          className={`w-full px-3 py-2 rounded-lg border text-sm transition-colors focus:outline-none focus:border-[#0169D9] ${
                            isDark
                              ? 'bg-white/[0.05] border-white/[0.08] text-white placeholder-white/40'
                              : 'bg-white border-border-light text-text-primary-light'
                          }`}
                        />
                      ) : (
                        <input
                          type={field.fieldType === 'number' ? 'number' : field.fieldType === 'date' ? 'date' : 'text'}
                          value={field.fieldValue}
                          onChange={(e) => handleCustomFieldChange(field.id, e.target.value)}
                          className={`w-full px-3 py-2 rounded-lg border text-sm transition-colors focus:outline-none focus:border-[#0169D9] ${
                            isDark
                              ? 'bg-white/[0.05] border-white/[0.08] text-white placeholder-white/40'
                              : 'bg-white border-border-light text-text-primary-light'
                          }`}
                        />
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className={`text-center py-8 rounded-lg border border-dashed ${
                  isDark 
                    ? 'border-white/[0.08] text-white/40' 
                    : 'border-border-light text-text-secondary-light'
                }`}>
                  <p className="text-sm">Nenhum campo personalizado adicionado</p>
                  <p className="text-xs mt-1">Clique em "Adicionar Campo" para começar</p>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className={`flex justify-end gap-3 p-6 border-t ${
            isDark ? 'border-white/[0.08]' : 'border-border-light'
          }`}>
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                isDark
                  ? 'bg-white/[0.05] hover:bg-white/[0.08] text-white'
                  : 'bg-light-elevated hover:bg-light-elevated-hover text-text-primary-light'
              }`}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg text-sm bg-[#0169D9] hover:bg-[#0159c9] text-white transition-colors"
            >
              {mode === 'create' ? 'Adicionar Lead' : 'Salvar Alterações'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
