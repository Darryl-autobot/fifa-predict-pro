const { verifyToken, bearerFrom } = require("./lib/crypto");
const { getTelegramUpdates } = require("./lib/telegram");

function resp(code, body) {
  return { statusCode: code, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
}

exports.handler = async (event) => {
  if (event.httpMethod !== "GET") return resp(405, { error: "method_not_allowed" });
  const auth = verifyToken(bearerFrom(event));
  if (!auth || !auth.admin) return resp(401, { error: "unauthorized" });

  try {
    const updates = await getTelegramUpdates();
    // On ne garde qu'un message par chat_id (le plus récent)
    const seen = new Map();
    for (const u of updates) {
      if (!seen.has(u.chatId)) seen.set(u.chatId, u);
    }
    return resp(200, { contacts: Array.from(seen.values()) });
  } catch (e) {
    return resp(500, { error: "server_error", detail: String(e.message || e) });
  }
};
