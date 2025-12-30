import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// VERSION 9 - Uses global config table
const FUNCTION_VERSION = "v9";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization"
};

// Default config (usado se não houver config no banco)
const DEFAULT_CONFIG = {
  audio_enabled: true,
  audio_model: "whisper-large-v3",
  audio_language: "pt",
  audio_provider: "groq",
  image_enabled: true,
  image_model: "openai/gpt-4o-mini",
  image_provider: "openrouter",
  image_max_tokens: 500,
  image_temperature: 0.5,
  image_prompt: "Analise esta imagem em português. Responda EXATAMENTE neste formato:\n\n**TIPO:** [screenshot | documento | foto | outro]\n**QUALIDADE:** [boa | regular | ruim] - Se ruim, diga o motivo (borrada, escura, cortada)\n\n**TEXTO VISÍVEL:**\n[Transcreva todo texto que aparece. Se não houver texto, escreva \"Nenhum texto visível\"]\n\n**DESCRIÇÃO:**\n[Descreva o conteúdo em 2-3 frases]\n\nSe a imagem estiver com qualidade RUIM e isso comprometer a leitura de documentos, adicione no final:\n⚠️ REENVIO NECESSÁRIO: [explique o problema e peça nova foto]",
  video_enabled: false,
  video_prompt: "Descreva o conteúdo deste vídeo de forma concisa em português.",
  timeout_seconds: 60,
  max_retries: 2
};

interface TranscriptionConfig {
  audio_enabled: boolean;
  audio_model: string;
  audio_language: string;
  audio_provider: string;
  image_enabled: boolean;
  image_model: string;
  image_provider: string;
  image_max_tokens: number;
  image_temperature: number;
  image_prompt: string;
  video_enabled: boolean;
  video_model: string | null;
  video_provider: string | null;
  video_prompt: string;
  timeout_seconds: number;
  max_retries: number;
}

async function transcribeAudioWithGroq(
  audioUrl: string, 
  apiKey: string, 
  config: TranscriptionConfig
): Promise<string> {
  const audioResponse = await fetch(audioUrl);
  if (!audioResponse.ok) {
    throw new Error(`Failed to download audio: ${audioResponse.status}`);
  }
  const audioBlob = await audioResponse.blob();

  const formData = new FormData();
  formData.append("file", audioBlob, "audio.ogg");
  formData.append("model", config.audio_model);
  formData.append("language", config.audio_language);
  formData.append("response_format", "json");

  const response = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`
    },
    body: formData
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Groq transcription failed: ${error}`);
  }

  const result = await response.json();
  return result.text;
}

async function describeImageWithOpenRouter(
  imageUrl: string, 
  apiKey: string,
  config: TranscriptionConfig
): Promise<string> {
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: config.image_model,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: config.image_prompt
            },
            {
              type: "image_url",
              image_url: {
                url: imageUrl
              }
            }
          ]
        }
      ],
      max_tokens: config.image_max_tokens,
      temperature: Number(config.image_temperature) || 0.5
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenRouter vision failed: ${error}`);
  }

  const result = await response.json();
  return result.choices[0]?.message?.content || "[Imagem sem descrição]";
}

async function describeVideoWithOpenRouter(
  videoUrl: string, 
  apiKey: string,
  config: TranscriptionConfig
): Promise<string> {
  // Para vídeo, retornamos uma descrição genérica por enquanto
  // TODO: Implementar extração de frames e análise
  return "[Vídeo recebido - transcrição de vídeo não disponível]";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  let processedCount = 0;
  let errorCount = 0;

  console.log(`[ai-transcription-queue] ${FUNCTION_VERSION} Starting...`);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Buscar configuração global
    const { data: configData, error: configError } = await supabase
      .from("ai_transcription_config")
      .select("*")
      .eq("is_active", true)
      .single();

    // Merge config do banco com defaults
    const config: TranscriptionConfig = configData 
      ? { ...DEFAULT_CONFIG, ...configData }
      : DEFAULT_CONFIG;
    
    if (configError) {
      console.log(`[ai-transcription-queue] Using default config (error: ${configError.message})`);
    } else {
      console.log(`[ai-transcription-queue] Loaded config: audio=${config.audio_model}, image=${config.image_model}`);
    }

    // Buscar API keys
    const { data: secrets, error: secretsError } = await supabase
      .from("decrypted_secrets")
      .select("name, decrypted_secret")
      .in("name", ["GROQ_API_KEY", "OPENROUTER_API_KEY", "groq_api_key", "openrouter_api_key"]);

    if (secretsError) {
      console.error("[ai-transcription-queue] Error fetching secrets:", secretsError);
      throw new Error("Failed to fetch API keys");
    }

    const groqApiKey = secrets?.find((s) => s.name === "GROQ_API_KEY" || s.name === "groq_api_key")?.decrypted_secret;
    const openrouterApiKey = secrets?.find((s) => s.name === "OPENROUTER_API_KEY" || s.name === "openrouter_api_key")?.decrypted_secret;

    console.log(`[ai-transcription-queue] API Keys found: Groq=${!!groqApiKey}, OpenRouter=${!!openrouterApiKey}`);

    if (!groqApiKey && !openrouterApiKey) {
      return new Response(JSON.stringify({
        status: "skipped",
        reason: "No API keys configured",
        version: FUNCTION_VERSION
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Ler mensagens da fila
    const { data: queueMessages, error: readError } = await supabase.rpc("pgmq_read", {
      queue_name: "ai_transcription_queue",
      vt_seconds: config.timeout_seconds,
      qty: 5
    });

    if (readError) {
      console.error("[ai-transcription-queue] Error reading queue:", readError);
      throw readError;
    }

    if (!queueMessages || queueMessages.length === 0) {
      return new Response(JSON.stringify({
        status: "empty",
        message: "No messages in queue",
        version: FUNCTION_VERSION
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    console.log(`[ai-transcription-queue] Processing ${queueMessages.length} messages`);

    for (const queueMsg of queueMessages) {
      const job = queueMsg.message;
      const jobStartTime = Date.now();

      try {
        console.log(`[ai-transcription-queue] Processing ${job.content_type} message ${job.message_id}`);

        // Verificar se o tipo está habilitado na config
        const isAudio = job.content_type === "audio" || job.content_type === "ptt";
        const isImage = job.content_type === "image";
        const isVideo = job.content_type === "video";

        // Determinar tabela (messages padrão, ai_messages para AI Assistant)
        const tableName = job.table_name || "messages";

        if (isAudio && !config.audio_enabled) {
          console.log(`[ai-transcription-queue] Audio transcription disabled, skipping`);
          await supabase.from(tableName).update({ transcription_status: "disabled" }).eq("id", job.message_id);
          await supabase.rpc("pgmq_delete", { queue_name: "ai_transcription_queue", msg_id: queueMsg.msg_id });
          continue;
        }

        if (isImage && !config.image_enabled) {
          console.log(`[ai-transcription-queue] Image transcription disabled, skipping`);
          await supabase.from(tableName).update({ transcription_status: "disabled" }).eq("id", job.message_id);
          await supabase.rpc("pgmq_delete", { queue_name: "ai_transcription_queue", msg_id: queueMsg.msg_id });
          continue;
        }

        if (isVideo && !config.video_enabled) {
          console.log(`[ai-transcription-queue] Video transcription disabled, skipping`);
          await supabase.from(tableName).update({ transcription_status: "disabled" }).eq("id", job.message_id);
          await supabase.rpc("pgmq_delete", { queue_name: "ai_transcription_queue", msg_id: queueMsg.msg_id });
          continue;
        }

        // Atualizar status para processing
        await supabase
          .from(tableName)
          .update({ transcription_status: "processing" })
          .eq("id", job.message_id);

        let transcription: string;
        let provider: string;
        let model: string;

        // Áudio (inclui 'ptt' = push-to-talk do WhatsApp)
        if (isAudio && groqApiKey) {
          transcription = await transcribeAudioWithGroq(job.media_url, groqApiKey, config);
          provider = config.audio_provider;
          model = config.audio_model;
        } else if (isAudio && !groqApiKey) {
          throw new Error("GROQ_API_KEY necessário para transcrição de áudio");
        
        // Imagem
        } else if (isImage && openrouterApiKey) {
          transcription = await describeImageWithOpenRouter(job.media_url, openrouterApiKey, config);
          provider = config.image_provider;
          model = config.image_model;
        
        // Vídeo
        } else if (isVideo && openrouterApiKey) {
          transcription = await describeVideoWithOpenRouter(job.media_url, openrouterApiKey, config);
          provider = config.video_provider || "system";
          model = config.video_model || "placeholder";
        
        } else {
          throw new Error(`No API key for content type: ${job.content_type}`);
        }

        const duration = Date.now() - jobStartTime;

        // Buscar conversation_id da mensagem (se não veio no job)
        let conversationId = job.conversation_id;
        if (!conversationId) {
          const { data: msgData } = await supabase
            .from(tableName)
            .select("conversation_id")
            .eq("id", job.message_id)
            .single();
          conversationId = msgData?.conversation_id;
        }

        // Atualizar mensagem com transcrição
        // Para ai_messages, não temos transcription_provider e transcribed_at
        const updateData: Record<string, any> = {
          transcription: transcription,
          transcription_status: "completed"
        };

        // Adicionar campos extras apenas para tabela messages (WhatsApp)
        if (tableName === "messages") {
          updateData.transcription_provider = provider;
          updateData.transcribed_at = new Date().toISOString();
        }

        await supabase
          .from(tableName)
          .update(updateData)
          .eq("id", job.message_id);

        // Logar transcrição bem-sucedida
        if (conversationId) {
          await supabase.rpc("log_transcription", {
            p_message_id: job.message_id,
            p_conversation_id: conversationId,
            p_content_type: job.content_type,
            p_status: "success",
            p_status_message: isAudio
              ? `🎤 Áudio transcrito (${transcription.length} chars)` 
              : isImage
                ? `🖼️ Imagem analisada`
                : `📹 Vídeo processado`,
            p_provider: provider,
            p_model: model,
            p_transcription_preview: transcription,
            p_duration_ms: duration
          });
        }

        // Deletar da fila
        await supabase.rpc("pgmq_delete", {
          queue_name: "ai_transcription_queue",
          msg_id: queueMsg.msg_id
        });

        console.log(`[ai-transcription-queue] ✅ Completed ${job.message_id} (${job.content_type}) in ${duration}ms using ${model}`);
        processedCount++;

      } catch (jobError: any) {
        console.error(`[ai-transcription-queue] ❌ Error processing ${job.message_id}:`, jobError);

        const duration = Date.now() - jobStartTime;

        // Buscar conversation_id se não temos
        // Nota: tableName pode não estar definido aqui se o erro ocorreu antes
        const errorTableName = job.table_name || "messages";
        let conversationId = job.conversation_id;
        if (!conversationId) {
          const { data: msgData } = await supabase
            .from(errorTableName)
            .select("conversation_id")
            .eq("id", job.message_id)
            .single();
          conversationId = msgData?.conversation_id;
        }

        // Marcar como falha
        await supabase
          .from(errorTableName)
          .update({
            transcription_status: "failed",
            transcription: `[Erro: ${jobError.message}]`
          })
          .eq("id", job.message_id);

        // Logar erro de transcrição
        if (conversationId) {
          await supabase.rpc("log_transcription", {
            p_message_id: job.message_id,
            p_conversation_id: conversationId,
            p_content_type: job.content_type,
            p_status: "error",
            p_status_message: `❌ Falha na transcrição de ${job.content_type}`,
            p_duration_ms: duration,
            p_error_message: jobError.message
          });
        }

        // Arquivar mensagem com erro
        await supabase.rpc("pgmq_archive", {
          p_queue_name: "ai_transcription_queue",
          p_msg_id: queueMsg.msg_id
        });

        errorCount++;
      }
    }

    const duration = Date.now() - startTime;
    console.log(`[ai-transcription-queue] ${FUNCTION_VERSION} Completed: ${processedCount} success, ${errorCount} errors in ${duration}ms`);

    return new Response(JSON.stringify({
      status: "success",
      processed: processedCount,
      errors: errorCount,
      duration_ms: duration,
      version: FUNCTION_VERSION,
      config_used: {
        audio_model: config.audio_model,
        image_model: config.image_model
      }
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error: any) {
    console.error("[ai-transcription-queue] Fatal error:", error);
    return new Response(JSON.stringify({
      status: "error",
      message: error.message,
      version: FUNCTION_VERSION
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
