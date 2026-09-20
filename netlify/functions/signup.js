const { signupRequestsStore } = require("./lib/blobs");
const { genId } = require("./lib/crypto");
const { sendTelegramMessage } = require("./lib/telegram");
const { adminSettingsStore } = require("./lib/blobs");

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
  const pseudo = (data.pseudo || "").trim();
  const bookmakerId = (data.bookmakerId || "").trim();
  const phone = (data.phone || "").trim();
  const telegramUsername = (data.telegramUsername || "").trim();
  if (!pseudo || !bookmakerId) return resp(400, { error: "missing_fields" });

  try {
    const id = genId();
    const record = {
      pseudo,
      bookmakerId,
      bookmakerIdLower: bookmakerId.toLowerCase(),
      phone: phone || null,
      telegramUsername: telegramUsername || null,
      status: "en_attente",
      requestedAt: Date.now(),
    };
    await signupRequestsStore().setJSON(id, record);

    // Notification admin (best-effort, ne bloque jamais l'inscription si Telegram échoue)
    try {
      const settings = (await adminSettingsStore().get("main", { type: "json" })) || {};
      if (settings.telegramAdminChatId) {
        const lines = [
          "🆕 <b>Nouvelle inscription</b>",
          "Nom : " + pseudo,
          "Identifiant : " + bookmakerId,
          phone ? "Téléphone : " + phone : null,
          telegramUsername ? "Telegram : @" + telegramUsername.replace(/^@/, "") : null,
        ].filter(Boolean);
        await sendTelegramMessage(settings.telegramAdminChatId, lines.join("\n"));
      }
    } catch (e) {
      /* non bloquant */
    }

    return resp(200, { ok: true });
  } catch (e) {
    return resp(500, { error: "server_error", detail: String(e.message || e) });
  }
};
