import { createClient } from "npm:@supabase/supabase-js@2";

const BUCKET_NAME = 'make-e4f9d774-media';

// ✅ Limites de tamanho (em bytes)
const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15 MB - limite do bucket
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5 MB - comprimir imagens acima disso
const MAX_VIDEO_SIZE = 15 * 1024 * 1024; // 15 MB
const MAX_AUDIO_SIZE = 15 * 1024 * 1024; // 15 MB

// Criar cliente Supabase com service role
const getSupabaseClient = () => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }
  
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    }
  });
};

/**
 * Inicializar bucket (criar se não existir)
 */
export async function initializeBucket(): Promise<void> {
  const supabase = getSupabaseClient();
  
  try {
    // Verificar se bucket existe
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error('[Storage] Error listing buckets:', listError);
      throw listError;
    }
    
    const bucketExists = buckets?.some(bucket => bucket.name === BUCKET_NAME);
    
    if (bucketExists) {
      console.log(`[Storage] ✅ Bucket '${BUCKET_NAME}' already exists`);
      return;
    }
    
    // Criar bucket privado
    console.log(`[Storage] Creating bucket '${BUCKET_NAME}'...`);
    const { data, error: createError } = await supabase.storage.createBucket(BUCKET_NAME, {
      public: false, // Bucket privado (usa signed URLs)
      fileSizeLimit: 15728640, // 15 MB (15 * 1024 * 1024)
      allowedMimeTypes: ['image/*', 'audio/*', 'video/*', 'application/*']
    });
    
    if (createError) {
      console.error('[Storage] Error creating bucket:', createError);
      throw createError;
    }
    
    console.log(`[Storage] ✅ Bucket '${BUCKET_NAME}' created successfully`);
  } catch (error) {
    console.error('[Storage] Initialization error:', error);
    throw error;
  }
}

/**
 * Upload de mídia para o Storage
 * @param base64Data - String base64 com ou sem prefixo data URI
 * @param mimeType - MIME type (ex: 'image/jpeg', 'audio/ogg')
 * @param conversationId - ID da conversa para organizar em pastas
 * @returns URL da mídia ou path relativo
 */
export async function uploadMedia(
  base64Data: string,
  mimeType: string,
  conversationId: string
): Promise<{ path: string; publicUrl: string; signedUrl: string }> {
  const supabase = getSupabaseClient();
  
  try {
    // 1. Remover prefixo data URI se existir
    let cleanBase64 = base64Data;
    if (base64Data.startsWith('data:')) {
      cleanBase64 = base64Data.split(',')[1];
    }
    
    // 2. Converter base64 para binary
    const binaryString = atob(cleanBase64);
    let bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    // ✅ 2.1. Validar tamanho ANTES do upload
    const fileSizeMB = bytes.length / (1024 * 1024);
    console.log(`[Storage] File size: ${fileSizeMB.toFixed(2)} MB`);
    
    if (bytes.length > MAX_FILE_SIZE) {
      // Arquivo muito grande - rejeitar com mensagem clara
      const errorMsg = `Arquivo muito grande (${fileSizeMB.toFixed(2)} MB). Limite: 15 MB`;
      console.error(`[Storage] ❌ ${errorMsg}`);
      throw new Error(errorMsg);
    }
    
    // 3. Determinar extensão do arquivo
    const extension = getExtensionFromMimeType(mimeType);
    
    // 4. Gerar path organizado: YYYY/MM/conversation_ID/timestamp_random.ext
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const timestamp = now.getTime();
    const random = Math.random().toString(36).substring(2, 8);
    const fileName = `${timestamp}_${random}.${extension}`;
    const filePath = `${year}/${month}/${conversationId}/${fileName}`;
    
    console.log(`[Storage] Uploading file: ${filePath}`);
    console.log(`[Storage] Final size: ${bytes.length} bytes (${(bytes.length / 1024).toFixed(2)} KB)`);
    console.log(`[Storage] MIME type: ${mimeType}`);
    
    // 5. Upload para o Storage
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, bytes, {
        contentType: mimeType,
        cacheControl: '3600',
        upsert: false
      });
    
    if (error) {
      console.error('[Storage] Upload error:', error);
      throw error;
    }
    
    console.log(`[Storage] ✅ File uploaded successfully: ${filePath}`);
    
    // 6. Gerar URL pública (não funciona para bucket privado, mas mantemos por compatibilidade)
    const { data: { publicUrl } } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath);
    
    // 7. Gerar Signed URL (válida por 1 ano para mensagens históricas)
    const { data: signedData, error: signedError } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUrl(filePath, 31536000); // 1 ano em segundos
    
    if (signedError) {
      console.error('[Storage] Error creating signed URL:', signedError);
      throw signedError;
    }
    
    console.log(`[Storage] ✅ Signed URL generated (valid for 1 year)`);
    
    return {
      path: filePath,
      publicUrl,
      signedUrl: signedData.signedUrl
    };
  } catch (error) {
    console.error('[Storage] Upload failed:', error);
    throw error;
  }
}

/**
 * Gerar nova Signed URL para um arquivo existente
 * @param filePath - Path do arquivo no bucket
 * @param expiresIn - Tempo de expiração em segundos (padrão: 1 ano)
 * @returns Signed URL
 */
export async function getSignedUrl(filePath: string, expiresIn: number = 31536000): Promise<string> {
  const supabase = getSupabaseClient();
  
  try {
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUrl(filePath, expiresIn);
    
    if (error) {
      console.error('[Storage] Error creating signed URL:', error);
      throw error;
    }
    
    return data.signedUrl;
  } catch (error) {
    console.error('[Storage] Failed to generate signed URL:', error);
    throw error;
  }
}

/**
 * Deletar arquivo do Storage
 * @param filePath - Path do arquivo no bucket
 */
export async function deleteMedia(filePath: string): Promise<void> {
  const supabase = getSupabaseClient();
  
  try {
    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([filePath]);
    
    if (error) {
      console.error('[Storage] Delete error:', error);
      throw error;
    }
    
    console.log(`[Storage] ✅ File deleted: ${filePath}`);
  } catch (error) {
    console.error('[Storage] Failed to delete file:', error);
    throw error;
  }
}

/**
 * Helper: Determinar extensão do arquivo baseado no MIME type
 */
function getExtensionFromMimeType(mimeType: string): string {
  const mimeMap: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'audio/ogg': 'ogg',
    'audio/mpeg': 'mp3',
    'audio/mp4': 'm4a',
    'audio/webm': 'webm',
    'audio/wav': 'wav',
    'video/mp4': 'mp4',
    'video/webm': 'webm',
    'application/pdf': 'pdf',
    'application/msword': 'doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  };
  
  return mimeMap[mimeType] || 'bin';
}

/**
 * Helper: Verificar se uma URL é do Supabase Storage
 */
export function isStorageUrl(url: string): boolean {
  if (!url) return false;
  return url.includes('supabase.co/storage/v1/object');
}

/**
 * Helper: Extrair path de uma signed URL
 */
export function extractPathFromSignedUrl(signedUrl: string): string | null {
  try {
    const url = new URL(signedUrl);
    const pathMatch = url.pathname.match(/\/object\/sign\/[^/]+\/(.+)/);
    return pathMatch ? pathMatch[1].split('?')[0] : null;
  } catch {
    return null;
  }
}