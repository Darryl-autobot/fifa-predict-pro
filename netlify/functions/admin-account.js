const { accountsStore, accountsIndexStore, indexKey } = require("./lib/blobs");
const { verifyToken, bearerFrom, sha256, genAccessCode } = require("./lib/crypto");
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
  const id = data.id;
  const action = data.action;
  if (!id || !action) return resp(400, { error: "missing_fields" });

  try {
    const store = accountsStore();
    const account = await store.get(id, { type: "json" });
    if (!account) return resp(404, { error: "not_found" });

    if (action === "disable") {
      account.status = "desactive";
      await store.setJSON(id, account);
    } else if (action === "enable") {
      account.status = "actif";
      await store.setJSON(id, account);
    } else if (action === "delete") {
      await accountsIndexStore().delete(indexKey(account.bookmakerIdLower));
      await store.delete(id);
    } else if (action === "renew") {
      const days = Math.max(1, parseInt(data.days, 10) || 7);
      const base = Math.max(Date.now(), account.expiresAt || 0);
      account.expiresAt = base + days * 24 * 60 * 60 * 1000;
      account.status = "actif";
      await store.setJSON(id, account);
    } else if (action === "regen") {
      const code = genAccessCode();
      account.codeHash = sha256(code);
      account.codeCreatedAt = Date.now();
      await store.setJSON(id, account);
      let telegramSent = false;
      if (account.telegramChatId) {
        const msg =
          "⚽ <b>FIFA Predict Pro</b>\nNouveau code d'accès pour " +
          account.bookmakerId +
          " : <code>" +
          code +
          "</code>";
        const r = await sendTelegramMessage(account.telegramChatId, msg);
        telegramSent = !!(r && r.ok);
      }
      return resp(200, { ok: true, code, telegramSent });
    } else if (action === "edit") {
      if (data.pseudo) account.pseudo = data.pseudo;
      if (data.telegramChatId !== undefined) account.telegramChatId = data.telegramChatId || null;
      if (data.bookmakerId && data.bookmakerId !== account.bookmakerId) {
        await accountsIndexStore().delete(indexKey(account.bookmakerIdLower));
        account.bookmakerId = data.bookmakerId;
        account.bookmakerIdLower = data.bookmakerId.toLowerCase();
        await accountsIndexStore().set(indexKey(account.bookmakerIdLower), id);
      }
      await store.setJSON(id, account);
    } else {
      return resp(400, { error: "unknown_action" });
    }
    return resp(200, { ok: true });
  } catch (e) {
    return resp(500, { error: "server_error", detail: String(e.message || e) });
  }
};
