const { getOrBootstrapSettings } = require("./lib/adminSettings");
const { sha256, signToken } = require("./lib/crypto");

function resp(code, body) {
  return { statusCode: code, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return resp(405, { error: "method_not_allowed" });
  let data;
  try {
    data = JSON.parse(event.body || "{}");
  } catch (e) {
    return resp(400, { error: "invalid_json" });
  }
  const password = data.password || "";
  if (!password) return resp(400, { error: "missing_fields" });

  try {
    const settings = await getOrBootstrapSettings();
    if (sha256(password) !== settings.passwordHash) return resp(401, { error: "invalid_password" });
    const token = signToken({ admin: true }, 60 * 60 * 6); // 6 heures
    return resp(200, {
      token,
      telegramContact: settings.telegramContact,
      telegramBotUsername: settings.telegramBotUsername,
    });
  } catch (e) {
    return resp(500, { error: "server_error", detail: String(e.message || e) });
  }
};
