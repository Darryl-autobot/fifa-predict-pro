const { getOrBootstrapSettings } = require("./lib/adminSettings");
const { verifyToken, bearerFrom } = require("./lib/crypto");

function resp(code, body) {
  return { statusCode: code, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
}

exports.handler = async (event) => {
  if (event.httpMethod !== "GET") return resp(405, { error: "method_not_allowed" });
  const auth = verifyToken(bearerFrom(event));
  if (!auth || !auth.admin) return resp(401, { error: "unauthorized" });
  try {
    const settings = await getOrBootstrapSettings();
    return resp(200, {
      telegramContact: settings.telegramContact,
      telegramAdminChatId: settings.telegramAdminChatId,
      telegramBotUsername: settings.telegramBotUsername,
      updatedAt: settings.updatedAt,
    });
  } catch (e) {
    return resp(500, { error: "server_error", detail: String(e.message || e) });
  }
};
