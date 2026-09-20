const { accountsStore } = require("./lib/blobs");
const { verifyToken, bearerFrom } = require("./lib/crypto");

function resp(code, body) {
  return { statusCode: code, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
}

exports.handler = async (event) => {
  if (event.httpMethod !== "GET") return resp(405, { error: "method_not_allowed" });
  const auth = verifyToken(bearerFrom(event));
  if (!auth || !auth.admin) return resp(401, { error: "unauthorized" });

  try {
    const store = accountsStore();
    const { blobs } = await store.list();
    const accounts = await Promise.all(
      (blobs || []).map(async (b) => {
        const data = await store.get(b.key, { type: "json" });
        return data ? Object.assign({ id: b.key }, data) : null;
      })
    );
    return resp(200, { accounts: accounts.filter(Boolean).sort((a, b) => (b.registeredAt || 0) - (a.registeredAt || 0)) });
  } catch (e) {
    return resp(500, { error: "server_error", detail: String(e.message || e) });
  }
};
