// Aucune dépendance npm : utilise fetch natif (Node 18+) vers l'API HTTP de Telegram.

function botToken() {
  return process.env.TELEGRAM_BOT_TOKEN || null;
}

async function sendTelegramMessage(chatId, text) {
  const token = botToken();
  if (!token || !chatId) return { skipped: true };
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
    });
    return await res.json();
  } catch (e) {
    return { error: String(e.message || e) };
  }
}

// Récupère les derniers messages reçus par le bot (utilisé pour repérer les
// personnes ayant tapé /start, afin d'associer leur chat_id à un compte).
async function getTelegramUpdates() {
  const token = botToken();
  if (!token) return [];
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/getUpdates?limit=50`);
    const data = await res.json();
    if (!data.ok) return [];
    return (data.result || [])
      .filter((u) => u.message && u.message.chat)
      .map((u) => ({
        chatId: u.message.chat.id,
        username: u.message.chat.username || null,
        firstName: u.message.chat.first_name || null,
        text: u.message.text || "",
        date: (u.message.date || 0) * 1000,
      }))
      .sort((a, b) => b.date - a.date);
  } catch (e) {
    return [];
  }
}

module.exports = { sendTelegramMessage, getTelegramUpdates, botConfigured: () => !!botToken() };
