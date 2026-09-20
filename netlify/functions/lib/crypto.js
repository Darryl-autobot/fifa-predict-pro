const crypto = require("crypto");

function sha256(text) {
  return crypto.createHash("sha256").update(String(text)).digest("hex");
}

function b64url(buf) {
  return Buffer.from(buf).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function fromB64url(str) {
  return Buffer.from(str.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

function getSecret() {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error("JWT_SECRET manquant dans les variables d'environnement.");
  return s;
}

function signToken(payload, ttlSeconds) {
  const body = Object.assign({}, payload, { exp: Date.now() + ttlSeconds * 1000 });
  const bodyPart = b64url(JSON.stringify(body));
  const sig = crypto.createHmac("sha256", getSecret()).update(bodyPart).digest("hex");
  return bodyPart + "." + sig;
}

function verifyToken(token) {
  try {
    if (!token) return null;
    const [bodyPart, sig] = token.split(".");
    if (!bodyPart || !sig) return null;
    const expected = crypto.createHmac("sha256", getSecret()).update(bodyPart).digest("hex");
    if (expected !== sig) return null;
    const payload = JSON.parse(fromB64url(bodyPart).toString());
    if (!payload.exp || payload.exp < Date.now()) return null;
    return payload;
  } catch (e) {
    return null;
  }
}

function genAccessCode() {
  const chars = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  const part = () =>
    Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return "FP-" + part() + "-" + part();
}

function genId() {
  return Date.now().toString(36) + "_" + crypto.randomBytes(6).toString("hex");
}

function bearerFrom(event) {
  const h = (event.headers && (event.headers.authorization || event.headers.Authorization)) || "";
  const m = /^Bearer\s+(.+)$/i.exec(h);
  return m ? m[1] : null;
}

module.exports = { sha256, signToken, verifyToken, genAccessCode, genId, bearerFrom };
