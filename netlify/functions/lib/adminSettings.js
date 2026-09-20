const { adminSettingsStore } = require("./blobs");
const { sha256 } = require("./crypto");

async function getOrBootstrapSettings() {
  const store = adminSettingsStore();
  let settings = await store.get("main", { type: "json" });
  if (!settings) {
    settings = {
      passwordHash: sha256(process.env.ADMIN_BOOTSTRAP_PASSWORD || "Dar1234"),
      telegramContact: process.env.DEFAULT_TELEGRAM_CONTACT || "@Mrtekeng",
      telegramAdminChatId: process.env.TELEGRAM_ADMIN_CHAT_ID || null,
      telegramBotUsername: process.env.TELEGRAM_BOT_USERNAME || null,
      updatedAt: Date.now(),
    };
    await store.setJSON("main", settings);
  }
  return settings;
}

module.exports = { getOrBootstrapSettings };
