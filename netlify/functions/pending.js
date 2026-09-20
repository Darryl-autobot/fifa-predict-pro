const { signupRequestsStore } = require("./lib/blobs");
const { verifyToken, bearerFrom } = require("./lib/crypto");

function resp(code, body) {
  return { statusCode: code, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
}

exports.handler = async (event) => {
  if (event.httpMethod !== "GET") return resp(405, { error: "method_not_allowed" });
  const auth = verifyToken(bearerFrom(event));
  if (!auth || !auth.admin) return resp(401, { error: "unauthorized" });

  try {
    const store = signupRequestsStore();
    const { blobs } = await store.list();
    const requests = await Promise.all(
      (blobs || []).map(async (b) => {
        const data = await store.get(b.key, { type: "json" });
        return data ? Object.assign({ id: b.key }, data) : null;
      })
    );
    const pending = requests.filter((r) => r && r.status === "en_attente").sort((a, b) => b.requestedAt - a.requestedAt);
    return resp(200, { requests: pending });
  } catch (e) {
    return resp(500, { error: "server_error", detail: String(e.message || e) });
  }
};
