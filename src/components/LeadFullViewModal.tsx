import { useState, useEffect, useCallback } from 'react';
import { X, MessageSquare, FileText, Activity, Save, User, Building2, Calendar, Tag, DollarSign, Phone, Mail, MoreVertical, CheckCircle, XCircle, Globe, Send, Settings, FolderOpen, Upload, Download, Trash2, File, FileImage, FileSpreadsheet, FileType, Plus, BookOpen, ArrowLeft } from 'lucide-react';
import { CRMLead, CustomField } from '../types/crm';
import { Theme } from '../hooks/useTheme';
import { Avatar } from './Avatar';
import { ChatArea } from './chat/ChatArea';
import { useSingleConversation } from '../hooks/useSingleConversation';
import { useAuth } from '../contexts/AuthContext';
import { useLeadCustomFields } from '../hooks/useLeadCustomFields'; // ✅ Novo hook de lazy loading
import { getLeadActivities, updateLead } from '../services/leads-service';
import { deleteCustomFieldValue } from '../services/custom-fields-service';
import { toast } from 'sonner';
import { createConversation } from '../services/chat-service';
import { supabase } from '../utils/supabase/client';
import { NoInboxNotification } from './NoInboxNotification';
import { openEmailCompose } from '../utils/email-helper';
import { DocumentsList } from './documents/DocumentsList';
import { DocumentEditor } from './documents/DocumentEditor';
import { TemplateSelector } from './documents/TemplateSelector';
import { SaveAsTemplateModal } from './documents/SaveAsTemplateModal';
import type { LeadDocument, LeadDocumentFolder, LeadDocumentTemplate, SaveStatus } from '../types/documents';
import type { JSONContent } from '@tiptap/react';
import {
  getDocumentsByLead,
  getFoldersByLead,
  createDocument,
  updateDocument,
  deleteDocument as deleteDocumentService,
  createFolder,
  deleteFolder as deleteFolderService,
  updateFolder,
  extractTextFromContent,
  createVersion,
  getLatestVersionNumber,
} from '../services/documents-service';

// ✅ Tipos para campos JSONB
interface EmailEntry {
  type: string;
  source: string;
  address: string;
  verified: boolean;
}

interface PhoneEntry {
  type: string;
  number: string;
  source: string;
  verified: boolean;
  whatsapp: boolean;
  formatted: string;
  with_country: string;
}

interface WebsiteEntry {
  url: string;
  type: string;
  domain: string;
  source: string;
}

interface DomainEmailEntry {
  source: string;
  address: string;
  verified: boolean;
}

interface LeadFullViewModalProps {
  lead: CRMLead | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedLead: CRMLead) => void;
  theme: Theme;
  onNavigateNext?: () => void; // ✅ Navegação para próximo lead
  onNavigatePrev?: () => void; // ✅ Navegação para lead anterior
  onNavigateToInstances?: () => void; // ✅ Navegação para configurações de instâncias
  navigationState?: {
    hasPrev: boolean;
    hasNext: boolean;
    currentIndex: number;
    total: number;
  };
}

type ActiveTab = 'chat' | 'data' | 'activities' | 'files' | 'documents';

// ✅ Interface para arquivos do lead
interface LeadFile {
  id: string;
  lead_id: string;
  workspace_id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  file_type: string;
  description: string | null;
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
}

function formatActivityTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);

  if (diffSeconds < 60) {
    return "Há alguns segundos";
  }
  
  if (diffMinutes < 60) {
    return `Há ${diffMinutes} minutos`;
  }
  
  if (diffHours < 24) {
    return `Há ${diffHours} horas`;
  }
  
  // Formato completo: dd/MM/yyyy às HH:mm
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  
  return `${day}/${month}/${year} às ${hours}:${minutes}`;
}

// ✅ Função para renderizar valores de campos especiais
function renderFieldValue(field: CustomField, isDark: boolean) {
  const fieldNameLower = field.fieldName.toLowerCase();
  
  // Debug: log para ver o que está sendo processado
  
  // ✅ Verificar se é um e-mail simples (string) antes de tentar parse JSON
  if (fieldNameLower.includes('email') && isValidEmail(field.fieldValue)) {
    return renderEmailValue(field.fieldValue, isDark);
  }

  // ✅ Tentar fazer parse do JSON
  let parsedValue = null;
  try {
    parsedValue = JSON.parse(field.fieldValue);
  } catch {
    // Não é JSON, verificar se é e-mail simples
    if (isValidEmail(field.fieldValue)) {
      return renderEmailValue(field.fieldValue, isDark);
    }
    return field.fieldValue || '-';
  }

  // Se não é objeto, verificar se é e-mail simples
  if (typeof parsedValue !== 'object' || parsedValue === null) {
    if (isValidEmail(field.fieldValue)) {
      return renderEmailValue(field.fieldValue, isDark);
    }
    return field.fieldValue || '-';
  }

  // ✅ Detectar Email do Domínio (objeto único com address, source, verified)
  if (!Array.isArray(parsedValue) && parsedValue.address && parsedValue.source !== undefined) {
    const domainEmail = parsedValue as DomainEmailEntry;
    return (
      <div className={`flex items-start gap-2 p-2 rounded border ${
        isDark ? 'border-white/[0.05] bg-white/[0.02]' : 'border-gray-100 bg-gray-50'
      }`}>
        <Mail className="w-4 h-4 opacity-50 mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <div className={`text-sm break-all flex-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {domainEmail.address}
            </div>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                openEmailCompose(domainEmail.address);
              }}
              className={`p-1.5 rounded-md transition-all hover:bg-opacity-20 ${
                isDark 
                  ? 'hover:bg-blue-500/20 text-blue-400 hover:text-blue-300' 
                  : 'hover:bg-blue-100 text-blue-600 hover:text-blue-700'
              }`}
              title="Enviar e-mail"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-500">
              Domínio
            </span>
            <span className={`text-xs ${isDark ? 'text-white/40' : 'text-gray-400'}`}>
              {domainEmail.source}
            </span>
            {domainEmail.verified && (
              <CheckCircle className="w-3 h-3 text-green-500" />
            )}
          </div>
        </div>
      </div>
    );
  }

  // ✅ Detectar array de emails
  if (Array.isArray(parsedValue) && parsedValue.length > 0 && parsedValue[0].address && parsedValue[0].type) {
    const emails = parsedValue as EmailEntry[];
    return (
      <div className="space-y-2">
        {emails.map((email, idx) => (
          <div key={idx} className={`flex items-start gap-2 p-2 rounded border ${
            isDark ? 'border-white/[0.05] bg-white/[0.02]' : 'border-gray-100 bg-gray-50'
          }`}>
            <Mail className="w-4 h-4 opacity-50 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <div className={`text-sm break-all flex-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {email.address}
                </div>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    openEmailCompose(email.address);
                  }}
                  className={`p-1.5 rounded-md transition-all hover:bg-opacity-20 ${
                    isDark 
                      ? 'hover:bg-blue-500/20 text-blue-400 hover:text-blue-300' 
                      : 'hover:bg-blue-100 text-blue-600 hover:text-blue-700'
                  }`}
                  title="Enviar e-mail"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-xs px-1.5 py-0.5 rounded ${
                  email.type === 'main' 
                    ? 'bg-blue-500/10 text-blue-500' 
                    : 'bg-gray-500/10 text-gray-500'
                }`}>
                  {email.type === 'main' ? 'Principal' : 'Contato'}
                </span>
                <span className={`text-xs ${isDark ? 'text-white/40' : 'text-gray-400'}`}>
                  {email.source}
                </span>
                {email.verified && (
                  <CheckCircle className="w-3 h-3 text-green-500" />
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }
  
  // ✅ Detectar array de telefones
  if (Array.isArray(parsedValue) && parsedValue.length > 0 && parsedValue[0].with_country && parsedValue[0].type) {
    const phones = parsedValue as PhoneEntry[];
    return (
      <div className="space-y-2">
        {phones.map((phone, idx) => (
          <div key={idx} className={`flex items-start gap-2 p-2 rounded border ${
            isDark ? 'border-white/[0.05] bg-white/[0.02]' : 'border-gray-100 bg-gray-50'
          }`}>
            <Phone className="w-4 h-4 opacity-50 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className={`text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {phone.with_country}
              </div>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className={`text-xs px-1.5 py-0.5 rounded ${
                  phone.type === 'mobile' 
                    ? 'bg-purple-500/10 text-purple-500' 
                    : 'bg-gray-500/10 text-gray-500'
                }`}>
                  {phone.type === 'mobile' ? 'Celular' : 'Fixo'}
                </span>
                <span className={`text-xs ${isDark ? 'text-white/40' : 'text-gray-400'}`}>
                  {phone.source}
                </span>
                {phone.whatsapp && (
                  <span className="text-xs px-1.5 py-0.5 rounded bg-green-500/10 text-green-500">
                    WhatsApp
                  </span>
                )}
                {phone.verified && (
                  <CheckCircle className="w-3 h-3 text-green-500" />
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }
  
  // ✅ Detectar array de websites
  if (Array.isArray(parsedValue) && parsedValue.length > 0 && parsedValue[0].url && parsedValue[0].domain) {
    const websites = parsedValue as WebsiteEntry[];
    return (
      <div className="space-y-2">
        {websites.map((website, idx) => (
          <div key={idx} className={`flex items-start gap-2 p-2 rounded border ${
            isDark ? 'border-white/[0.05] bg-white/[0.02]' : 'border-gray-100 bg-gray-50'
          }`}>
            <Globe className="w-4 h-4 opacity-50 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <a 
                href={website.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className={`text-sm break-all hover:underline ${isDark ? 'text-blue-400' : 'text-blue-600'}`}
              >
                {website.url}
              </a>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className={`text-xs px-1.5 py-0.5 rounded ${
                  website.type === 'main' 
                    ? 'bg-blue-500/10 text-blue-500' 
                    : website.type === 'social'
                    ? 'bg-pink-500/10 text-pink-500'
                    : 'bg-gray-500/10 text-gray-500'
                }`}>
                  {website.type === 'main' ? 'Principal' : website.type === 'social' ? 'Rede Social' : website.type}
                </span>
                <span className={`text-xs ${isDark ? 'text-white/40' : 'text-gray-400'}`}>
                  {website.domain}
                </span>
                <span className={`text-xs ${isDark ? 'text-white/40' : 'text-gray-400'}`}>
                  • {website.source}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }
  
  // ✅ JSON desconhecido - mostrar como texto
  return <pre className="text-xs whitespace-pre-wrap break-all">{JSON.stringify(parsedValue, null, 2)}</pre>;
}

// ✅ Função auxiliar para verificar se um valor é um e-mail válido
function isValidEmail(value: string): boolean {
  if (!value || typeof value !== 'string') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(value.trim());
}

// ✅ Função para renderizar e-mail simples (string) com ícone
function renderEmailValue(email: string, isDark: boolean) {
  return (
    <div className="flex items-center gap-2">
      <span className={`text-sm break-all flex-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
        {email}
      </span>
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          openEmailCompose(email);
        }}
        className={`p-1.5 rounded-md transition-all hover:bg-opacity-20 ${
          isDark 
            ? 'hover:bg-blue-500/20 text-blue-400 hover:text-blue-300' 
            : 'hover:bg-blue-100 text-blue-600 hover:text-blue-700'
        }`}
        title="Enviar e-mail"
      >
        <Send className="w-4 h-4" />
      </button>
    </div>
  );
}

export function LeadFullViewModal({ lead, isOpen, onClose, onSave, theme, onNavigateNext, onNavigatePrev, onNavigateToInstances, navigationState }: LeadFullViewModalProps) {
  
  const { currentWorkspace, user } = useAuth();
  const [activeTab, setActiveTab] = useState<ActiveTab>('data');
  const [formData, setFormData] = useState<CRMLead | null>(lead);
  const [activities, setActivities] = useState<any[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(false);
  const [isSaving, setIsSaving] = useState(false); // Bloqueio de múltiplos cliques
  const [isCreatingConversation, setIsCreatingConversation] = useState(false);
  const [availableInboxes, setAvailableInboxes] = useState<any[]>([]);
  const [selectedInboxId, setSelectedInboxId] = useState<string>('');
  const [loadingInboxes, setLoadingInboxes] = useState(false);
  const [selectedPhone, setSelectedPhone] = useState<string>(''); // ✅ Telefone selecionado
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null); // ✅ Controle de qual campo está em edição

  // ✅ Estados para adicionar novo campo personalizado
  const [showAddFieldForm, setShowAddFieldForm] = useState(false);
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldType, setNewFieldType] = useState<'text' | 'number' | 'date' | 'email' | 'phone' | 'url' | 'textarea'>('text');
  const [newFieldValue, setNewFieldValue] = useState('');
  const [isAddingField, setIsAddingField] = useState(false);

  // ✅ Estados para modal de confirmação de exclusão de campo
  const [deleteFieldModal, setDeleteFieldModal] = useState<{ show: boolean; fieldId: string; fieldName: string }>({
    show: false,
    fieldId: '',
    fieldName: ''
  });
  const [isDeletingField, setIsDeletingField] = useState(false);

  // ✅ Estados para aba de Arquivos
  const [leadFiles, setLeadFiles] = useState<LeadFile[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [deletingFileId, setDeletingFileId] = useState<string | null>(null);
  const [isDraggingFile, setIsDraggingFile] = useState(false);

  // ✅ Estados para aba de Documentos
  const [leadDocuments, setLeadDocuments] = useState<LeadDocument[]>([]);
  const [documentFolders, setDocumentFolders] = useState<LeadDocumentFolder[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<LeadDocument | null>(null);
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  const [documentSaveStatus, setDocumentSaveStatus] = useState<SaveStatus>('saved');
  const [isEditingDocument, setIsEditingDocument] = useState(false);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [showSaveAsTemplate, setShowSaveAsTemplate] = useState(false);
  const [pendingFolderId, setPendingFolderId] = useState<string | undefined>(undefined);

  // ✅ Estados para modal de confirmação de exclusão de documento/pasta
  const [deleteDocModal, setDeleteDocModal] = useState<{
    show: boolean;
    type: 'document' | 'folder';
    id: string;
    name: string;
  }>({ show: false, type: 'document', id: '', name: '' });
  const [isDeletingDoc, setIsDeletingDoc] = useState(false);

  // ✅ LAZY LOADING: Custom fields carregam sob demanda (sem cache - sempre recarrega no kanban)
  const { 
    customFields, 
    loading: loadingCustomFields, 
    refresh: refreshCustomFields 
  } = useLeadCustomFields(
    isOpen && lead?.id ? lead.id : null,  // Só busca se modal estiver aberto
    { cache: false }  // Kanban sempre recarrega
  );
  
  // Hook do chat para a aba de Chat
  const {
    conversation,
    sendMessage,
    markAsResolved,
    changeStatus,
    clearHistory,
    deleteConversation,
    deleteMessage,
    refresh,
    setConversation
  } = useSingleConversation(lead?.id || null, currentWorkspace?.id || '');

  const isDark = theme === 'dark';

  // ✅ Navegação com teclado (setas esquerda/direita)
  useEffect(() => {
    if (!isOpen) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' && onNavigatePrev) {
        e.preventDefault();
        onNavigatePrev();
      } else if (e.key === 'ArrowRight' && onNavigateNext) {
        e.preventDefault();
        onNavigateNext();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onNavigateNext, onNavigatePrev]);

  // ✅ Obter TODOS os telefones disponíveis (principal + campos personalizados)
  const getAllPhones = (): Array<{ label: string; value: string; source: string }> => {
    const phones: Array<{ label: string; value: string; source: string }> = [];

    // 1. Telefone principal
    if (formData?.phone) {
      phones.push({
        label: `Telefone Principal: ${formData.phone}`,
        value: formData.phone,
        source: 'principal'
      });
    }

    // 2. Telefones de campos personalizados simples (tipo 'phone')
    customFields
      .filter(field => field.fieldType === 'phone' && field.fieldValue && field.fieldValue.trim() !== '')
      .forEach(field => {
        phones.push({
          label: `${field.fieldName}: ${field.fieldValue}`,
          value: field.fieldValue,
          source: field.fieldName
        });
      });

    // 3. Telefones de campos JSON
    customFields
      .filter(field => field.fieldName.toLowerCase().includes('telefone') && field.fieldName.toLowerCase().includes('json'))
      .forEach(field => {
        try {
          const phoneEntries: PhoneEntry[] = JSON.parse(field.fieldValue);
          phoneEntries.forEach((phone, idx) => {
            phones.push({
              label: `${phone.with_country} (${phone.type === 'mobile' ? 'Celular' : 'Fixo'}${phone.whatsapp ? ' - WhatsApp' : ''})`,
              value: phone.with_country,
              source: `${field.fieldName} #${idx + 1}`
            });
          });
        } catch (e) {
          // Ignorar se não for JSON válido
        }
      });

    return phones;
  };

  const availablePhones = getAllPhones();
  const hasPhone = availablePhones.length > 0;

  // ✅ Carregar arquivos do lead (definido antes do useEffect que o usa)
  const fetchLeadFiles = useCallback(async () => {
    if (!lead?.id || !currentWorkspace?.id) return;

    setLoadingFiles(true);
    try {
      const { data, error } = await supabase
        .from('lead_files')
        .select('*')
        .eq('lead_id', lead.id)
        .eq('workspace_id', currentWorkspace.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLeadFiles(data || []);
    } catch (error) {
      console.error('[LeadFullViewModal] Erro ao carregar arquivos:', error);
    } finally {
      setLoadingFiles(false);
    }
  }, [lead?.id, currentWorkspace?.id]);

  // ✅ Carregar documentos do lead
  const fetchLeadDocuments = useCallback(async () => {
    if (!lead?.id || !currentWorkspace?.id) return;

    setLoadingDocuments(true);
    try {
      const [documentsResult, foldersResult] = await Promise.all([
        getDocumentsByLead(lead.id),
        getFoldersByLead(lead.id)
      ]);

      setLeadDocuments(documentsResult.documents || []);
      setDocumentFolders(foldersResult.folders || []);
    } catch (error) {
      console.error('[LeadFullViewModal] Erro ao carregar documentos:', error);
    } finally {
      setLoadingDocuments(false);
    }
  }, [lead?.id, currentWorkspace?.id]);

  // Inicializar dados quando abrir
  useEffect(() => {
    if (isOpen && lead) {
      // ✅ CORREÇÃO: Inicializar formData com customFields do hook quando disponíveis
      const initialData: CRMLead = {
        ...lead,
        customFields: lead.customFields && lead.customFields.length > 0
          ? lead.customFields
          : customFields.length > 0
            ? customFields
            : undefined
      };
      setFormData(initialData);

      // Carregar atividades
      fetchActivities();

      // ✅ Carregar inboxes disponíveis
      if (currentWorkspace?.id) {
        loadAvailableInboxes();
      }

      // ✅ Carregar arquivos do lead
      fetchLeadFiles();

      // ✅ Carregar documentos do lead
      fetchLeadDocuments();
    }
  }, [isOpen, lead, currentWorkspace?.id, customFields, fetchLeadFiles, fetchLeadDocuments]); // ✅ Incluir customFields, fetchLeadFiles e fetchLeadDocuments nas dependências

  // ✅ Gerenciar seleção de telefone
  useEffect(() => {
    const phones = getAllPhones();
    if (phones.length > 0) {
      // Se não tem selecionado ou o selecionado não existe mais na lista (troca de lead)
      const currentExists = phones.some(p => p.value === selectedPhone);
      if (!selectedPhone || !currentExists) {
        setSelectedPhone(phones[0].value);
      }
    } else {
      setSelectedPhone('');
    }
  }, [formData, customFields]);

  // ✅ Handler para adicionar novo campo personalizado
  const handleAddCustomField = async () => {
    if (!newFieldName.trim()) {
      toast.error('Nome do campo é obrigatório');
      return;
    }

    // Verificar se já existe um campo com esse nome
    const existingField = customFields.find(
      f => f.fieldName.toLowerCase() === newFieldName.trim().toLowerCase()
    );
    if (existingField) {
      toast.error('Já existe um campo com esse nome');
      return;
    }

    setIsAddingField(true);

    try {
      // Criar novo campo com ID temporário (UUID)
      const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const newField: CustomField = {
        id: tempId,
        fieldName: newFieldName.trim(),
        fieldType: newFieldType,
        fieldValue: newFieldValue,
      };

      // Atualizar formData com o novo campo
      const currentFields = formData?.customFields && formData.customFields.length > 0
        ? formData.customFields
        : customFields;

      const updatedFields = [...currentFields, newField];

      setFormData(prev => prev ? ({ ...prev, customFields: updatedFields }) : null);

      // Limpar formulário
      setNewFieldName('');
      setNewFieldType('text');
      setNewFieldValue('');
      setShowAddFieldForm(false);

      toast.success('Campo adicionado! Clique em "Salvar Alterações" para confirmar.');

    } catch (error) {
      console.error('[LeadFullViewModal] Erro ao adicionar campo:', error);
      toast.error('Erro ao adicionar campo. Tente novamente.');
    } finally {
      setIsAddingField(false);
    }
  };

  // ✅ Handler para cancelar adição de campo
  const handleCancelAddField = () => {
    setNewFieldName('');
    setNewFieldType('text');
    setNewFieldValue('');
    setShowAddFieldForm(false);
  };

  // ✅ Handler para abrir modal de confirmação de exclusão de campo
  const handleDeleteCustomField = (fieldId: string, fieldName: string) => {
    setDeleteFieldModal({ show: true, fieldId, fieldName });
  };

  // ✅ Handler para confirmar exclusão de campo personalizado (salva imediatamente no banco)
  const confirmDeleteCustomField = async () => {
    const { fieldId, fieldName } = deleteFieldModal;

    if (!lead?.id) {
      toast.error('Erro: Lead não encontrado');
      return;
    }

    setIsDeletingField(true);

    try {
      // Excluir do banco de dados imediatamente
      const { error } = await deleteCustomFieldValue(lead.id, fieldId);

      if (error) {
        console.error('[LeadFullViewModal] Erro ao excluir campo:', error);
        toast.error('Erro ao excluir campo. Tente novamente.');
        return;
      }

      // Atualizar estado local removendo o campo
      const currentFields = formData?.customFields && formData.customFields.length > 0
        ? formData.customFields
        : customFields;

      const updatedFields = currentFields.filter(f => f.id !== fieldId);

      setFormData(prev => prev ? ({ ...prev, customFields: updatedFields }) : null);

      // Recarregar campos personalizados do banco
      refreshCustomFields();

      toast.success(`Campo "${fieldName}" excluído com sucesso!`);


    } catch (error) {
      console.error('[LeadFullViewModal] Erro inesperado ao excluir campo:', error);
      toast.error('Erro ao excluir campo. Tente novamente.');
    } finally {
      setIsDeletingField(false);
      // Fechar modal
      setDeleteFieldModal({ show: false, fieldId: '', fieldName: '' });
    }
  };

  // ✅ Handler para cancelar exclusão de campo
  const cancelDeleteCustomField = () => {
    setDeleteFieldModal({ show: false, fieldId: '', fieldName: '' });
  };

  // ✅ Handler para alteração de campos personalizados
  const handleCustomFieldChange = (fieldId: string, value: string) => {
    // ✅ CORREÇÃO: Atualizar customFields no formData
    // Usar customFields do hook como base se formData não tiver customFields
    const baseFields = formData?.customFields && formData.customFields.length > 0 
      ? formData.customFields 
      : customFields;
    
    const updatedFields = baseFields.map(f => 
      f.id === fieldId ? { ...f, fieldValue: value } : f
    );
    
    setFormData(prev => prev ? ({ ...prev, customFields: updatedFields }) : null);
    
  };

  // ✅ Carregar inboxes disponíveis
  const loadAvailableInboxes = async () => {
    if (!currentWorkspace?.id) return;
    
    setLoadingInboxes(true);
    try {
      // ✅ JOIN para pegar o provider da instance
      const { data, error } = await supabase
        .from('inboxes')
        .select(`
          id, 
          name,
          inbox_instances!inner(
            instances!inner(
              provider
            )
          )
        `)
        .eq('workspace_id', currentWorkspace.id)
        .order('name');
      
      if (error) throw error;
      
      // ✅ Mapear dados para formato mais simples
      const mappedInboxes = (data || []).map((inbox: any) => ({
        id: inbox.id,
        name: inbox.name,
        channel: inbox.inbox_instances?.[0]?.instances?.provider || 'desconhecido'
      }));
      
      setAvailableInboxes(mappedInboxes);
      // Selecionar primeira inbox por padrão
      if (mappedInboxes.length > 0) {
        setSelectedInboxId(mappedInboxes[0].id);
      }
    } catch (error) {
      console.error('[LeadFullViewModal] Erro ao carregar inboxes:', error);
      toast.error('Erro ao carregar caixas de entrada.');
    } finally {
      setLoadingInboxes(false);
    }
  };

  const fetchActivities = () => {
    if (!lead) return;
    setLoadingActivities(true);
    getLeadActivities(lead.id).then(({ activities }) => {
      setActivities(activities);
    }).finally(() => setLoadingActivities(false));
  };

  // ✅ Upload de arquivo
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !lead?.id || !currentWorkspace?.id) return;

    // Validar tamanho (50MB max)
    if (file.size > 52428800) {
      toast.error('Arquivo muito grande. Máximo permitido: 50MB');
      return;
    }

    setUploadingFile(true);
    try {
      // Gerar nome único para o arquivo
      const fileExt = file.name.split('.').pop();
      // Sanitizar nome do arquivo para remover caracteres especiais
      const sanitizedFileName = file.name
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove acentos
        .replace(/[^a-zA-Z0-9._-]/g, '_') // Substitui caracteres especiais por underscore
        .replace(/_+/g, '_'); // Remove underscores duplicados
      const fileName = `${lead.id}/${Date.now()}_${sanitizedFileName}`;

      // Upload para o storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('lead-files')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Registrar na tabela
      const { error: dbError } = await supabase
        .from('lead_files')
        .insert({
          lead_id: lead.id,
          workspace_id: currentWorkspace.id,
          file_name: file.name,
          file_path: uploadData.path,
          file_size: file.size,
          file_type: file.type || 'application/octet-stream',
          uploaded_by: (await supabase.auth.getUser()).data.user?.id
        });

      if (dbError) throw dbError;

      toast.success('Arquivo enviado com sucesso!');
      fetchLeadFiles();
    } catch (error: any) {
      console.error('[LeadFullViewModal] Erro no upload:', error);
      toast.error(`Erro ao enviar arquivo: ${error.message || 'Tente novamente'}`);
    } finally {
      setUploadingFile(false);
      // Limpar o input
      event.target.value = '';
    }
  };

  // ✅ Upload de arquivo via File (para drag and drop)
  const uploadFile = async (file: File) => {
    if (!lead?.id || !currentWorkspace?.id) return;

    // Validar tamanho (50MB max)
    if (file.size > 52428800) {
      toast.error('Arquivo muito grande. Máximo permitido: 50MB');
      return;
    }

    // Validar tipo de arquivo
    const allowedTypes = [
      'application/pdf',
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
      'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain', 'text/csv',
      'application/zip', 'application/x-rar-compressed', 'application/vnd.rar'
    ];

    const allowedExtensions = ['.pdf', '.jpg', '.jpeg', '.png', '.gif', '.webp', '.doc', '.docx', '.xls', '.xlsx', '.txt', '.csv', '.zip', '.rar'];
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();

    if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExtension)) {
      toast.error('Tipo de arquivo não permitido');
      return;
    }

    setUploadingFile(true);
    try {
      // Sanitizar nome do arquivo para remover caracteres especiais
      const sanitizedFileName = file.name
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove acentos
        .replace(/[^a-zA-Z0-9._-]/g, '_') // Substitui caracteres especiais por underscore
        .replace(/_+/g, '_'); // Remove underscores duplicados
      const fileName = `${lead.id}/${Date.now()}_${sanitizedFileName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('lead-files')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase
        .from('lead_files')
        .insert({
          lead_id: lead.id,
          workspace_id: currentWorkspace.id,
          file_name: file.name,
          file_path: uploadData.path,
          file_size: file.size,
          file_type: file.type || 'application/octet-stream',
          uploaded_by: (await supabase.auth.getUser()).data.user?.id
        });

      if (dbError) throw dbError;

      toast.success('Arquivo enviado com sucesso!');
      fetchLeadFiles();
    } catch (error: any) {
      console.error('[LeadFullViewModal] Erro no upload:', error);
      toast.error(`Erro ao enviar arquivo: ${error.message || 'Tente novamente'}`);
    } finally {
      setUploadingFile(false);
    }
  };

  // ✅ Handlers para Drag and Drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFile(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFile(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFile(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      // Upload do primeiro arquivo (ou múltiplos se quiser)
      uploadFile(files[0]);
    }
  };

  // ✅ Download de arquivo
  const handleFileDownload = async (file: LeadFile) => {
    try {
      const { data, error } = await supabase.storage
        .from('lead-files')
        .download(file.file_path);

      if (error) throw error;

      // Criar link de download
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error('[LeadFullViewModal] Erro no download:', error);
      toast.error(`Erro ao baixar arquivo: ${error.message || 'Tente novamente'}`);
    }
  };

  // ✅ Deletar arquivo
  const handleFileDelete = async (file: LeadFile) => {
    if (!confirm(`Deseja realmente excluir "${file.file_name}"?`)) return;

    setDeletingFileId(file.id);
    try {
      // Deletar do storage
      const { error: storageError } = await supabase.storage
        .from('lead-files')
        .remove([file.file_path]);

      if (storageError) {
      }

      // Deletar do banco
      const { error: dbError } = await supabase
        .from('lead_files')
        .delete()
        .eq('id', file.id);

      if (dbError) throw dbError;

      toast.success('Arquivo excluído com sucesso!');
      setLeadFiles(prev => prev.filter(f => f.id !== file.id));
    } catch (error: any) {
      console.error('[LeadFullViewModal] Erro ao deletar arquivo:', error);
      toast.error(`Erro ao excluir arquivo: ${error.message || 'Tente novamente'}`);
    } finally {
      setDeletingFileId(null);
    }
  };

  // ✅ Helper para formatar tamanho do arquivo
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // ✅ Helper para ícone por tipo de arquivo
  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return <FileImage className="w-5 h-5" />;
    if (fileType.includes('spreadsheet') || fileType.includes('excel') || fileType === 'text/csv') return <FileSpreadsheet className="w-5 h-5" />;
    if (fileType.includes('pdf')) return <FileType className="w-5 h-5" />;
    return <File className="w-5 h-5" />;
  };

  // ✅ HANDLERS PARA DOCUMENTOS

  // Abrir seletor de templates para criar documento
  const handleCreateDocument = (folderId?: string) => {
    setPendingFolderId(folderId);
    setShowTemplateSelector(true);
  };

  // Criar documento a partir do template selecionado (ou em branco)
  const handleSelectTemplate = async (template: LeadDocumentTemplate | null) => {
    if (!lead?.id || !currentWorkspace?.id || !user?.id) {
      setShowTemplateSelector(false);
      return;
    }

    try {
      const { document: newDoc, error } = await createDocument({
        lead_id: lead.id,
        workspace_id: currentWorkspace.id,
        folder_id: pendingFolderId || null,
        title: template ? template.title : 'Novo Documento',
        content: template ? template.content : undefined,
        content_text: template ? template.content_text : undefined,
        created_by: user.id
      });

      if (error || !newDoc) {
        throw error || new Error('Documento não criado');
      }

      setLeadDocuments(prev => [newDoc, ...prev]);
      setSelectedDocument(newDoc);
      setIsEditingDocument(true);
      setShowTemplateSelector(false);
      setPendingFolderId(undefined);
      toast.success(template ? 'Documento criado a partir do template!' : 'Documento criado!');
    } catch (error: unknown) {
      console.error('[LeadFullViewModal] Erro ao criar documento:', error);
      toast.error('Erro ao criar documento');
    }
  };

  // Salvar documento atual como template
  const handleSaveAsTemplate = () => {
    if (selectedDocument) {
      setShowSaveAsTemplate(true);
    }
  };

  // Restaurar versão anterior de um documento
  const handleRestoreVersion = () => {
    toast.success('Versão restaurada com sucesso!');
  };

  // Atualizar documento (título ou conteúdo)
  const handleUpdateDocument = async (
    docId: string,
    updates: { title?: string; content?: JSONContent; is_pinned?: boolean }
  ) => {
    // Verificar se user está disponível
    if (!user?.id) {
      return;
    }

    try {
      setDocumentSaveStatus('saving');

      // Se estamos atualizando conteúdo, criar uma versão do estado atual ANTES de salvar
      if (updates.content !== undefined && selectedDocument?.id === docId) {
        const currentContent = selectedDocument.content as JSONContent;
        const newContentStr = JSON.stringify(updates.content);
        const currentContentStr = JSON.stringify(currentContent);

        // Só criar versão se o conteúdo realmente mudou e não está vazio
        if (currentContentStr !== newContentStr && currentContent) {
          const currentText = selectedDocument.content_text || extractTextFromContent(currentContent);

          // Só criar versão se o documento atual tem conteúdo significativo
          if (currentText && currentText.trim().length > 10) {
            try {
              const latestVersion = await getLatestVersionNumber(docId);
              await createVersion({
                document_id: docId,
                content: currentContent,
                content_text: currentText,
                version_number: latestVersion + 1,
                created_by: user.id,
              });
            } catch (versionError) {
              // Não bloquear o save se a versão falhar
            }
          }
        }
      }

      const updateData: Record<string, unknown> = {
        updated_by: user.id
      };

      if (updates.title !== undefined) updateData.title = updates.title;
      if (updates.content !== undefined) {
        updateData.content = updates.content;
        updateData.content_text = extractTextFromContent(updates.content);
      }
      if (updates.is_pinned !== undefined) updateData.is_pinned = updates.is_pinned;

      const { document: updated, error } = await updateDocument(docId, updateData);

      if (error || !updated) {
        throw error || new Error('Documento não retornado');
      }

      setLeadDocuments(prev => prev.map(d => d.id === docId ? updated : d));
      if (selectedDocument?.id === docId) {
        setSelectedDocument(updated);
      }

      setDocumentSaveStatus('saved');
    } catch (error: unknown) {
      console.error('[LeadFullViewModal] Erro ao atualizar documento:', error);
      setDocumentSaveStatus('error');
      toast.error('Erro ao salvar documento');
    }
  };

  // Abrir modal de confirmação para deletar documento
  const handleDeleteDocument = (docId: string) => {
    const doc = leadDocuments.find(d => d.id === docId);
    setDeleteDocModal({
      show: true,
      type: 'document',
      id: docId,
      name: doc?.title || 'Documento'
    });
  };

  // Abrir modal de confirmação para deletar pasta
  const handleDeleteFolder = (folderId: string) => {
    const folder = documentFolders.find(f => f.id === folderId);
    setDeleteDocModal({
      show: true,
      type: 'folder',
      id: folderId,
      name: folder?.name || 'Pasta'
    });
  };

  // Confirmar exclusão de documento/pasta
  const confirmDeleteDoc = async () => {
    const { type, id } = deleteDocModal;
    setIsDeletingDoc(true);

    try {
      if (type === 'document') {
        await deleteDocumentService(id);
        setLeadDocuments(prev => prev.filter(d => d.id !== id));

        if (selectedDocument?.id === id) {
          setSelectedDocument(null);
          setIsEditingDocument(false);
        }

        toast.success('Documento excluído!');
      } else {
        await deleteFolderService(id);
        setDocumentFolders(prev => prev.filter(f => f.id !== id));
        // Mover documentos da pasta para a raiz
        setLeadDocuments(prev => prev.map(d =>
          d.folder_id === id ? { ...d, folder_id: null } : d
        ));
        toast.success('Pasta excluída!');
      }

      setDeleteDocModal({ show: false, type: 'document', id: '', name: '' });
    } catch (error: any) {
      console.error(`[LeadFullViewModal] Erro ao deletar ${type}:`, error);
      toast.error(`Erro ao excluir ${type === 'document' ? 'documento' : 'pasta'}`);
    } finally {
      setIsDeletingDoc(false);
    }
  };

  // Cancelar exclusão
  const cancelDeleteDoc = () => {
    if (!isDeletingDoc) {
      setDeleteDocModal({ show: false, type: 'document', id: '', name: '' });
    }
  };

  // Criar pasta
  const handleCreateFolder = async (name: string) => {
    if (!lead?.id || !currentWorkspace?.id) return;

    try {
      const { folder: newFolder, error } = await createFolder({
        lead_id: lead.id,
        workspace_id: currentWorkspace.id,
        name,
        position: documentFolders.length
      });

      if (error || !newFolder) {
        console.error('[LeadFullViewModal] Erro ao criar pasta:', error);
        toast.error('Erro ao criar pasta');
        return;
      }

      setDocumentFolders(prev => [...prev, newFolder]);
      toast.success('Pasta criada!');
    } catch (error: any) {
      console.error('[LeadFullViewModal] Erro ao criar pasta:', error);
      toast.error('Erro ao criar pasta');
    }
  };

  // Renomear pasta
  const handleRenameFolder = async (folderId: string, newName: string) => {
    try {
      const { folder: updated, error } = await updateFolder(folderId, { name: newName });

      if (error || !updated) {
        console.error('[LeadFullViewModal] Erro ao renomear pasta:', error);
        toast.error('Erro ao renomear pasta');
        return;
      }

      setDocumentFolders(prev => prev.map(f => f.id === folderId ? updated : f));
      toast.success('Pasta renomeada!');
    } catch (error: any) {
      console.error('[LeadFullViewModal] Erro ao renomear pasta:', error);
      toast.error('Erro ao renomear pasta');
    }
  };

  // Mover documento para pasta
  const handleMoveDocument = async (docId: string, folderId: string | null) => {
    try {
      const { document: updated, error } = await updateDocument(docId, { folder_id: folderId });

      if (error || !updated) {
        console.error('[LeadFullViewModal] Erro ao mover documento:', error);
        toast.error('Erro ao mover documento');
        return;
      }

      // Atualizar o documento mantendo todos os campos existentes
      setLeadDocuments(prev => prev.map(d => d.id === docId ? { ...d, folder_id: folderId } : d));
      if (selectedDocument?.id === docId) {
        setSelectedDocument(prev => prev ? { ...prev, folder_id: folderId } : null);
      }

      toast.success(folderId ? 'Documento movido para pasta' : 'Documento removido da pasta');
    } catch (error: any) {
      console.error('[LeadFullViewModal] Erro ao mover documento:', error);
      toast.error('Erro ao mover documento');
    }
  };

  // Salvar alterações na Sidebar Direita
  const handleSidebarSave = async () => {
    if (!formData || !currentWorkspace) return;
    
    try {
      setIsSaving(true);
      
      // ✅ CORREÇÃO: Garantir que customFields atualizados sejam incluídos
      const dataToSave: CRMLead = {
        ...formData,
        customFields: formData.customFields || customFields, // Usar customFields do hook se formData não tiver
      };
      
      
      // Chamar onSave para que o componente pai gerencie a atualização
      await onSave(dataToSave);
      
      // ✅ Recarregar custom fields após salvar para garantir sincronização
      if (lead?.id) {
        refreshCustomFields();
      }
      
      // Recarregar atividades para mostrar logs de alteração
      fetchActivities();
      
      toast.success('Lead atualizado com sucesso!');
    } catch (error) {
      console.error('[LeadFullViewModal] Erro ao salvar lead:', error);
      toast.error('Erro ao salvar lead. Tente novamente.');
    } finally {
      setIsSaving(false);
    }
  };

  // ✅ Criar conversa manual com o lead
  const handleCreateConversation = async () => {
    
    if (!formData || !currentWorkspace?.id) {
      return;
    }

    const inboxId = selectedInboxId;
    if (!inboxId) {
      console.error('[LeadFullViewModal] Inbox não selecionada');
      toast.error('Nenhuma caixa de entrada selecionada.');
      return;
    }

    // ✅ Obter telefone do lead
    const phone = selectedPhone;
    if (!phone) {
      console.error('[LeadFullViewModal] Lead sem telefone');
      toast.error('Lead precisa ter um telefone para criar conversa.');
      return;
    }

    setIsCreatingConversation(true);

    try {
      // Limpar telefone (apenas números)
      const cleanPhone = phone.replace(/\D/g, '');


      const newConversation = await createConversation({
        workspace_id: currentWorkspace.id,
        inbox_id: inboxId,
        contact_name: formData.clientName,
        contact_phone: cleanPhone,
        status: 'waiting',
        channel: 'chat',
        lead_id: formData.id,
      });


      // ✅ Atualizar o estado diretamente para feedback imediato
      setConversation(newConversation);
      
      toast.success('Conversa iniciada com sucesso!');
    } catch (error) {
      console.error('[LeadFullViewModal] Erro ao criar conversa:', error);
      toast.error('Erro ao criar conversa. Tente novamente.');
    } finally {
      setIsCreatingConversation(false);
    }
  };

  if (!isOpen || !formData) return null;

  // ✅ Debug: verificar se as props de navegação estão chegando


  return (
    <div 
      className="fixed inset-0 flex items-center justify-center p-4 sm:p-6 overflow-hidden"
      style={{ zIndex: 9999 }}
    >
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div 
        className={`relative w-full max-w-[95vw] h-[90vh] flex flex-col rounded-xl shadow-2xl overflow-hidden ${
          isDark ? 'bg-[#000000] border border-white/[0.08]' : 'bg-white border border-border-light'
        }`}
        style={{ zIndex: 10000 }}
      >
        
        {/* Header */}
        <div className={`flex items-center justify-between px-6 py-4 border-b ${
           isDark ? 'border-white/[0.08] bg-[#000000]' : 'border-border-light bg-gray-50'
        }`}>
           <div className="flex items-center gap-4">
              <Avatar imageUrl={formData.avatar} name={formData.clientName} size="md" />
              <div>
                 <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-text-primary-light'}`}>
                    {formData.clientName}
                 </h2>
                 <p className={`text-sm ${isDark ? 'text-white/50' : 'text-text-secondary-light'}`}>
                    {formData.company || 'Sem empresa'}
                 </p>
              </div>
              {/* Status Badge */}
              <div className={`px-3 py-1 rounded-full text-xs font-medium border ${
                 formData.priority === 'high' 
                   ? 'bg-red-500/10 text-red-500 border-red-500/20' 
                   : formData.priority === 'medium'
                   ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
                   : 'bg-green-500/10 text-green-500 border-green-500/20'
              }`}>
                 Prioridade {formData.priority === 'high' ? 'Alta' : formData.priority === 'medium' ? 'Média' : 'Baixa'}
              </div>
           </div>

           <div className="flex items-center gap-3">
              <button 
                onClick={handleSidebarSave}
                disabled={isSaving}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors ${
                  isSaving 
                    ? 'bg-gray-400 cursor-not-allowed opacity-60' 
                    : 'bg-[#0169D9] hover:bg-[#0169D9]/90'
                } text-white`}
              >
                 <Save className={`w-4 h-4 ${isSaving ? 'animate-spin' : ''}`} />
                 {isSaving ? 'Salvando...' : 'Salvar Alterações'}
              </button>
              <button 
                onClick={onClose}
                className={`p-2 rounded-lg transition-colors ${
                   isDark ? 'hover:bg-white/[0.05] text-white/60' : 'hover:bg-gray-100 text-gray-500'
                }`}
              >
                 <X className="w-5 h-5" />
              </button>
           </div>
        </div>

        {/* Main Body */}
        <div className="flex flex-1 overflow-hidden">
           
           {/* Left Column - Main Content (Tabs) */}
           <div className="flex-1 flex flex-col min-w-0 border-r border-border-light dark:border-white/[0.08]">
              {/* Tabs Header */}
              <div className={`flex items-center px-6 border-b ${
                 isDark ? 'border-white/[0.08] bg-[#000000]' : 'border-border-light bg-white'
              }`}>
                 <button
                    onClick={() => setActiveTab('chat')}
                    className={`flex items-center gap-2 px-4 py-3 border-b-2 text-sm font-medium transition-colors ${
                       activeTab === 'chat'
                          ? 'border-[#0169D9] text-[#0169D9]'
                          : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                    }`}
                 >
                    <MessageSquare className="w-4 h-4" />
                    Chat
                 </button>
                 <button
                    onClick={() => setActiveTab('data')}
                    className={`flex items-center gap-2 px-4 py-3 border-b-2 text-sm font-medium transition-colors ${
                       activeTab === 'data'
                          ? 'border-[#0169D9] text-[#0169D9]'
                          : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                    }`}
                 >
                    <FileText className="w-4 h-4" />
                    Campos Personalizados
                 </button>
                 <button
                    onClick={() => setActiveTab('files')}
                    className={`flex items-center gap-2 px-4 py-3 border-b-2 text-sm font-medium transition-colors ${
                       activeTab === 'files'
                          ? 'border-[#0169D9] text-[#0169D9]'
                          : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                    }`}
                 >
                    <FolderOpen className="w-4 h-4" />
                    Arquivos
                    {leadFiles.length > 0 && (
                      <span className={`ml-1 px-1.5 py-0.5 text-xs rounded-full ${
                        isDark ? 'bg-white/10 text-white/70' : 'bg-gray-200 text-gray-600'
                      }`}>
                        {leadFiles.length}
                      </span>
                    )}
                 </button>
                 <button
                    onClick={() => setActiveTab('documents')}
                    className={`flex items-center gap-2 px-4 py-3 border-b-2 text-sm font-medium transition-colors ${
                       activeTab === 'documents'
                          ? 'border-[#0169D9] text-[#0169D9]'
                          : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                    }`}
                 >
                    <BookOpen className="w-4 h-4" />
                    Documentos
                    {leadDocuments.length > 0 && (
                      <span className={`ml-1 px-1.5 py-0.5 text-xs rounded-full ${
                        isDark ? 'bg-white/10 text-white/70' : 'bg-gray-200 text-gray-600'
                      }`}>
                        {leadDocuments.length}
                      </span>
                    )}
                 </button>
                 <button
                    onClick={() => setActiveTab('activities')}
                    className={`flex items-center gap-2 px-4 py-3 border-b-2 text-sm font-medium transition-colors ${
                       activeTab === 'activities'
                          ? 'border-[#0169D9] text-[#0169D9]'
                          : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                    }`}
                 >
                    <Activity className="w-4 h-4" />
                    Atividades
                 </button>
              </div>

              {/* Tab Content */}
              <div className={`flex-1 overflow-hidden relative ${
                 isDark ? 'bg-[#000000]' : 'bg-gray-50'
              }`}>
                 {activeTab === 'chat' && (
                    <div className={`w-full h-full flex flex-col ${
                      isDark ? 'bg-[#000000]' : 'bg-light-bg'
                    }`}>
                       {conversation ? (
                          <ChatArea
                             conversation={conversation}
                             theme={theme}
                             onSendMessage={sendMessage}
                             onMarkAsResolved={markAsResolved}
                             onStatusChange={(_, status) => changeStatus(status)}
                             onClearHistory={clearHistory}
                             onDeleteConversation={deleteConversation}
                             onDeleteMessage={deleteMessage}
                             // onNavigateToPipeline ignorado pois já estamos no contexto do lead
                          />
                       ) : (
                          <div className={`flex-1 flex items-center justify-center flex-col gap-4 p-6 ${isDark ? 'bg-[#000000]' : 'bg-white'}`}>
                             <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
                                isDark ? 'bg-white/10' : 'bg-gray-200'
                             }`}>
                                <MessageSquare className={`w-8 h-8 ${isDark ? 'text-white/50' : 'text-gray-400'}`} />
                             </div>
                             <p className={`text-center ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
                                Nenhuma conversa iniciada com este lead.
                             </p>
                             
                             {/* ✅ Seletor de Inbox */}
                             <div className="w-full max-w-sm space-y-3">
                                {!hasPhone ? (
                                   <div className={`p-4 rounded-lg border text-center space-y-2 ${
                                      isDark ? 'bg-yellow-500/10 border-yellow-500/20' : 'bg-yellow-50 border-yellow-200'
                                   }`}>
                                      <Phone className={`w-8 h-8 mx-auto ${isDark ? 'text-yellow-400' : 'text-yellow-600'}`} />
                                      <p className={`text-sm font-medium ${isDark ? 'text-yellow-400' : 'text-yellow-700'}`}>
                                         Telefone necessário
                                      </p>
                                      <p className={`text-xs ${isDark ? 'text-yellow-400/70' : 'text-yellow-600'}`}>
                                         Para iniciar uma conversa, adicione um telefone ao lead nos campos principais ou personalizados.
                                      </p>
                                   </div>
                                ) : (
                                   <>
                                      <div>
                                         {loadingInboxes ? (
                                            <div className={`text-sm text-center py-2 ${isDark ? 'text-white/40' : 'text-gray-400'}`}>
                                               Carregando caixas...
                                            </div>
                                         ) : availableInboxes.length > 0 ? (
                                            <select
                                               value={selectedInboxId}
                                               onChange={(e) => setSelectedInboxId(e.target.value)}
                                               style={isDark ? { colorScheme: 'dark' } : undefined}
                                               className={`w-full px-3 py-2 rounded-lg text-sm border transition-colors ${
                                                  isDark
                                                     ? 'bg-white/[0.05] text-white border-white/[0.08] focus:border-[#0169D9]'
                                                     : 'bg-white text-gray-900 border-gray-300 focus:border-[#0169D9]'
                                               } focus:outline-none focus:ring-1 focus:ring-[#0169D9]`}
                                            >
                                               {availableInboxes.map(inbox => (
                                                  <option key={inbox.id} value={inbox.id} className={isDark ? 'bg-[#0a0a0a] text-white' : 'bg-white text-black'}>
                                                     {inbox.name} ({inbox.channel})
                                                  </option>
                                               ))}
                                            </select>
                                         ) : (
                                            <NoInboxNotification 
                                               isDark={isDark}
                                               onNavigateToInstances={onNavigateToInstances}
                                            />
                                         )}
                                      </div>
                                      
                                      {availableInboxes.length > 0 && (
                                         <>
                                            <div>
                                               <label className={`block text-xs font-medium mb-2 ${isDark ? 'text-white/60' : 'text-gray-600'}`}>
                                                  Selecione o Telefone:
                                               </label>
                                               {availablePhones.length > 0 ? (
                                                  <select
                                                     value={selectedPhone}
                                                     onChange={(e) => setSelectedPhone(e.target.value)}
                                                     style={isDark ? { colorScheme: 'dark' } : undefined}
                                                     className={`w-full px-3 py-2 rounded-lg text-sm border transition-colors ${
                                                        isDark
                                                           ? 'bg-white/[0.05] text-white border-white/[0.08] focus:border-[#0169D9]'
                                                           : 'bg-white text-gray-900 border-gray-300 focus:border-[#0169D9]'
                                                     } focus:outline-none focus:ring-1 focus:ring-[#0169D9]`}
                                                  >
                                                     {availablePhones.map((phone, index) => (
                                                        <option key={`${phone.value}-${index}`} value={phone.value} className={isDark ? 'bg-[#0a0a0a] text-white' : 'bg-white text-black'}>
                                                           {phone.label}
                                                        </option>
                                                     ))}
                                                  </select>
                                               ) : (
                                                  <div className={`text-sm text-center py-2 ${isDark ? 'text-red-400' : 'text-red-600'}`}>
                                                     Nenhum telefone disponível
                                                  </div>
                                               )}
                                            </div>
                                            
                                            <button
                                               onClick={handleCreateConversation}
                                               disabled={isCreatingConversation || !selectedInboxId || loadingInboxes || !hasPhone}
                                               className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                                                  isCreatingConversation || !selectedInboxId || loadingInboxes || !hasPhone
                                                     ? 'bg-gray-400 cursor-not-allowed opacity-60'
                                                     : 'bg-[#0169D9] hover:bg-[#0169D9]/90'
                                               } text-white`}
                                            >
                                               <Send className={`w-4 h-4 ${isCreatingConversation ? 'animate-spin' : ''}`} />
                                               {isCreatingConversation ? 'Criando...' : 'Iniciar Conversa'}
                                            </button>
                                         </>
                                      )}
                                   </>
                                )}
                             </div>
                          </div>
                       )}
                    </div>
                 )}

                 {activeTab === 'data' && (
                    <div className={`p-6 overflow-y-auto scrollbar-thin h-full ${
                       isDark ? 'bg-[#000000]' : 'bg-gray-50'
                    }`}>
                       <div className="max-w-3xl mx-auto">
                          {/* Header com título e botão de adicionar */}
                          <div className="flex items-center justify-between mb-6">
                             <h3 className={`text-lg font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                Campos Personalizados
                             </h3>
                             <button
                                onClick={() => setShowAddFieldForm(true)}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                                   isDark
                                      ? 'bg-white/10 hover:bg-white/20 text-white'
                                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                                }`}
                             >
                                <Plus className="w-4 h-4" />
                                Adicionar Campo
                             </button>
                          </div>

                          {/* Formulário para adicionar novo campo */}
                          {showAddFieldForm && (
                             <div className={`mb-6 p-4 rounded-lg border ${
                                isDark ? 'bg-white/[0.03] border-white/[0.12]' : 'bg-white border-gray-200 shadow-sm'
                             }`}>
                                <h4 className={`text-sm font-medium mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                   Novo Campo Personalizado
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                   {/* Nome do Campo */}
                                   <div>
                                      <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-white/60' : 'text-gray-500'}`}>
                                         Nome do Campo *
                                      </label>
                                      <input
                                         type="text"
                                         value={newFieldName}
                                         onChange={(e) => setNewFieldName(e.target.value)}
                                         placeholder="Ex: CNPJ, Website, etc."
                                         className={`w-full px-3 py-2 rounded-lg border text-sm transition-all focus:outline-none focus:ring-1 focus:ring-[#0169D9] ${
                                            isDark
                                               ? 'bg-white/[0.05] border-white/[0.1] text-white placeholder-white/30'
                                               : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400'
                                         }`}
                                      />
                                   </div>

                                   {/* Tipo do Campo */}
                                   <div>
                                      <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-white/60' : 'text-gray-500'}`}>
                                         Tipo do Campo
                                      </label>
                                      <select
                                         value={newFieldType}
                                         onChange={(e) => setNewFieldType(e.target.value as any)}
                                         style={isDark ? { colorScheme: 'dark' } : undefined}
                                         className={`w-full px-3 py-2 rounded-lg border text-sm transition-all focus:outline-none focus:ring-1 focus:ring-[#0169D9] ${
                                            isDark
                                               ? 'bg-white/[0.05] border-white/[0.1] text-white'
                                               : 'bg-gray-50 border-gray-200 text-gray-900'
                                         }`}
                                      >
                                         <option value="text" className={isDark ? 'bg-[#0a0a0a] text-white' : 'bg-white text-black'}>Texto</option>
                                         <option value="number" className={isDark ? 'bg-[#0a0a0a] text-white' : 'bg-white text-black'}>Número</option>
                                         <option value="date" className={isDark ? 'bg-[#0a0a0a] text-white' : 'bg-white text-black'}>Data</option>
                                         <option value="email" className={isDark ? 'bg-[#0a0a0a] text-white' : 'bg-white text-black'}>E-mail</option>
                                         <option value="phone" className={isDark ? 'bg-[#0a0a0a] text-white' : 'bg-white text-black'}>Telefone</option>
                                         <option value="url" className={isDark ? 'bg-[#0a0a0a] text-white' : 'bg-white text-black'}>URL</option>
                                         <option value="textarea" className={isDark ? 'bg-[#0a0a0a] text-white' : 'bg-white text-black'}>Texto Longo</option>
                                      </select>
                                   </div>

                                   {/* Valor Inicial */}
                                   <div>
                                      <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-white/60' : 'text-gray-500'}`}>
                                         Valor Inicial (opcional)
                                      </label>
                                      <input
                                         type={newFieldType === 'number' ? 'number' : newFieldType === 'date' ? 'date' : 'text'}
                                         value={newFieldValue}
                                         onChange={(e) => setNewFieldValue(e.target.value)}
                                         placeholder="Valor inicial..."
                                         className={`w-full px-3 py-2 rounded-lg border text-sm transition-all focus:outline-none focus:ring-1 focus:ring-[#0169D9] ${
                                            isDark
                                               ? 'bg-white/[0.05] border-white/[0.1] text-white placeholder-white/30'
                                               : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400'
                                         }`}
                                      />
                                   </div>
                                </div>

                                {/* Botões de Ação */}
                                <div className="flex items-center justify-end gap-3 mt-4">
                                   <button
                                      onClick={handleCancelAddField}
                                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                                         isDark
                                            ? 'text-white/60 hover:text-white hover:bg-white/10'
                                            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                                      }`}
                                   >
                                      Cancelar
                                   </button>
                                   <button
                                      onClick={handleAddCustomField}
                                      disabled={isAddingField || !newFieldName.trim()}
                                      className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                                         isAddingField || !newFieldName.trim()
                                            ? 'bg-gray-400 cursor-not-allowed opacity-60'
                                            : 'bg-[#0169D9] hover:bg-[#0169D9]/90'
                                      } text-white`}
                                   >
                                      {isAddingField ? (
                                         <>
                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                            Adicionando...
                                         </>
                                      ) : (
                                         <>
                                            <Plus className="w-4 h-4" />
                                            Adicionar
                                         </>
                                      )}
                                   </button>
                                </div>
                             </div>
                          )}

                          {(() => {
                             // ✅ CORREÇÃO: Usar customFields do formData se disponível (valores editados), senão usar do hook
                             const fieldsToRender = formData?.customFields && formData.customFields.length > 0 
                                ? formData.customFields 
                                : customFields;
                             
                             return fieldsToRender.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                   {fieldsToRender.map(field => {
                                   const isJsonField = field.fieldName.toLowerCase().includes('json');
                                   return (
                                      <div key={field.id} className={`group relative p-4 rounded-lg border transition-all ${
                                         isDark ? 'bg-white/[0.02] border-white/[0.08] hover:border-white/[0.15]' : 'bg-white border-gray-200 hover:border-gray-300'
                                      } ${isJsonField ? 'md:col-span-2' : ''}`}>
                                         {/* Botão de excluir - aparece ao passar o mouse */}
                                         <button
                                            onClick={(e) => {
                                               e.stopPropagation();
                                               handleDeleteCustomField(field.id, field.fieldName);
                                            }}
                                            className={`absolute top-2 right-2 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all ${
                                               isDark
                                                  ? 'hover:bg-red-500/20 text-red-400 hover:text-red-300'
                                                  : 'hover:bg-red-100 text-red-400 hover:text-red-500'
                                            }`}
                                            title="Excluir campo"
                                         >
                                            <Trash2 className="w-3.5 h-3.5" />
                                         </button>
                                         <label className={`block text-xs font-medium mb-1.5 pr-8 ${
                                            isDark ? 'text-white/60' : 'text-gray-500'
                                         }`}>
                                            {field.fieldName}
                                         </label>
                                         {(() => {
                                            // ✅ NOVA LÓGICA: Tentar detectar JSON automaticamente
                                            let isComplex = false;
                                            let parsedValue = null;
                                            
                                            try {
                                               parsedValue = JSON.parse(field.fieldValue);
                                               // Verificar se é um objeto ou array (não string/number/boolean)
                                               isComplex = typeof parsedValue === 'object' && parsedValue !== null;
                                            } catch {
                                               isComplex = false;
                                            }
                                            
                                            // Se for um campo complexo (JSON), renderizar inline editável
                                            if (isComplex) {
                                               const isEditing = editingFieldId === field.id;
                                               
                                               // ===== EMAIL DO DOMÍNIO (objeto único) =====
                                               if (!Array.isArray(parsedValue) && parsedValue.address && parsedValue.source !== undefined) {
                                                  const domainEmail = parsedValue as DomainEmailEntry;
                                                  const updateField = (key: keyof DomainEmailEntry, value: any) => {
                                                     const updated = { ...domainEmail, [key]: value };
                                                     handleCustomFieldChange(field.id, JSON.stringify(updated));
                                                  };
                                                  
                                                  return (
                                                     <div 
                                                        onClick={() => !isEditing && setEditingFieldId(field.id)}
                                                        className={`flex items-start gap-2 p-2 rounded border cursor-pointer transition-all ${
                                                           isDark ? 'border-white/[0.05] bg-white/[0.02] hover:bg-white/[0.05]' : 'border-gray-100 bg-gray-50 hover:bg-gray-100'
                                                        } ${isEditing ? 'ring-2 ring-[#0169D9]' : ''}`}
                                                     >
                                                        <Mail className="w-4 h-4 opacity-50 mt-0.5 flex-shrink-0" />
                                                        <div className="flex-1 min-w-0">
                                                           {isEditing ? (
                                                              <input
                                                                 type="email"
                                                                 value={domainEmail.address}
                                                                 onChange={(e) => updateField('address', e.target.value)}
                                                                 onBlur={() => setEditingFieldId(null)}
                                                                 autoFocus
                                                                 onClick={(e) => e.stopPropagation()}
                                                                 className={`w-full text-sm bg-transparent border-none outline-none ${isDark ? 'text-white' : 'text-gray-900'}`}
                                                              />
                                                           ) : (
                                                              <div className={`text-sm break-all ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                                                 {domainEmail.address}
                                                              </div>
                                                           )}
                                                           <div className="flex items-center gap-2 mt-1">
                                                              <span className="text-xs px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-500">
                                                                 Domínio
                                                              </span>
                                                              <span className={`text-xs ${isDark ? 'text-white/40' : 'text-gray-400'}`}>
                                                                 {domainEmail.source}
                                                              </span>
                                                              {domainEmail.verified && (
                                                                 <CheckCircle className="w-3 h-3 text-green-500" />
                                                              )}
                                                           </div>
                                                        </div>
                                                     </div>
                                                  );
                                               }
                                               
                                               // ===== ARRAY DE EMAILS =====
                                               if (Array.isArray(parsedValue) && parsedValue.length > 0 && parsedValue[0].address && parsedValue[0].type) {
                                                  const emails = parsedValue as EmailEntry[];
                                                  const updateEmail = (index: number, key: keyof EmailEntry, value: any) => {
                                                     const updated = [...emails];
                                                     updated[index] = { ...updated[index], [key]: value };
                                                     handleCustomFieldChange(field.id, JSON.stringify(updated));
                                                  };
                                                  
                                                  return (
                                                     <div className="space-y-2">
                                                        {emails.map((email, idx) => {
                                                           const itemId = `${field.id}-${idx}`;
                                                           const isItemEditing = editingFieldId === itemId;
                                                           
                                                           return (
                                                              <div 
                                                                 key={idx}
                                                                 onClick={() => !isItemEditing && setEditingFieldId(itemId)}
                                                                 className={`flex items-start gap-2 p-2 rounded border cursor-pointer transition-all ${
                                                                    isDark ? 'border-white/[0.05] bg-white/[0.02] hover:bg-white/[0.05]' : 'border-gray-100 bg-gray-50 hover:bg-gray-100'
                                                                 } ${isItemEditing ? 'ring-2 ring-[#0169D9]' : ''}`}
                                                              >
                                                                 <Mail className="w-4 h-4 opacity-50 mt-0.5 flex-shrink-0" />
                                                                 <div className="flex-1 min-w-0">
                                                                    {isItemEditing ? (
                                                                       <input
                                                                          type="email"
                                                                          value={email.address}
                                                                          onChange={(e) => updateEmail(idx, 'address', e.target.value)}
                                                                          onBlur={() => setEditingFieldId(null)}
                                                                          autoFocus
                                                                          onClick={(e) => e.stopPropagation()}
                                                                          className={`w-full text-sm bg-transparent border-none outline-none ${isDark ? 'text-white' : 'text-gray-900'}`}
                                                                       />
                                                                    ) : (
                                                                       <div className={`text-sm break-all ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                                                          {email.address}
                                                                       </div>
                                                                    )}
                                                                    <div className="flex items-center gap-2 mt-1">
                                                                       <span className={`text-xs px-1.5 py-0.5 rounded ${
                                                                          email.type === 'main' ? 'bg-blue-500/10 text-blue-500' : 'bg-gray-500/10 text-gray-500'
                                                                       }`}>
                                                                          {email.type === 'main' ? 'Principal' : 'Contato'}
                                                                       </span>
                                                                       <span className={`text-xs ${isDark ? 'text-white/40' : 'text-gray-400'}`}>
                                                                          {email.source}
                                                                       </span>
                                                                       {email.verified && (
                                                                          <CheckCircle className="w-3 h-3 text-green-500" />
                                                                       )}
                                                                    </div>
                                                                 </div>
                                                              </div>
                                                           );
                                                        })}
                                                     </div>
                                                  );
                                               }
                                               
                                               // ===== ARRAY DE TELEFONES =====
                                               if (Array.isArray(parsedValue) && parsedValue.length > 0 && parsedValue[0].with_country) {
                                                  const phones = parsedValue as PhoneEntry[];
                                                  const updatePhone = (index: number, key: keyof PhoneEntry, value: any) => {
                                                     const updated = [...phones];
                                                     updated[index] = { ...updated[index], [key]: value };
                                                     handleCustomFieldChange(field.id, JSON.stringify(updated));
                                                  };
                                                  
                                                  return (
                                                     <div className="space-y-2">
                                                        {phones.map((phone, idx) => {
                                                           const itemId = `${field.id}-${idx}`;
                                                           const isItemEditing = editingFieldId === itemId;
                                                           
                                                           return (
                                                              <div 
                                                                 key={idx}
                                                                 onClick={() => !isItemEditing && setEditingFieldId(itemId)}
                                                                 className={`flex items-start gap-2 p-2 rounded border cursor-pointer transition-all ${
                                                                    isDark ? 'border-white/[0.05] bg-white/[0.02] hover:bg-white/[0.05]' : 'border-gray-100 bg-gray-50 hover:bg-gray-100'
                                                                 } ${isItemEditing ? 'ring-2 ring-[#0169D9]' : ''}`}
                                                              >
                                                                 <Phone className="w-4 h-4 opacity-50 mt-0.5 flex-shrink-0" />
                                                                 <div className="flex-1 min-w-0">
                                                                    {isItemEditing ? (
                                                                       <input
                                                                          type="text"
                                                                          value={phone.with_country}
                                                                          onChange={(e) => updatePhone(idx, 'with_country', e.target.value)}
                                                                          onBlur={() => setEditingFieldId(null)}
                                                                          autoFocus
                                                                          onClick={(e) => e.stopPropagation()}
                                                                          className={`w-full text-sm bg-transparent border-none outline-none ${isDark ? 'text-white' : 'text-gray-900'}`}
                                                                       />
                                                                    ) : (
                                                                       <div className={`text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                                                          {phone.with_country}
                                                                       </div>
                                                                    )}
                                                                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                                                                       <span className={`text-xs px-1.5 py-0.5 rounded ${
                                                                          phone.type === 'mobile' ? 'bg-purple-500/10 text-purple-500' : 'bg-gray-500/10 text-gray-500'
                                                                       }`}>
                                                                          {phone.type === 'mobile' ? 'Celular' : 'Fixo'}
                                                                       </span>
                                                                       <span className={`text-xs ${isDark ? 'text-white/40' : 'text-gray-400'}`}>
                                                                          {phone.source}
                                                                       </span>
                                                                       {phone.whatsapp && (
                                                                          <span className="text-xs px-1.5 py-0.5 rounded bg-green-500/10 text-green-500">
                                                                             WhatsApp
                                                                          </span>
                                                                       )}
                                                                       {phone.verified && (
                                                                          <CheckCircle className="w-3 h-3 text-green-500" />
                                                                       )}
                                                                    </div>
                                                                 </div>
                                                              </div>
                                                           );
                                                        })}
                                                     </div>
                                                  );
                                               }
                                               
                                               // ===== ARRAY DE WEBSITES =====
                                               if (Array.isArray(parsedValue) && parsedValue.length > 0 && parsedValue[0].url && parsedValue[0].domain) {
                                                  const websites = parsedValue as WebsiteEntry[];
                                                  const updateWebsite = (index: number, key: keyof WebsiteEntry, value: any) => {
                                                     const updated = [...websites];
                                                     updated[index] = { ...updated[index], [key]: value };
                                                     handleCustomFieldChange(field.id, JSON.stringify(updated));
                                                  };
                                                  
                                                  return (
                                                     <div className="space-y-2">
                                                        {websites.map((website, idx) => {
                                                           const itemId = `${field.id}-${idx}`;
                                                           const isItemEditing = editingFieldId === itemId;
                                                           
                                                           return (
                                                              <div 
                                                                 key={idx}
                                                                 onClick={() => !isItemEditing && setEditingFieldId(itemId)}
                                                                 className={`flex items-start gap-2 p-2 rounded border cursor-pointer transition-all ${
                                                                    isDark ? 'border-white/[0.05] bg-white/[0.02] hover:bg-white/[0.05]' : 'border-gray-100 bg-gray-50 hover:bg-gray-100'
                                                                 } ${isItemEditing ? 'ring-2 ring-[#0169D9]' : ''}`}
                                                              >
                                                                 <Globe className="w-4 h-4 opacity-50 mt-0.5 flex-shrink-0" />
                                                                 <div className="flex-1 min-w-0">
                                                                    {isItemEditing ? (
                                                                       <input
                                                                          type="url"
                                                                          value={website.url}
                                                                          onChange={(e) => updateWebsite(idx, 'url', e.target.value)}
                                                                          onBlur={() => setEditingFieldId(null)}
                                                                          autoFocus
                                                                          onClick={(e) => e.stopPropagation()}
                                                                          className={`w-full text-sm bg-transparent border-none outline-none ${isDark ? 'text-white' : 'text-gray-900'}`}
                                                                       />
                                                                    ) : (
                                                                       <a 
                                                                          href={website.url} 
                                                                          target="_blank" 
                                                                          rel="noopener noreferrer"
                                                                          onClick={(e) => e.stopPropagation()}
                                                                          className={`text-sm break-all hover:underline ${isDark ? 'text-blue-400' : 'text-blue-600'}`}
                                                                       >
                                                                          {website.url}
                                                                       </a>
                                                                    )}
                                                                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                                                                       <span className={`text-xs px-1.5 py-0.5 rounded ${
                                                                          website.type === 'main' 
                                                                             ? 'bg-blue-500/10 text-blue-500' 
                                                                             : website.type === 'social'
                                                                             ? 'bg-pink-500/10 text-pink-500'
                                                                             : 'bg-gray-500/10 text-gray-500'
                                                                       }`}>
                                                                          {website.type === 'main' ? 'Principal' : website.type === 'social' ? 'Rede Social' : website.type}
                                                                       </span>
                                                                       <span className={`text-xs ${isDark ? 'text-white/40' : 'text-gray-400'}`}>
                                                                          {website.domain}
                                                                       </span>
                                                                       <span className={`text-xs ${isDark ? 'text-white/40' : 'text-gray-400'}`}>
                                                                          • {website.source}
                                                                       </span>
                                                                    </div>
                                                                 </div>
                                                              </div>
                                                           );
                                                        })}
                                                     </div>
                                                  );
                                               }
                                               
                                               // ===== ARRAY DE SÓCIOS =====
                                               if (Array.isArray(parsedValue) && parsedValue.length > 0 && parsedValue[0].nome_socio && parsedValue[0].qualificacao_socio) {
                                                  const socios = parsedValue as Array<{
                                                     nome_socio: string;
                                                     qualificacao_socio: string;
                                                     faixa_etaria?: string;
                                                     cnpj_cpf_do_socio?: string;
                                                     data_entrada_sociedade?: string;
                                                     pais?: string | null;
                                                     [key: string]: any;
                                                  }>;
                                                  
                                                  return (
                                                     <div className="space-y-3">
                                                        {socios.map((socio, idx) => (
                                                           <div 
                                                              key={idx}
                                                              className={`p-3 rounded-lg border ${
                                                                 isDark ? 'border-white/[0.08] bg-white/[0.03]' : 'border-gray-200 bg-gray-50'
                                                              }`}
                                                           >
                                                              {/* Nome e Qualificação */}
                                                              <div className="flex items-start gap-2 mb-2">
                                                                 <User className="w-4 h-4 opacity-50 mt-0.5 flex-shrink-0" />
                                                                 <div className="flex-1 min-w-0">
                                                                    <div className={`font-medium text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                                                       {socio.nome_socio}
                                                                    </div>
                                                                    <div className="flex items-center gap-2 mt-1">
                                                                       <span className={`text-xs px-2 py-0.5 rounded ${
                                                                          socio.qualificacao_socio?.toLowerCase().includes('administrador')
                                                                             ? 'bg-purple-500/10 text-purple-500'
                                                                             : 'bg-blue-500/10 text-blue-500'
                                                                       }`}>
                                                                          {socio.qualificacao_socio}
                                                                       </span>
                                                                    </div>
                                                                 </div>
                                                              </div>
                                                              
                                                              {/* Informações adicionais */}
                                                              <div className={`grid grid-cols-2 gap-2 mt-2 text-xs ${isDark ? 'text-white/60' : 'text-gray-600'}`}>
                                                                 {socio.faixa_etaria && (
                                                                    <div>
                                                                       <span className="opacity-50">Idade:</span> {socio.faixa_etaria}
                                                                    </div>
                                                                 )}
                                                                 {socio.data_entrada_sociedade && (
                                                                    <div>
                                                                       <span className="opacity-50">Entrada:</span> {new Date(socio.data_entrada_sociedade).toLocaleDateString('pt-BR')}
                                                                    </div>
                                                                 )}
                                                                 {socio.cnpj_cpf_do_socio && (
                                                                    <div className="col-span-2">
                                                                       <span className="opacity-50">CPF/CNPJ:</span> {socio.cnpj_cpf_do_socio}
                                                                    </div>
                                                                 )}
                                                                 {socio.pais && (
                                                                    <div className="col-span-2">
                                                                       <span className="opacity-50">País:</span> {socio.pais}
                                                                    </div>
                                                                 )}
                                                              </div>
                                                           </div>
                                                        ))}
                                                     </div>
                                                  );
                                               }
                                               
                                               // JSON desconhecido - fallback
                                               return (
                                                  <div className={`text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                                     {renderFieldValue(field, isDark)}
                                                  </div>
                                               );
                                            }
                                            
                                            // Caso contrário, renderizar como campo editável
                                            return field.fieldType === 'textarea' ? (
                                                <textarea
                                                   value={field.fieldValue}
                                                   onChange={(e) => handleCustomFieldChange(field.id, e.target.value)}
                                                   rows={3}
                                                   className={`w-full px-3 py-2 rounded-lg border text-sm transition-all focus:outline-none focus:border-[#0169D9] ${
                                                      isDark
                                                         ? 'bg-transparent border-transparent text-white placeholder-white/30 hover:bg-white/[0.05] hover:border-white/[0.1] focus:bg-white/[0.05]'
                                                         : 'bg-transparent border-transparent text-gray-900 placeholder-gray-400 hover:bg-gray-50 hover:border-gray-200 focus:bg-white'
                                                   }`}
                                                   placeholder="Vazio"
                                                />
                                            ) : (
                                                <input
                                                   type={field.fieldType === 'number' ? 'number' : field.fieldType === 'date' ? 'date' : 'text'}
                                                   value={field.fieldValue}
                                                   onChange={(e) => handleCustomFieldChange(field.id, e.target.value)}
                                                   className={`w-full px-3 py-2 rounded-lg border text-sm transition-all focus:outline-none focus:border-[#0169D9] ${
                                                      isDark
                                                         ? 'bg-transparent border-transparent text-white placeholder-white/30 hover:bg-white/[0.05] hover:border-white/[0.1] focus:bg-white/[0.05]'
                                                         : 'bg-transparent border-transparent text-gray-900 placeholder-gray-400 hover:bg-gray-50 hover:border-gray-200 focus:bg-white'
                                                   }`}
                                                   placeholder="Vazio"
                                                />
                                            );
                                         })()}
                                      </div>
                                   );
                                   })}
                                </div>
                             ) : (
                                <div className={`text-center py-12 rounded-lg border border-dashed ${
                                   isDark ? 'border-white/[0.08]' : 'border-gray-300'
                                }`}>
                                   <FileText className={`w-12 h-12 mx-auto mb-4 ${isDark ? 'text-white/20' : 'text-gray-300'}`} />
                                   <p className={`text-sm font-medium mb-2 ${isDark ? 'text-white/60' : 'text-gray-500'}`}>
                                      Nenhum campo personalizado configurado
                                   </p>
                                   <p className={`text-xs mb-4 ${isDark ? 'text-white/40' : 'text-gray-400'}`}>
                                      Adicione campos personalizados para armazenar informações extras do lead
                                   </p>
                                   <button
                                      onClick={() => setShowAddFieldForm(true)}
                                      className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                         isDark
                                            ? 'bg-white/10 hover:bg-white/20 text-white'
                                            : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                                      }`}
                                   >
                                      <Plus className="w-4 h-4" />
                                      Adicionar Campo
                                   </button>
                                </div>
                             );
                          })()}
                       </div>
                    </div>
                 )}

                 {activeTab === 'activities' && (
                    <div className={`p-6 overflow-y-auto scrollbar-thin h-full ${
                       isDark ? 'bg-[#000000]' : 'bg-gray-50'
                    }`}>
                       <div className="max-w-3xl mx-auto">
                          <h3 className={`text-lg font-medium mb-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                             Timeline de Atividades
                          </h3>
                          <div className="space-y-6">
                             {loadingActivities ? (
                                <div className="text-center py-4">Carregando...</div>
                             ) : activities.length > 0 ? (
                                activities.map((activity) => (
                                   <div key={activity.id} className="flex gap-4">
                                      <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                                         isDark ? 'bg-white/10' : 'bg-gray-200'
                                      }`}>
                                         <Activity className="w-5 h-5 opacity-50" />
                                      </div>
                                      <div className="flex-1">
                                         <div className={`text-sm font-medium mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                            {activity.description || activity.message || activity.activity_type || activity.type || "Atividade registrada"}
                                         </div>
                                         <div className={`text-xs flex items-center gap-1 ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
                                            <span>{formatActivityTime(activity.created_at)}</span>
                                            {activity.users && (
                                               <>
                                                  <span>•</span>
                                                  <span>por {activity.users.name}</span>
                                               </>
                                            )}
                                         </div>
                                      </div>
                                   </div>
                                ))
                             ) : (
                                <div className={`text-center py-12 rounded-lg border border-dashed ${
                                   isDark ? 'border-white/[0.08] text-white/40' : 'border-gray-300 text-gray-500'
                                }`}>
                                   Nenhuma atividade registrada.
                                </div>
                             )}
                          </div>
                       </div>
                    </div>
                 )}

                 {activeTab === 'files' && (
                    <div className={`p-6 overflow-y-auto scrollbar-thin h-full ${
                       isDark ? 'bg-[#000000]' : 'bg-gray-50'
                    }`}>
                       <div className="max-w-3xl mx-auto">
                          {/* Header com título e botão de upload */}
                          <div className="flex items-center justify-between mb-6">
                             <h3 className={`text-lg font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                Arquivos do Lead
                             </h3>
                             <label className={`flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer transition-colors ${
                                uploadingFile
                                   ? 'bg-gray-400 cursor-not-allowed'
                                   : 'bg-[#0169D9] hover:bg-[#0169D9]/90'
                             } text-white text-sm font-medium`}>
                                {uploadingFile ? (
                                   <>
                                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                      Enviando...
                                   </>
                                ) : (
                                   <>
                                      <Upload className="w-4 h-4" />
                                      Enviar Arquivo
                                   </>
                                )}
                                <input
                                   type="file"
                                   className="hidden"
                                   onChange={handleFileUpload}
                                   disabled={uploadingFile}
                                   accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.doc,.docx,.xls,.xlsx,.txt,.csv,.zip,.rar"
                                />
                             </label>
                          </div>

                          {/* Zona de Drag and Drop - sempre visível */}
                          <div
                             className={`mb-6 p-8 rounded-xl border-2 border-dashed text-center cursor-pointer transition-all ${
                                isDraggingFile
                                   ? 'border-[#0169D9] bg-[#0169D9]/20 scale-[1.02]'
                                   : isDark
                                      ? 'border-white/20 hover:border-[#0169D9]/50 hover:bg-white/[0.03]'
                                      : 'border-gray-300 hover:border-[#0169D9]/50 hover:bg-blue-50/50'
                             }`}
                             onClick={() => {
                                if (uploadingFile) return;
                                const input = document.createElement('input');
                                input.type = 'file';
                                input.accept = '.pdf,.jpg,.jpeg,.png,.gif,.webp,.doc,.docx,.xls,.xlsx,.txt,.csv,.zip,.rar';
                                input.onchange = (e) => {
                                   const file = (e.target as HTMLInputElement).files?.[0];
                                   if (file) uploadFile(file);
                                };
                                input.click();
                             }}
                             onDragOver={handleDragOver}
                             onDragLeave={handleDragLeave}
                             onDrop={handleDrop}
                          >
                             {uploadingFile ? (
                                <>
                                   <div className="w-10 h-10 border-3 border-[#0169D9] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                                   <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-700'}`}>
                                      Enviando arquivo...
                                   </p>
                                </>
                             ) : isDraggingFile ? (
                                <>
                                   <Upload className="w-12 h-12 mx-auto mb-3 text-[#0169D9] animate-bounce" />
                                   <p className={`text-base font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                      Solte o arquivo aqui!
                                   </p>
                                </>
                             ) : (
                                <>
                                   <div className={`w-14 h-14 mx-auto mb-3 rounded-full flex items-center justify-center ${
                                      isDark ? 'bg-white/10' : 'bg-gray-100'
                                   }`}>
                                      <Upload className={`w-7 h-7 ${isDark ? 'text-white/60' : 'text-gray-400'}`} />
                                   </div>
                                   <p className={`text-sm font-medium mb-1 ${isDark ? 'text-white/80' : 'text-gray-600'}`}>
                                      Arraste e solte arquivos aqui
                                   </p>
                                   <p className={`text-xs ${isDark ? 'text-white/40' : 'text-gray-400'}`}>
                                      ou clique para selecionar
                                   </p>
                                   <p className={`text-xs mt-3 ${isDark ? 'text-white/30' : 'text-gray-400'}`}>
                                      PDF, imagens, documentos, planilhas • Máximo 50MB
                                   </p>
                                </>
                             )}
                          </div>

                          {/* Lista de arquivos */}
                          {loadingFiles ? (
                             <div className="flex items-center justify-center py-12">
                                <div className="w-8 h-8 border-2 border-[#0169D9] border-t-transparent rounded-full animate-spin" />
                             </div>
                          ) : leadFiles.length > 0 ? (
                             <div className="space-y-3">
                                {leadFiles.map((file) => (
                                   <div
                                      key={file.id}
                                      className={`flex items-center gap-4 p-4 rounded-lg border transition-colors ${
                                         isDark
                                            ? 'bg-white/[0.02] border-white/[0.08] hover:bg-white/[0.05]'
                                            : 'bg-white border-gray-200 hover:bg-gray-50'
                                      }`}
                                   >
                                      {/* Ícone do arquivo */}
                                      <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${
                                         file.file_type.includes('pdf')
                                            ? 'bg-red-500/10 text-red-500'
                                            : file.file_type.startsWith('image/')
                                            ? 'bg-green-500/10 text-green-500'
                                            : file.file_type.includes('spreadsheet') || file.file_type.includes('excel') || file.file_type === 'text/csv'
                                            ? 'bg-emerald-500/10 text-emerald-500'
                                            : 'bg-blue-500/10 text-blue-500'
                                      }`}>
                                         {getFileIcon(file.file_type)}
                                      </div>

                                      {/* Informações do arquivo */}
                                      <div className="flex-1 min-w-0">
                                         <p className={`text-sm font-medium truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                            {file.file_name}
                                         </p>
                                         <div className={`flex items-center gap-2 text-xs ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
                                            <span>{formatFileSize(file.file_size)}</span>
                                            <span>•</span>
                                            <span>{new Date(file.created_at).toLocaleDateString('pt-BR', {
                                               day: '2-digit',
                                               month: '2-digit',
                                               year: 'numeric',
                                               hour: '2-digit',
                                               minute: '2-digit'
                                            })}</span>
                                         </div>
                                      </div>

                                      {/* Ações */}
                                      <div className="flex items-center gap-2">
                                         <button
                                            onClick={() => handleFileDownload(file)}
                                            className={`p-2 rounded-lg transition-colors ${
                                               isDark
                                                  ? 'hover:bg-white/10 text-white/60 hover:text-white'
                                                  : 'hover:bg-gray-100 text-gray-500 hover:text-gray-700'
                                            }`}
                                            title="Baixar arquivo"
                                         >
                                            <Download className="w-4 h-4" />
                                         </button>
                                         <button
                                            onClick={() => handleFileDelete(file)}
                                            disabled={deletingFileId === file.id}
                                            className={`p-2 rounded-lg transition-colors ${
                                               deletingFileId === file.id
                                                  ? 'opacity-50 cursor-not-allowed'
                                                  : isDark
                                                  ? 'hover:bg-red-500/20 text-red-400 hover:text-red-300'
                                                  : 'hover:bg-red-100 text-red-500 hover:text-red-600'
                                            }`}
                                            title="Excluir arquivo"
                                         >
                                            {deletingFileId === file.id ? (
                                               <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                            ) : (
                                               <Trash2 className="w-4 h-4" />
                                            )}
                                         </button>
                                      </div>
                                   </div>
                                ))}
                             </div>
                          ) : (
                             <div className={`text-center py-6 ${isDark ? 'text-white/40' : 'text-gray-400'}`}>
                                <p className="text-sm">
                                   Nenhum arquivo enviado ainda
                                </p>
                             </div>
                          )}
                       </div>
                    </div>
                 )}

                 {/* Aba de Documentos */}
                 {activeTab === 'documents' && (
                    <div className={`h-full flex ${isDark ? 'bg-[#000000]' : 'bg-gray-50'}`}>
                       {/* Lista de Documentos */}
                       <div className="flex-1 p-6 overflow-y-auto scrollbar-thin">
                          <div className="max-w-3xl mx-auto">
                             {loadingDocuments ? (
                                <div className="flex items-center justify-center py-12">
                                   <div className="w-8 h-8 border-2 border-[#0169D9] border-t-transparent rounded-full animate-spin" />
                                </div>
                             ) : (
                                <DocumentsList
                                   documents={leadDocuments}
                                   folders={documentFolders}
                                   onCreateDocument={handleCreateDocument}
                                   onSelectDocument={(doc) => {
                                      setSelectedDocument(doc);
                                      setIsEditingDocument(true);
                                   }}
                                   onDeleteDocument={handleDeleteDocument}
                                   onPinDocument={(docId, isPinned) => handleUpdateDocument(docId, { is_pinned: isPinned })}
                                   onRenameDocument={(docId, newTitle) => handleUpdateDocument(docId, { title: newTitle })}
                                   onCreateFolder={handleCreateFolder}
                                   onDeleteFolder={handleDeleteFolder}
                                   onRenameFolder={handleRenameFolder}
                                   onMoveDocument={handleMoveDocument}
                                   theme={theme}
                                />
                             )}
                          </div>
                       </div>
                    </div>
                 )}

                 {/* Editor de Documento Expandido (Fullscreen Google Docs Style) */}
                 {isEditingDocument && selectedDocument && (
                    <DocumentEditor
                       document={selectedDocument}
                       onSave={(content) => handleUpdateDocument(selectedDocument.id, { content })}
                       saveStatus={documentSaveStatus}
                       onSaveStatusChange={setDocumentSaveStatus}
                       theme={theme}
                       workspaceId={currentWorkspace?.id}
                       userId={user?.id}
                       onSaveAsTemplate={handleSaveAsTemplate}
                       onRestoreVersion={handleRestoreVersion}
                       onBack={() => {
                          setIsEditingDocument(false);
                          setSelectedDocument(null);
                       }}
                       onTitleChange={(newTitle) => {
                          setSelectedDocument(prev => prev ? { ...prev, title: newTitle } : null);
                          handleUpdateDocument(selectedDocument.id, { title: newTitle });
                       }}
                       startExpanded={true}
                    />
                 )}
              </div>
           </div>

           {/* Right Column - Sidebar */}
           <div className={`w-80 flex-shrink-0 border-l overflow-y-auto scrollbar-thin ${
              isDark ? 'border-white/[0.08] bg-[#000000]' : 'border-border-light bg-white'
           }`}>
              <div className="p-6 space-y-6">
                 
                 {/* Section: Details */}
                 <div>
                    <h4 className={`text-xs font-bold uppercase tracking-wider mb-4 ${
                       isDark ? 'text-white/40' : 'text-gray-500'
                    }`}>
                       Detalhes
                    </h4>
                    
                    <div className="space-y-4">
                       <div className="group">
                          <label className={`block text-xs mb-1 ${isDark ? 'text-white/60' : 'text-gray-500'}`}>Organização</label>
                          <div className="flex items-center gap-2">
                             <Building2 className="w-4 h-4 opacity-50" />
                             <input 
                                type="text"
                                value={formData.company || ''}
                                onChange={e => setFormData({...formData, company: e.target.value})}
                                className={`bg-transparent border-none p-0 w-full text-sm focus:ring-0 ${
                                   isDark ? 'text-white' : 'text-gray-900'
                                }`}
                                placeholder="Adicionar empresa..."
                             />
                          </div>
                       </div>

                       <div className="group">
                          <label className={`block text-xs mb-1 ${isDark ? 'text-white/60' : 'text-gray-500'}`}>Valor do Negócio</label>
                          <div className="flex items-center gap-2">
                             <DollarSign className="w-4 h-4 opacity-50" />
                             <input 
                                type="number"
                                value={formData.dealValue || ''}
                                onChange={e => setFormData({...formData, dealValue: Number(e.target.value)})}
                                className={`bg-transparent border-none p-0 w-full text-sm focus:ring-0 ${
                                   isDark ? 'text-white' : 'text-gray-900'
                                }`}
                                placeholder="R$ 0,00"
                             />
                          </div>
                       </div>

                       <div className="group">
                          <label className={`block text-xs mb-1 ${isDark ? 'text-white/60' : 'text-gray-500'}`}>Previsão de Fechamento</label>
                          <div className="flex items-center gap-2">
                             <Calendar className="w-4 h-4 opacity-50" />
                             <input 
                                type="date"
                                value={formData.dueDate || ''}
                                onChange={e => setFormData({...formData, dueDate: e.target.value})}
                                className={`bg-transparent border-none p-0 w-full text-sm focus:ring-0 ${
                                   isDark ? 'text-white' : 'text-gray-900'
                                }`}
                             />
                          </div>
                       </div>
                    </div>
                 </div>

                 <div className={`h-px ${isDark ? 'bg-white/[0.08]' : 'bg-gray-200'}`} />

                 {/* Section: Person */}
                 <div>
                    <h4 className={`text-xs font-bold uppercase tracking-wider mb-4 ${
                       isDark ? 'text-white/40' : 'text-gray-500'
                    }`}>
                       Pessoa
                    </h4>
                    
                    <div className="space-y-4">
                       <div className="group">
                          <label className={`block text-xs mb-1 ${isDark ? 'text-white/60' : 'text-gray-500'}`}>Nome Completo</label>
                          <div className="flex items-center gap-2">
                             <User className="w-4 h-4 opacity-50" />
                             <input 
                                type="text"
                                value={formData.clientName}
                                onChange={e => setFormData({...formData, clientName: e.target.value})}
                                className={`bg-transparent border-none p-0 w-full text-sm focus:ring-0 ${
                                   isDark ? 'text-white' : 'text-gray-900'
                                }`}
                             />
                          </div>
                       </div>
                    </div>
                 </div>

                 <div className={`h-px ${isDark ? 'bg-white/[0.08]' : 'bg-gray-200'}`} />

                 {/* Notes */}
                 <div>
                    <h4 className={`text-xs font-bold uppercase tracking-wider mb-4 ${
                       isDark ? 'text-white/40' : 'text-gray-500'
                    }`}>
                       Notas
                    </h4>
                    <textarea
                       value={formData.notes || ''}
                       onChange={e => setFormData({...formData, notes: e.target.value})}
                       className={`w-full p-3 rounded-lg text-sm resize-none h-32 focus:outline-none focus:ring-1 focus:ring-[#0169D9] ${
                          isDark 
                            ? 'bg-white/[0.05] text-white placeholder-white/30 border border-white/[0.08]' 
                            : 'bg-gray-50 text-gray-900 border border-gray-200'
                       }`}
                       placeholder="Adicionar notas sobre o lead..."
                    />
                 </div>

              </div>
           </div>

        </div>
      </div>

      {/* Modal de Confirmação de Exclusão de Campo Personalizado */}
      {deleteFieldModal.show && (
        <div className="fixed inset-0 flex items-center justify-center" style={{ zIndex: 10001 }}>
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={cancelDeleteCustomField}
          />

          {/* Modal */}
          <div className={`relative w-full max-w-md mx-4 rounded-xl shadow-2xl ${
            isDark ? 'bg-[#1a1a1a] border border-white/[0.1]' : 'bg-white'
          }`}>
            {/* Header */}
            <div className={`p-6 pb-4 border-b ${isDark ? 'border-white/[0.08]' : 'border-gray-200'}`}>
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${isDark ? 'bg-red-500/20' : 'bg-red-100'}`}>
                  <Trash2 className="w-5 h-5 text-red-500" />
                </div>
                <div>
                  <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    Excluir Campo
                  </h3>
                  <p className={`text-sm ${isDark ? 'text-white/60' : 'text-gray-500'}`}>
                    Esta ação não pode ser desfeita
                  </p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              <p className={`text-sm ${isDark ? 'text-white/80' : 'text-gray-600'}`}>
                Tem certeza que deseja excluir o campo{' '}
                <span className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  "{deleteFieldModal.fieldName}"
                </span>
                ? O valor deste campo será removido deste lead.
              </p>
            </div>

            {/* Footer */}
            <div className={`p-6 pt-4 border-t ${isDark ? 'border-white/[0.08]' : 'border-gray-200'}`}>
              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={cancelDeleteCustomField}
                  disabled={isDeletingField}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isDark
                      ? 'text-white/70 hover:text-white hover:bg-white/10'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  } ${isDeletingField ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmDeleteCustomField}
                  disabled={isDeletingField}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors ${
                    isDeletingField
                      ? 'bg-red-400 cursor-not-allowed'
                      : 'bg-red-500 hover:bg-red-600'
                  }`}
                >
                  {isDeletingField ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Excluindo...
                    </>
                  ) : (
                    'Excluir Campo'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Seleção de Template */}
      <TemplateSelector
        isOpen={showTemplateSelector}
        onClose={() => {
          setShowTemplateSelector(false);
          setPendingFolderId(undefined);
        }}
        onSelectTemplate={handleSelectTemplate}
        workspaceId={currentWorkspace?.id || ''}
        theme={theme}
      />

      {/* Modal de Salvar como Template */}
      {selectedDocument && (
        <SaveAsTemplateModal
          isOpen={showSaveAsTemplate}
          onClose={() => setShowSaveAsTemplate(false)}
          onSaved={() => {
            setShowSaveAsTemplate(false);
            toast.success('Template salvo com sucesso!');
          }}
          content={selectedDocument.content as Record<string, unknown>}
          defaultTitle={selectedDocument.title}
          workspaceId={currentWorkspace?.id || ''}
          userId={user?.id || ''}
          theme={theme}
        />
      )}

      {/* Modal de Confirmação de Exclusão de Documento/Pasta */}
      {deleteDocModal.show && (
        <div className="fixed inset-0 flex items-center justify-center" style={{ zIndex: 10001 }}>
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={cancelDeleteDoc}
          />

          {/* Modal */}
          <div className={`relative w-full max-w-md mx-4 rounded-xl shadow-2xl ${
            isDark ? 'bg-[#1a1a1a] border border-white/[0.1]' : 'bg-white'
          }`}>
            {/* Header */}
            <div className={`p-6 pb-4 border-b ${isDark ? 'border-white/[0.08]' : 'border-gray-200'}`}>
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${isDark ? 'bg-red-500/20' : 'bg-red-100'}`}>
                  <Trash2 className="w-5 h-5 text-red-500" />
                </div>
                <div>
                  <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    Excluir {deleteDocModal.type === 'document' ? 'Documento' : 'Pasta'}
                  </h3>
                  <p className={`text-sm ${isDark ? 'text-white/60' : 'text-gray-500'}`}>
                    Esta ação não pode ser desfeita
                  </p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              <p className={`text-sm ${isDark ? 'text-white/80' : 'text-gray-600'}`}>
                Tem certeza que deseja excluir {deleteDocModal.type === 'document' ? 'o documento' : 'a pasta'}{' '}
                <span className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  "{deleteDocModal.name}"
                </span>
                ?
                {deleteDocModal.type === 'folder' && (
                  <span className={`block mt-2 ${isDark ? 'text-yellow-400' : 'text-yellow-600'}`}>
                    Os documentos desta pasta serão movidos para a raiz.
                  </span>
                )}
              </p>
            </div>

            {/* Footer */}
            <div className={`p-6 pt-4 border-t ${isDark ? 'border-white/[0.08]' : 'border-gray-200'}`}>
              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={cancelDeleteDoc}
                  disabled={isDeletingDoc}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isDark
                      ? 'text-white/70 hover:text-white hover:bg-white/10'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  } ${isDeletingDoc ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmDeleteDoc}
                  disabled={isDeletingDoc}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors ${
                    isDeletingDoc
                      ? 'bg-red-400 cursor-not-allowed'
                      : 'bg-red-500 hover:bg-red-600'
                  }`}
                >
                  {isDeletingDoc ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Excluindo...
                    </>
                  ) : (
                    `Excluir ${deleteDocModal.type === 'document' ? 'Documento' : 'Pasta'}`
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}