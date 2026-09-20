const { adminSettingsStore } = require("./lib/blobs");
const { getOrBootstrapSettings } = require("./lib/adminSettings");
const { verifyToken, bearerFrom, sha256 } = require("./lib/crypto");

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
  const oldPassword = data.oldPassword || "";
  const newPassword = data.newPassword || "";
  if (!oldPassword || !newPassword) return resp(400, { error: "missing_fields" });
  if (newPassword.length < 6) return resp(400, { error: "password_too_short" });

  try {
    const settings = await getOrBootstrapSettings();
    if (sha256(oldPassword) !== settings.passwordHash) return resp(401, { error: "invalid_old_password" });
    settings.passwordHash = sha256(newPassword);
    settings.updatedAt = Date.now();
    await adminSettingsStore().setJSON("main", settings);
    return resp(200, { ok: true });
  } catch (e) {
    return resp(500, { error: "server_error", detail: String(e.message || e) });
  }
};
