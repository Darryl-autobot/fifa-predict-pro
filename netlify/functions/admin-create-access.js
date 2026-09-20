const { accountsStore, accountsIndexStore, signupRequestsStore, indexKey } = require("./lib/blobs");
const { verifyToken, bearerFrom, sha256, genAccessCode, genId } = require("./lib/crypto");
const { sendTelegramMessage } = require("./lib/telegram");

function resp(code, body) {
  return { statusCode: code, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return resp(405, { error: "method_not_allowed" });
  const auth = verifyToken(bearerFrom(event));
  if (!auth || !auth.admin) return resp(401, { error: "unauthorized" });

  let data;
  try {
    data = JSON.parse(event.body || "{}");
  } catch (e) {
    return resp(400, { error: "invalid_json" });
  }
  const pseudo = (data.pseudo || "").trim();
  const bookmakerId = (data.bookmakerId || "").trim();
  const days = Math.max(1, parseInt(data.days, 10) || 7);
  const requestId = data.requestId || null;
  const telegramChatId = data.telegramChatId ? String(data.telegramChatId).trim() : null;
  if (!pseudo || !bookmakerId) return resp(400, { error: "missing_fields" });

  try {
    const code = genAccessCode();
    const now = Date.now();
    const accountId = genId();
    const account = {
      pseudo,
      bookmakerId,
      bookmakerIdLower: bookmakerId.toLowerCase(),
      codeHash: sha256(code),
      status: "actif",
      registeredAt: now,
      codeCreatedAt: now,
      expiresAt: now + days * 24 * 60 * 60 * 1000,
      telegramChatId: telegramChatId || null,
      lastLogin: null,
    };

    await accountsStore().setJSON(accountId, account);
    await accountsIndexStore().set(indexKey(account.bookmakerIdLower), accountId);

    if (requestId) {
      try {
        const req = await signupRequestsStore().get(requestId, { type: "json" });
        if (req) {
          req.status = "traite";
          await signupRequestsStore().setJSON(requestId, req);
        }
      } catch (e) {
        /* non bloquant */
      }
    }

    let telegramSent = false;
    if (telegramChatId) {
      const msg =
        "⚽ <b>FIFA Predict Pro</b>\nVotre accès a été créé.\n\nIdentifiant : " +
        bookmakerId +
        "\nCode d'accès : <code>" +
        code +
        "</code>\nValable jusqu'au " +
        new Date(account.expiresAt).toLocaleDateString("fr-FR") +
        ".";
      const r = await sendTelegramMessage(telegramChatId, msg);
      telegramSent = !!(r && r.ok);
    }

    return resp(200, { account: Object.assign({ id: accountId }, account), code, telegramSent });
  } catch (e) {
    return resp(500, { error: "server_error", detail: String(e.message || e) });
  }
};
