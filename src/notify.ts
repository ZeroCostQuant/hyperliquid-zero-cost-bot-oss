import type { Env } from "./types.ts";

export async function sendTelegramLog(
  env: Env,
  text: string
): Promise<{ sent: boolean; reason?: string }> {
  const token = env.TELEGRAM_BOT_TOKEN?.trim();
  const chatId = env.TELEGRAM_CHANNEL_ID?.trim();
  if (!token || !chatId) {
    return { sent: false, reason: "TELEGRAM_NOT_CONFIGURED" };
  }
  const safeText = text.length > 3950 ? `${text.slice(0, 3930)}\n...(truncated)` : text;
  const resp = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: safeText,
      disable_web_page_preview: true,
    }),
  });
  if (!resp.ok) {
    const body = await resp.text().catch(() => "");
    return { sent: false, reason: `TELEGRAM_HTTP_${resp.status}: ${body.slice(0, 120)}` };
  }
  return { sent: true };
}
