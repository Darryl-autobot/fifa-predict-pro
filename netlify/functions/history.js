const { historyStore } = require("./lib/blobs");
const { verifyToken, bearerFrom, genId } = require("./lib/crypto");

function resp(code, body) {
  return { statusCode: code, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
}

exports.handler = async (event) => {
  const auth = verifyToken(bearerFrom(event));
  if (!auth || !auth.accountId) return resp(401, { error: "unauthorized" });

  try {
    const store = historyStore();
    const prefix = auth.accountId + ":";

    if (event.httpMethod === "GET") {
      const { blobs } = await store.list({ prefix });
      const items = await Promise.all((blobs || []).map((b) => store.get(b.key, { type: "json" })));
      const history = items.filter(Boolean).sort((a, b) => b.createdAt - a.createdAt).slice(0, 50);
      return resp(200, { history });
    }
    if (event.httpMethod === "POST") {
      const data = JSON.parse(event.body || "{}");
      const key = prefix + genId();
      await store.setJSON(key, {
        match: data.match || "",
        prediction: data.prediction || "",
        confidence: data.confidence || "",
        pHome: data.pHome || 0,
        pDraw: data.pDraw || 0,
        pAway: data.pAway || 0,
        createdAt: Date.now(),
      });
      return resp(200, { ok: true });
    }
    return resp(405, { error: "method_not_allowed" });
  } catch (e) {
    return resp(500, { error: "server_error", detail: String(e.message || e) });
  }
};
