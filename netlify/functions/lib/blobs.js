const { getStore } = require("@netlify/blobs");

// Chaque "store" est un espace de stockage nommé, indépendant.
function accountsStore() { return getStore("accounts"); }
function accountsIndexStore() { return getStore("accounts_index"); }
function signupRequestsStore() { return getStore("signup_requests"); }
function historyStore() { return getStore("history"); }
function adminSettingsStore() { return getStore("admin_settings"); }

function indexKey(bookmakerIdLower) {
  return encodeURIComponent(bookmakerIdLower);
}

module.exports = {
  accountsStore,
  accountsIndexStore,
  signupRequestsStore,
  historyStore,
  adminSettingsStore,
  indexKey,
};
