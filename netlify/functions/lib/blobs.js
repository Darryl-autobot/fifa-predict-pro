
const { getStore } = require("@netlify/blobs");

function storeOpts(name) {
  return {
    name,
    siteID: process.env.NETLIFY_SITE_ID,
    token: process.env.NETLIFY_BLOBS_TOKEN,
  };
}

function accountsStore() { return getStore(storeOpts("accounts")); }
function accountsIndexStore() { return getStore(storeOpts("accounts_index")); }
function signupRequestsStore() { return getStore(storeOpts("signup_requests")); }
function historyStore() { return getStore(storeOpts("history")); }
function adminSettingsStore() { return getStore(storeOpts("admin_settings")); }

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
