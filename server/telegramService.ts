import { storage } from "./storage";
import { db } from "./db";
import { sql } from "drizzle-orm";

const TELEGRAM_API = "https://api.telegram.org/bot";

interface TelegramSendResult {
  success: boolean;
  message: string;
  messageId?: number;
}

interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    from: { id: number; first_name: string; last_name?: string; username?: string };
    chat: { id: number; type: string };
    date: number;
    text?: string;
    document?: { file_id: string; file_name: string };
    photo?: Array<{ file_id: string; width: number; height: number }>;
  };
  callback_query?: {
    id: string;
    from: { id: number; first_name: string };
    data: string;
  };
}

export async function getTelegramConfig(userId: number): Promise<{
  botToken: string;
  chatId: string | null;
  webhookSecret: string;
} | null> {
  try {
    const result = await db.execute(sql`
      SELECT bot_token, default_chat_id, webhook_secret
      FROM telegram_configs
      WHERE user_id = ${userId} AND is_active = true
      LIMIT 1
    `);
    const rows = result.rows as any[];
    if (rows.length === 0) return null;
    return {
      botToken: rows[0].bot_token,
      chatId: rows[0].default_chat_id,
      webhookSecret: rows[0].webhook_secret,
    };
  } catch {
    return null;
  }
}

export async function sendTelegramMessage(
  botToken: string,
  chatId: string | number,
  text: string,
  options?: { parseMode?: "HTML" | "Markdown" | "MarkdownV2"; replyMarkup?: any },
): Promise<TelegramSendResult> {
  try {
    const response = await fetch(`${TELEGRAM_API}${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: options?.parseMode || "HTML",
        ...(options?.replyMarkup ? { reply_markup: options.replyMarkup } : {}),
      }),
    });

    const data = await response.json() as any;
    if (!data.ok) {
      console.error("[Telegram] Send failed:", data.description);
      return { success: false, message: data.description || "Telegram API error" };
    }

    return {
      success: true,
      message: `Message sent to chat ${chatId}`,
      messageId: data.result?.message_id,
    };
  } catch (error: any) {
    console.error("[Telegram] Network error:", error.message);
    return { success: false, message: `Telegram error: ${error.message}` };
  }
}

export async function setTelegramWebhook(
  botToken: string,
  webhookUrl: string,
  secretToken: string,
): Promise<boolean> {
  try {
    const response = await fetch(`${TELEGRAM_API}${botToken}/setWebhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: webhookUrl,
        secret_token: secretToken,
        allowed_updates: ["message", "callback_query"],
        max_connections: 40,
      }),
    });

    const data = await response.json() as any;
    if (!data.ok) {
      console.error("[Telegram] Webhook setup failed:", data.description);
      return false;
    }

    console.log("[Telegram] Webhook set:", webhookUrl);
    return true;
  } catch (error: any) {
    console.error("[Telegram] Webhook setup error:", error.message);
    return false;
  }
}

export async function removeTelegramWebhook(botToken: string): Promise<boolean> {
  try {
    const response = await fetch(`${TELEGRAM_API}${botToken}/deleteWebhook`, {
      method: "POST",
    });
    const data = await response.json() as any;
    return data.ok === true;
  } catch {
    return false;
  }
}

export async function processIncomingTelegramUpdate(
  update: TelegramUpdate,
  userId: number,
  botToken: string,
): Promise<void> {
  const msg = update.message;
  if (!msg || !msg.text) return;

  const chatId = msg.chat.id;
  const userText = msg.text;
  const senderName = [msg.from.first_name, msg.from.last_name].filter(Boolean).join(" ");

  console.log(`[Telegram] Message from ${senderName} (${chatId}): ${userText.slice(0, 100)}`);

  try {
    await db.execute(sql`
      INSERT INTO telegram_messages (user_id, chat_id, sender_name, sender_id, direction, content, telegram_message_id)
      VALUES (${userId}, ${chatId.toString()}, ${senderName}, ${msg.from.id.toString()}, 'inbound', ${userText}, ${msg.message_id})
    `);
  } catch (e: any) {
    console.error("[Telegram] Failed to save message:", e.message);
  }

  let agentType = "customer-support";
  const agentRouting: Record<string, string[]> = {
    "sales-sdr": ["satış", "fiyat", "teklif", "lead", "müşteri", "price", "offer", "deal"],
    "bookkeeping": ["fatura", "muhasebe", "kdv", "vergi", "ödeme", "invoice", "tax", "payment"],
    "scheduling": ["randevu", "toplantı", "takvim", "appointment", "meeting", "schedule"],
    "hr-recruiting": ["cv", "ilan", "başvuru", "mülakat", "resume", "job", "interview"],
    "data-analyst": ["analiz", "rapor", "grafik", "data", "analysis", "chart", "report"],
    "ecommerce-ops": ["ürün", "sipariş", "stok", "kargo", "product", "order", "stock", "shipping"],
    "real-estate": ["emlak", "kira", "ev", "daire", "property", "rent", "apartment"],
    "social-media": ["sosyal", "post", "içerik", "instagram", "social", "content"],
  };

  const lowerText = userText.toLowerCase();
  for (const [agent, keywords] of Object.entries(agentRouting)) {
    if (keywords.some(kw => lowerText.includes(kw))) {
      agentType = agent;
      break;
    }
  }

  if (userText === "/start") {
    await sendTelegramMessage(botToken, chatId,
      "Merhaba! RentAI24 asistanınıza hoş geldiniz.\n\n" +
      "Bana herhangi bir soru sorabilirsiniz. Mesajınızı otomatik olarak doğru AI ajanına yönlendireceğim.\n\n" +
      "<b>Ajanlarımız:</b>\n" +
      "- Ava (Müşteri Destek)\n" +
      "- Rex (Satış & CRM)\n" +
      "- Maya (Sosyal Medya)\n" +
      "- Finn (Muhasebe)\n" +
      "- Cal (Takvim)\n" +
      "- Harper (İK)\n" +
      "- DataBot (Veri Analizi)\n" +
      "- ShopBot (E-Ticaret)\n" +
      "- Reno (Emlak)\n\n" +
      "Mesajınızı yazın, size yardımcı olalım!",
    );
    return;
  }

  if (userText === "/help") {
    await sendTelegramMessage(botToken, chatId,
      "<b>Komutlar:</b>\n" +
      "/start - Hoş geldiniz mesajı\n" +
      "/help - Yardım\n" +
      "/agents - Aktif ajanları listele\n" +
      "/status - Sistem durumu\n\n" +
      "Doğrudan mesaj yazarak istediğiniz ajandan yardım alabilirsiniz.",
    );
    return;
  }

  if (userText === "/agents") {
    await sendTelegramMessage(botToken, chatId,
      "<b>Mevcut AI Ajanlar:</b>\n\n" +
      "🎧 <b>Ava</b> - Müşteri Destek\n" +
      "💼 <b>Rex</b> - Satış & CRM\n" +
      "📱 <b>Maya</b> - Sosyal Medya\n" +
      "📊 <b>Finn</b> - Muhasebe & Finans\n" +
      "📅 <b>Cal</b> - Takvim & Randevu\n" +
      "👥 <b>Harper</b> - İK & İşe Alım\n" +
      "📈 <b>DataBot</b> - Veri Analizi\n" +
      "🛒 <b>ShopBot</b> - E-Ticaret\n" +
      "🏠 <b>Reno</b> - Emlak",
    );
    return;
  }

  try {
    await sendTelegramMessage(botToken, chatId, `⏳ ${getAgentEmoji(agentType)} mesajınız işleniyor...`);
  } catch {}

  try {
    const { createBossNotification } = await import("./bossNotificationService");
    const summary = `📨 Telegram mesajı (${senderName}): ${userText.slice(0, 150)}`;
    await createBossNotification(userId, summary, "task_completed");
  } catch {}
}

function getAgentEmoji(agentType: string): string {
  const emojis: Record<string, string> = {
    "customer-support": "🎧 Ava",
    "sales-sdr": "💼 Rex",
    "social-media": "📱 Maya",
    "bookkeeping": "📊 Finn",
    "scheduling": "📅 Cal",
    "hr-recruiting": "👥 Harper",
    "data-analyst": "📈 DataBot",
    "ecommerce-ops": "🛒 ShopBot",
    "real-estate": "🏠 Reno",
  };
  return emojis[agentType] || "🤖 AI";
}

export async function getTelegramStatus(userId: number): Promise<{
  connected: boolean;
  botUsername: string | null;
}> {
  const config = await getTelegramConfig(userId);
  if (!config) return { connected: false, botUsername: null };

  try {
    const response = await fetch(`${TELEGRAM_API}${config.botToken}/getMe`);
    const data = await response.json() as any;
    return {
      connected: data.ok === true,
      botUsername: data.result?.username || null,
    };
  } catch {
    return { connected: false, botUsername: null };
  }
}
