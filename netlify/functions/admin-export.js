const { accountsStore, signupRequestsStore, historyStore } = require("./lib/blobs");
const { getOrBootstrapSettings } = require("./lib/adminSettings");
const { verifyToken, bearerFrom } = require("./lib/crypto");

function resp(code, body) {
  return { statusCode: code, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
}

async function dumpStore(store) {
  const { blobs } = await store.list();
  const out = {};
  for (const b of blobs || []) {
    out[b.key] = await store.get(b.key, { type: "json" });
  }
  return out;
}

exports.handler = async (event) => {
  if (event.httpMethod !== "GET") return resp(405, { error: "method_not_allowed" });
  const auth = verifyToken(bearerFrom(event));
  if (!auth || !auth.admin) return resp(401, { error: "unauthorized" });

  try {
    const [accounts, signupRequests, history, settings] = await Promise.all([
      dumpStore(accountsStore()),
      dumpStore(signupRequestsStore()),
      dumpStore(historyStore()),
      getOrBootstrapSettings(),
    ]);
    // Le mot de passe (haché) n'a aucune valeur hors de ce système : on ne l'exporte pas.
    const safeSettings = Object.assign({}, settings);
    delete safeSettings.passwordHash;

    return resp(200, {
      exportedAt: Date.now(),
      accounts,
      signupRequests,
      history,
      settings: safeSettings,
    });
  } catch (e) {
    return resp(500, { error: "server_error", detail: String(e.message || e) });
  }
};
