const { accountsStore, accountsIndexStore, indexKey } = require("./lib/blobs");
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
  const bookmakerId = (data.bookmakerId || "").trim();
  const code = (data.code || "").trim().toUpperCase();
  if (!bookmakerId || !code) return resp(400, { error: "missing_fields" });

  try {
    const key = indexKey(bookmakerId.toLowerCase());
    const accountId = await accountsIndexStore().get(key, { type: "text" });
    if (!accountId) return resp(401, { error: "invalid_credentials" });

    const account = await accountsStore().get(accountId, { type: "json" });
    if (!account) return resp(401, { error: "invalid_credentials" });

    const codeHash = await sha256(code);
    if (account.codeHash !== codeHash) return resp(401, { error: "invalid_credentials" });

    if (account.status === "desactive") return resp(403, { error: "disabled" });
    if (account.expiresAt && account.expiresAt < Date.now()) return resp(403, { error: "expired" });

    account.lastLogin = Date.now();
    await accountsStore().setJSON(accountId, account);

    const token = signToken({ accountId }, 60 * 60 * 24 * 7); // 7 jours
    return resp(200, { token, pseudo: account.pseudo, bookmakerId: account.bookmakerId, expiresAt: account.expiresAt });
  } catch (e) {
    return resp(500, { error: "server_error", detail: String(e.message || e) });
  }
};
