const { adminSettingsStore } = require("./lib/blobs");
const { getOrBootstrapSettings } = require("./lib/adminSettings");
const { verifyToken, bearerFrom } = require("./lib/crypto");

function resp(code, body) {
  return { statusCode: code, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
}

exports.handler = async (event) => {
  try {
    if (event.httpMethod === "GET") {
      const settings = await getOrBootstrapSettings();
      return resp(200, {
        telegramContact: settings.telegramContact,
        telegramBotUsername: settings.telegramBotUsername,
      });
    }
    if (event.httpMethod === "POST") {
      const auth = verifyToken(bearerFrom(event));
      if (!auth || !auth.admin) return resp(401, { error: "unauthorized" });
      const data = JSON.parse(event.body || "{}");
      const settings = await getOrBootstrapSettings();
      if (data.telegramContact !== undefined) settings.telegramContact = (data.telegramContact || "").trim();
      if (data.telegramAdminChatId !== undefined) settings.telegramAdminChatId = (data.telegramAdminChatId || "").trim() || null;
      if (data.telegramBotUsername !== undefined) settings.telegramBotUsername = (data.telegramBotUsername || "").trim() || null;
      settings.updatedAt = Date.now();
      await adminSettingsStore().setJSON("main", settings);
      return resp(200, { ok: true });
    }
    return resp(405, { error: "method_not_allowed" });
  } catch (e) {
    return resp(500, { error: "server_error", detail: String(e.message || e) });
  }
};
