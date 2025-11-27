import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, Trash2, Loader2 } from 'lucide-react';
import { useRagStore } from '../hooks/useRagStore';
import { useRagDocuments } from '../hooks/useRagDocuments';
import { useRagUpload } from '../hooks/useRagUpload';
import { useRagDelete } from '../hooks/useRagDelete';
import { RagEnabledSwitch } from './RagEnabledSwitch';
import { toast } from 'sonner@2.0.3';

interface RagKnowledgeBaseProps {
  agentId: string | null;
  isDark?: boolean;
}

export function RagKnowledgeBase({ agentId, isDark = true }: RagKnowledgeBaseProps) {
  const { collection, ensureStoreExists } = useRagStore(agentId);
  const { documents, isLoading, refetch } = useRagDocuments(agentId);
  const { uploadDocument, isUploading, uploadProgress } = useRagUpload(
    agentId,
    collection?.external_store_id || ''
  );
  const { deleteDocument, isDeleting } = useRagDelete();

  // Handler de upload
  const handleUpload = useCallback(async (acceptedFiles: File[]) => {
    if (!agentId) {
      toast.error('Agente não encontrado');
      return;
    }

    // Garantir que store existe
    let store = collection;
    if (!store) {
      try {
        toast.info('Configurando base de conhecimento...');
        store = await ensureStoreExists();
        toast.success('Base de conhecimento configurada!');
      } catch (err: any) {
        toast.error('Erro ao criar base de conhecimento');
        console.error(err);
        return;
      }
    }

    // Upload de cada arquivo
    for (const file of acceptedFiles) {
      const result = await uploadDocument(file);

      if (result.success) {
        toast.success(`${file.name} enviado com sucesso!`);
      } else {
        toast.error(`Erro ao enviar ${file.name}: ${result.error}`);
      }
    }

    // Atualizar lista
    await refetch();
  }, [agentId, collection, ensureStoreExists, uploadDocument, refetch]);

  // Handler de delete
  const handleDelete = useCallback(async (document: any) => {
    const confirmed = window.confirm(`Tem certeza que deseja excluir "${document.title}"?`);
    if (!confirmed) return;

    const result = await deleteDocument(document);

    if (result.success) {
      toast.success('Documento excluído com sucesso!');
      await refetch();
    } else {
      toast.error(`Erro ao excluir: ${result.error}`);
    }
  }, [deleteDocument, refetch]);

  // Dropzone config
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleUpload,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/msword': ['.doc'],
      'text/plain': ['.txt'],
      'text/markdown': ['.md'],
      'text/html': ['.html'],
      'text/csv': ['.csv'],
      'application/json': ['.json'],
    },
    maxSize: 100 * 1024 * 1024, // 100MB
    disabled: isUploading || !agentId,
  });

  // Formatar tamanho do arquivo
  const formatFileSize = (bytes?: number): string => {
    if (!bytes || bytes === 0) return 'N/A';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Formatar status
  const getStatusLabel = (status: string): { label: string; color: string } => {
    switch (status) {
      case 'completed':
        return { label: 'Indexado', color: isDark ? 'text-green-400' : 'text-green-600' };
      case 'processing':
        return { label: 'Processando...', color: isDark ? 'text-yellow-400' : 'text-yellow-600' };
      case 'failed':
        return { label: 'Erro', color: isDark ? 'text-red-400' : 'text-red-600' };
      default:
        return { label: 'Pendente', color: isDark ? 'text-gray-400' : 'text-gray-500' };
    }
  };

  if (!agentId) {
    return (
      <div className={`p-6 rounded-xl border text-center ${
        isDark ? 'bg-white/[0.02] border-white/[0.08]' : 'bg-white border-gray-200'
      }`}>
        <FileText className={`w-12 h-12 mx-auto mb-3 ${isDark ? 'text-white/30' : 'text-gray-300'}`} />
        <p className={`text-sm ${isDark ? 'text-white/60' : 'text-gray-600'}`}>
          Salve o agente primeiro para adicionar documentos
        </p>
      </div>
    );
  }

  return (
    <div className={`p-6 rounded-xl border ${
      isDark ? 'bg-white/[0.02] border-white/[0.08]' : 'bg-white border-gray-200'
    }`}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <FileText className={`w-5 h-5 ${isDark ? 'text-white/60' : 'text-gray-600'}`} />
        <div className="flex-1">
          <h3 className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Base de Conhecimento
          </h3>
          <p className={`text-xs mt-0.5 ${isDark ? 'text-white/40' : 'text-gray-500'}`}>
            Gemini File Search RAG
          </p>
        </div>
        {collection && (
          <div className={`px-2 py-1 rounded text-xs ${
            isDark ? 'bg-green-500/10 text-green-400' : 'bg-green-50 text-green-600'
          }`}>
            {collection.total_documents} doc(s)
          </div>
        )}
      </div>

      <p className={`text-xs mb-4 ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
        Faça upload de documentos para o agente usar como referência nas respostas
      </p>

      {/* RAG Enable/Disable Switch */}
      <div className="mb-4">
        <RagEnabledSwitch 
          agentId={agentId} 
          hasDocuments={documents.length > 0}
          isDark={isDark}
        />
      </div>

      {/* Upload Area */}
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-6 text-center cursor-pointer
          transition-all duration-200 mb-4
          ${isDragActive 
            ? 'border-[#0169D9] bg-[#0169D9]/10' 
            : isDark 
              ? 'border-white/[0.15] hover:border-white/[0.25] bg-white/[0.02]' 
              : 'border-gray-300 hover:border-gray-400 bg-gray-50'
          }
          ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <input {...getInputProps()} />

        {isUploading ? (
          <div className="space-y-3">
            <Loader2 className={`w-8 h-8 mx-auto animate-spin ${isDark ? 'text-[#0169D9]' : 'text-[#0169D9]'}`} />
            <p className={`text-sm ${isDark ? 'text-white/70' : 'text-gray-600'}`}>
              Enviando... {uploadProgress}%
            </p>
            <div className={`w-full rounded-full h-1.5 overflow-hidden ${
              isDark ? 'bg-white/[0.08]' : 'bg-gray-200'
            }`}>
              <div
                className="bg-[#0169D9] h-full transition-all duration-300 ease-out"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        ) : (
          <>
            <Upload className={`w-8 h-8 mx-auto mb-2 ${
              isDark ? 'text-white/40' : 'text-gray-400'
            }`} />
            <p className={`text-sm ${isDark ? 'text-white/70' : 'text-gray-600'}`}>
              {isDragActive ? 'Solte o arquivo aqui' : 'Arraste arquivos ou clique para fazer upload'}
            </p>
            <p className={`text-xs mt-1 ${isDark ? 'text-white/40' : 'text-gray-500'}`}>
              PDF, DOCX, TXT, MD, HTML, CSV ou JSON (máx. 100MB)
            </p>
          </>
        )}
      </div>

      {/* Documents List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className={`w-5 h-5 animate-spin ${isDark ? 'text-white/40' : 'text-gray-400'}`} />
        </div>
      ) : documents.length > 0 ? (
        <div className="space-y-2">
          <p className={`text-xs mb-2 ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
            Documentos ({documents.length})
          </p>
          {documents.map((doc) => {
            const status = getStatusLabel(doc.processing_status);

            return (
              <div
                key={doc.id}
                className={`flex items-center justify-between p-3 rounded-lg transition-colors ${
                  isDark 
                    ? 'bg-white/[0.03] hover:bg-white/[0.05]' 
                    : 'bg-gray-50 hover:bg-gray-100'
                }`}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <FileText className={`w-5 h-5 shrink-0 ${
                    isDark ? 'text-white/40' : 'text-gray-400'
                  }`} />
                  <div className="min-w-0">
                    <p className={`font-medium text-sm truncate ${
                      isDark ? 'text-white' : 'text-gray-900'
                    }`}>
                      {doc.title}
                    </p>
                    <p className={`text-xs ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
                      {formatFileSize(doc.metadata?.original_size)} • 
                      <span className={status.color}> {status.label}</span>
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => handleDelete(doc)}
                  disabled={isDeleting === doc.id}
                  className={`p-2 rounded-lg transition-colors shrink-0 ${
                    isDark 
                      ? 'hover:bg-white/[0.08] text-white/40 hover:text-red-400' 
                      : 'hover:bg-gray-200 text-gray-400 hover:text-red-500'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                  title="Excluir documento"
                >
                  {isDeleting === doc.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-8">
          <FileText className={`w-12 h-12 mx-auto mb-2 ${
            isDark ? 'text-white/20' : 'text-gray-300'
          }`} />
          <p className={`text-sm ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
            Nenhum documento enviado ainda
          </p>
          <p className={`text-xs mt-1 ${isDark ? 'text-white/40' : 'text-gray-400'}`}>
            Arraste arquivos ou clique na área acima para começar
          </p>
        </div>
      )}
    </div>
  );
}
