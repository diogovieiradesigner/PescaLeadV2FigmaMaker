import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// send-notification v9 - With Web Push Support (fixed column names)
const FUNCTION_VERSION = "v9-push";

// SMTP CONFIG - cPanel
const SMTP_CONFIG = {
  host: "taurus.enduranceserver.com.br",
  port: 465,
  user: "contato@pescalead.com.br",
  password: "@?Ng-4Nj.RHbYbuY",
  from: "Pesca Lead <contato@pescalead.com.br>"
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization"
};

// ==================== WEB PUSH SENDER ====================
async function sendWebPush(
  supabase: any,
  userId: string,
  title: string,
  body: string,
  metadata: any
): Promise<{ success: boolean; sent: number; failed: number; error?: string }> {
  console.log("[Push] Starting Web Push send...");
  
  try {
    // Get VAPID keys from environment
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");
    const vapidSubject = Deno.env.get("VAPID_SUBJECT") || "mailto:contato@pescalead.com.br";
    
    if (!vapidPublicKey || !vapidPrivateKey) {
      console.log("[Push] VAPID keys not configured");
      return { success: false, sent: 0, failed: 0, error: "VAPID keys not configured. Set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY env vars" };
    }
    
    console.log("[Push] VAPID keys found, fetching subscriptions...");
    
    // Get user's push subscriptions (using correct column names: p256dh_key, auth_key)
    const { data: subscriptions, error: subError } = await supabase
      .from("push_subscriptions")
      .select("id, endpoint, p256dh_key, auth_key")
      .eq("user_id", userId)
      .eq("is_active", true);
    
    if (subError) {
      console.error("[Push] Error fetching subscriptions:", subError);
      return { success: false, sent: 0, failed: 0, error: subError.message };
    }
    
    if (!subscriptions || subscriptions.length === 0) {
      console.log("[Push] No active subscriptions for user");
      return { success: false, sent: 0, failed: 0, error: "No push subscriptions" };
    }
    
    console.log(`[Push] Found ${subscriptions.length} subscription(s)`);
    
    // Import web-push library
    const webpush = await import("npm:web-push@3.6.7");
    
    webpush.setVapidDetails(
      vapidSubject,
      vapidPublicKey,
      vapidPrivateKey
    );
    
    // Build push payload
    const payload = JSON.stringify({
      title,
      body,
      icon: "/icon-192.png",
      badge: "/badge-72.png",
      tag: metadata?.reference_type || "notification",
      requireInteraction: metadata?.priority === "high",
      data: {
        url: metadata?.reference_type === "conversation" 
          ? `/conversations/${metadata.reference_id}`
          : "/",
        notification_id: metadata?.notification_id,
        reference_type: metadata?.reference_type,
        reference_id: metadata?.reference_id
      }
    });
    
    let sent = 0;
    let failed = 0;
    const expiredSubscriptions: string[] = [];
    
    // Send to all subscriptions
    for (const sub of subscriptions) {
      try {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh_key,  // Use correct column name
            auth: sub.auth_key       // Use correct column name
          }
        };
        
        await webpush.sendNotification(pushSubscription, payload, {
          TTL: 86400, // 24 hours
          urgency: metadata?.priority === "high" ? "high" : "normal"
        });
        
        sent++;
        console.log(`[Push] ✅ Sent to endpoint: ${sub.endpoint.substring(0, 50)}...`);
        
        // Update last_used_at
        await supabase
          .from("push_subscriptions")
          .update({ last_used_at: new Date().toISOString() })
          .eq("id", sub.id);
        
      } catch (pushError: any) {
        failed++;
        console.error(`[Push] ❌ Failed for ${sub.id}:`, pushError.message);
        
        // Check if subscription expired (410 Gone or 404 Not Found)
        if (pushError.statusCode === 410 || pushError.statusCode === 404) {
          expiredSubscriptions.push(sub.id);
          console.log(`[Push] Marking subscription ${sub.id} as expired`);
        }
      }
    }
    
    // Clean up expired subscriptions
    if (expiredSubscriptions.length > 0) {
      console.log(`[Push] Removing ${expiredSubscriptions.length} expired subscription(s)`);
      await supabase
        .from("push_subscriptions")
        .update({ is_active: false })
        .in("id", expiredSubscriptions);
    }
    
    const success = sent > 0;
    console.log(`[Push] Complete: ${sent} sent, ${failed} failed`);
    
    return { success, sent, failed };
    
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("[Push] Exception:", errorMsg);
    return { success: false, sent: 0, failed: 0, error: errorMsg };
  }
}

// ==================== EMAIL SENDER ====================
async function sendEmailViaSMTP(
  to: string,
  subject: string,
  body: string,
  metadata: any
): Promise<{ success: boolean; error?: string; details?: string }> {
  console.log("[Email] Starting SMTP send attempt...");
  console.log(`[Email] To: ${to}, Subject: ${subject}`);
  
  try {
    console.log("[Email] Importing SMTPClient...");
    const { SMTPClient } = await import("npm:emailjs@4.0.3");
    console.log("[Email] SMTPClient imported successfully");
    
    let actionUrl = "https://app.pescalead.com.br";
    let actionText = "Abrir Pesca Lead";
    
    if (metadata?.reference_type === "conversation") {
      actionUrl = `https://app.pescalead.com.br/conversations/${metadata.reference_id}`;
      actionText = "Ver Conversa";
    }

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">🐟 Pesca Lead</h1>
        </div>
        <div style="padding: 30px; background: #f9fafb;">
          <h2 style="color: #1f2937; margin-top: 0;">${subject}</h2>
          <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">${body}</p>
          ${metadata?.contact_name ? `<p style="color: #6b7280;"><strong>Cliente:</strong> ${metadata.contact_name}</p>` : ''}
          ${metadata?.contact_phone ? `<p style="color: #6b7280;"><strong>Telefone:</strong> ${metadata.contact_phone}</p>` : ''}
          <div style="margin-top: 30px; text-align: center;">
            <a href="${actionUrl}" style="background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">${actionText}</a>
          </div>
        </div>
      </div>
    `;

    console.log("[Email] Creating SMTP client...");
    
    const client = new SMTPClient({
      user: SMTP_CONFIG.user,
      password: SMTP_CONFIG.password,
      host: SMTP_CONFIG.host,
      port: SMTP_CONFIG.port,
      ssl: true,
      timeout: 10000
    });
    
    console.log("[Email] SMTP client created, sending...");

    const message = await client.sendAsync({
      from: SMTP_CONFIG.from,
      to: to,
      subject: subject,
      attachment: [
        { data: htmlContent, alternative: true }
      ]
    });

    console.log("[Email] ✅ Sent successfully!", message);
    return { success: true, details: "Email sent via SMTP" };
    
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : "No stack";
    console.error("[Email] ❌ SMTP Error:", errorMsg);
    return { 
      success: false, 
      error: errorMsg,
      details: `Stack: ${errorStack?.substring(0, 200)}`
    };
  }
}

// ==================== WHATSAPP SENDER ====================
async function sendWhatsAppViaInstance(
  supabase: any,
  workspaceId: string,
  phone: string,
  message: string,
  userId: string, // Added: to create internal conversation
  notificationTitle: string // Added: for conversation context
): Promise<{ success: boolean; error?: string; conversationId?: string }> {
  try {
    console.log(`[WhatsApp] Looking for instance in workspace: ${workspaceId}`);
    
    const { data: instance, error: instError } = await supabase
      .from("instances")
      .select("id, name, status, provider_type, api_key")
      .eq("workspace_id", workspaceId)
      .eq("status", "connected")
      .limit(1)
      .single();

    if (instError || !instance) {
      console.error("[WhatsApp] No connected instance:", instError?.message);
      return { success: false, error: "No connected WhatsApp instance" };
    }

    console.log(`[WhatsApp] Found instance: ${instance.name} (${instance.provider_type})`);

    const token = instance.api_key;
    if (!token) {
      return { success: false, error: "Instance has no API token" };
    }

    let cleanNumber = phone.replace(/\D/g, "");
    if (!cleanNumber.startsWith("55") && cleanNumber.length <= 11) {
      cleanNumber = "55" + cleanNumber;
    }

    console.log(`[WhatsApp] Sending to: ${cleanNumber}`);

    const providerType = instance.provider_type || "evolution";
    
    let sendSuccess = false;
    
    if (providerType === "uazapi") {
      const baseUrl = Deno.env.get("UAZAPI_API_URL")?.replace(/\/$/, "") || "https://free.uazapi.com";
      const response = await fetch(`${baseUrl}/send/text`, {
        method: "POST",
        headers: {
          "token": token,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          number: cleanNumber,
          text: message,
          delay: 1200
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("[WhatsApp] Uazapi error:", errorText);
        return { success: false, error: `Uazapi: ${errorText.substring(0, 100)}` };
      }
      
      const result = await response.json();
      console.log("[WhatsApp] ✅ Sent via Uazapi:", result?.id || "OK");
      sendSuccess = true;
    } else {
      const baseUrl = Deno.env.get("EVOLUTION_API_URL")?.replace(/\/$/, "");
      if (!baseUrl) {
        return { success: false, error: "EVOLUTION_API_URL not configured" };
      }

      const response = await fetch(`${baseUrl}/message/sendText/${encodeURIComponent(instance.name)}`, {
        method: "POST",
        headers: {
          "apikey": token,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          number: cleanNumber,
          text: message,
          delay: 1200
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        return { success: false, error: `Evolution: ${errorText.substring(0, 100)}` };
      }
      
      console.log("[WhatsApp] ✅ Sent via Evolution");
      sendSuccess = true;
    }

    // ==================== CREATE INTERNAL CONVERSATION ====================
    if (sendSuccess) {
      console.log("[WhatsApp] Creating internal conversation for tracking...");
      
      try {
        // 1. Get or create "Notificações Internas" inbox
        let inboxId: string | null = null;
        
        const { data: existingInbox } = await supabase
          .from("inboxes")
          .select("id")
          .eq("workspace_id", workspaceId)
          .eq("name", "Notificações Internas")
          .limit(1)
          .maybeSingle();
        
        if (existingInbox) {
          inboxId = existingInbox.id;
          console.log(`[WhatsApp] Using existing inbox: ${inboxId}`);
        } else {
          // Create inbox
          const { data: newInbox, error: inboxError } = await supabase
            .from("inboxes")
            .insert({
              workspace_id: workspaceId,
              name: "Notificações Internas",
              description: "Mensagens de notificação enviadas aos atendentes",
              channel: "whatsapp",
              is_active: true
            })
            .select("id")
            .single();
          
          if (inboxError) {
            console.error("[WhatsApp] Error creating inbox:", inboxError);
          } else {
            inboxId = newInbox?.id;
            console.log(`[WhatsApp] Created new inbox: ${inboxId}`);
          }
        }
        
        // 2. Get or create conversation with the attendant
        const { data: user } = await supabase
          .from("users")
          .select("name")
          .eq("id", userId)
          .single();
        
        const userName = user?.name || "Atendente";
        
        const { data: existingConv } = await supabase
          .from("conversations")
          .select("id")
          .eq("workspace_id", workspaceId)
          .eq("contact_phone", cleanNumber)
          .eq("channel", "whatsapp")
          .eq("inbox_id", inboxId)
          .limit(1)
          .maybeSingle();
        
        let conversationId: string | null = null;
        
        if (existingConv) {
          conversationId = existingConv.id;
          console.log(`[WhatsApp] Using existing conversation: ${conversationId}`);
          
          // Update conversation
          await supabase
            .from("conversations")
            .update({
              last_message: notificationTitle,
              last_message_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq("id", conversationId);
          
        } else {
          // Create new conversation
          const { data: newConv, error: convError } = await supabase
            .from("conversations")
            .insert({
              workspace_id: workspaceId,
              inbox_id: inboxId,
              contact_name: userName,
              contact_phone: cleanNumber,
              status: "resolved", // Notificações já são "resolvidas"
              channel: "whatsapp",
              attendant_type: "human",
              last_message: notificationTitle,
              last_message_at: new Date().toISOString(),
              unread_count: 0 // Atendente já viu (ele que recebeu)
            })
            .select("id")
            .single();
          
          if (convError) {
            console.error("[WhatsApp] Error creating conversation:", convError);
          } else {
            conversationId = newConv?.id;
            console.log(`[WhatsApp] Created new conversation: ${conversationId}`);
          }
        }
        
        // 3. Save message to database
        if (conversationId) {
          const { data: savedMessage, error: msgError } = await supabase
            .from("messages")
            .insert({
              conversation_id: conversationId,
              content_type: "text",
              message_type: "sent",
              text_content: message,
              is_read: true,
              created_at: new Date().toISOString()
            })
            .select("id")
            .single();
          
          if (msgError) {
            console.error("[WhatsApp] Error saving message:", msgError);
          } else {
            console.log(`[WhatsApp] ✅ Message saved to database: ${savedMessage?.id}`);
          }
          
          // Update conversation total_messages count
          await supabase.rpc("increment", {
            table_name: "conversations",
            row_id: conversationId,
            column_name: "total_messages",
            increment_by: 1
          }).catch(() => {
            // Fallback: just increment manually if RPC doesn't exist
            console.log("[WhatsApp] Using manual increment for total_messages");
          });
          
          return { success: true, conversationId };
        }
        
      } catch (internalError) {
        console.error("[WhatsApp] Error creating internal conversation:", internalError);
        // Don't fail the whole operation just because internal tracking failed
      }
    }
    
    return { success: sendSuccess };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("[WhatsApp] Exception:", errorMsg);
    return { success: false, error: errorMsg };
  }
}

// ==================== MAIN HANDLER ====================
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  console.log(`\n========== send-notification ${FUNCTION_VERSION} ==========`);
  
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Parse request
    let notificationId: string | null = null;
    try {
      const body = await req.json();
      notificationId = body.notification_id || null;
    } catch {
      // batch mode
    }

    console.log(`[Mode] ${notificationId ? 'Single: ' + notificationId : 'Batch processing'}`);

    // Fetch pending notifications
    let query = supabase
      .from("notifications")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(5);

    if (notificationId) {
      query = supabase.from("notifications").select("*").eq("id", notificationId);
    }

    const { data: notifications, error: fetchError } = await query;

    if (fetchError) {
      console.error("[Fetch] Error:", fetchError);
      throw new Error(`Fetch failed: ${fetchError.message}`);
    }

    if (!notifications || notifications.length === 0) {
      console.log("[Fetch] No pending notifications");
      return new Response(JSON.stringify({
        status: "success",
        message: "No pending notifications",
        version: FUNCTION_VERSION
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    console.log(`[Fetch] Found ${notifications.length} notification(s)`);

    const results = [];

    for (const notification of notifications) {
      console.log(`\n--- Processing: ${notification.id} ---`);
      console.log(`[Notif] Type: ${notification.type}, Title: ${notification.title}`);
      console.log(`[Notif] Channels: ${JSON.stringify(notification.channels_requested)}`);

      // Mark as sending
      await supabase.from("notifications").update({ status: "sending" }).eq("id", notification.id);

      // Get user
      const { data: user, error: userError } = await supabase
        .from("users")
        .select("id, name, email, phone")
        .eq("id", notification.user_id)
        .single();

      if (userError || !user) {
        console.error("[User] Not found:", notification.user_id);
        await supabase.from("notifications").update({ 
          status: "failed", 
          channels_failed: { all: "User not found" } 
        }).eq("id", notification.id);
        results.push({ id: notification.id, status: "failed", error: "User not found" });
        continue;
      }

      console.log(`[User] ${user.name} | Email: ${user.email} | Phone: ${user.phone}`);

      const channelsSent: Record<string, any> = {};
      const channelsFailed: Record<string, string> = {};
      const channels = notification.channels_requested || {};

      // PUSH NOTIFICATION
      if (channels.push) {
        console.log("[Channel] Attempting PUSH...");
        const pushResult = await sendWebPush(
          supabase,
          user.id,
          notification.title,
          notification.body,
          {
            ...notification.metadata,
            notification_id: notification.id,
            reference_type: notification.reference_type,
            reference_id: notification.reference_id,
            priority: notification.priority
          }
        );
        if (pushResult.success) {
          channelsSent.push = { sent: pushResult.sent, failed: pushResult.failed };
        } else {
          channelsFailed.push = pushResult.error || "No subscriptions";
        }
      }

      // EMAIL
      if (channels.email) {
        if (user.email) {
          console.log("[Channel] Attempting EMAIL...");
          const emailResult = await sendEmailViaSMTP(
            user.email,
            notification.title,
            notification.body,
            { ...notification.metadata, reference_type: notification.reference_type, reference_id: notification.reference_id }
          );
          if (emailResult.success) {
            channelsSent.email = true;
          } else {
            channelsFailed.email = emailResult.error || "Unknown";
          }
        } else {
          channelsFailed.email = "No email address";
        }
      }

      // WHATSAPP
      if (channels.whatsapp) {
        if (user.phone && notification.workspace_id) {
          console.log("[Channel] Attempting WHATSAPP...");
          const waMessage = `🐟 *Pesca Lead*\n\n*${notification.title}*\n\n${notification.body}`;
          const waResult = await sendWhatsAppViaInstance(
            supabase, 
            notification.workspace_id, 
            user.phone, 
            waMessage, 
            user.id, 
            notification.title
          );
          if (waResult.success) {
            channelsSent.whatsapp = { 
              sent: true, 
              conversation_id: waResult.conversationId || null 
            };
          } else {
            channelsFailed.whatsapp = waResult.error || "Unknown";
          }
        } else {
          channelsFailed.whatsapp = !user.phone ? "No phone" : "No workspace_id";
        }
      }

      // Determine final status
      const requestedCount = Object.values(channels).filter(Boolean).length;
      const sentCount = Object.keys(channelsSent).length;
      let status: string;
      if (sentCount === 0) {
        status = "failed";
      } else if (sentCount < requestedCount) {
        status = "partial";
      } else {
        status = "sent";
      }

      console.log(`[Result] Status: ${status}, Sent: ${JSON.stringify(channelsSent)}, Failed: ${JSON.stringify(channelsFailed)}`);

      // Update notification
      await supabase.from("notifications").update({
        status,
        channels_sent: Object.keys(channelsSent).length > 0 ? channelsSent : null,
        channels_failed: Object.keys(channelsFailed).length > 0 ? channelsFailed : null,
        sent_at: Object.keys(channelsSent).length > 0 ? new Date().toISOString() : null
      }).eq("id", notification.id);

      results.push({ id: notification.id, status, sent: channelsSent, failed: channelsFailed });
    }

    const duration = Date.now() - startTime;
    console.log(`\n========== Complete: ${duration}ms ==========`);

    return new Response(JSON.stringify({
      status: "success",
      version: FUNCTION_VERSION,
      processed: results.length,
      results,
      duration_ms: duration
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : "";
    console.error("[FATAL] Error:", errorMsg);
    
    return new Response(JSON.stringify({
      status: "error",
      version: FUNCTION_VERSION,
      message: errorMsg
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});