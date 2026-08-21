const http = require("http");

const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason
} = require("@whiskeysockets/baileys");

const pino = require("pino");

// ===============================
// 🌐 WEB SERVER - RENDER
// ===============================

const PORT = process.env.PORT || 3000;

http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("🔥 MYRIQ WhatsApp Bot is running!");
}).listen(PORT, () => {
  console.log(`🔥 MYRIQ Web Server running on port ${PORT}`);
});

// ===============================
// 📱 MYRIQ WHATSAPP BOT
// ===============================

async function startMYRIQ() {
  const { state, saveCreds } =
    await useMultiFileAuthState("./auth");

  const sock = makeWASocket({
    auth: state,
    logger: pino({ level: "silent" }),

    // ❌ QR OFF
    printQRInTerminal: false
  });

  // Save WhatsApp credentials
  sock.ev.on("creds.update", saveCreds);

  // ===============================
  // 🔐 PAIRING CODE
  // ===============================

  if (!sock.authState.creds.registered) {

    // WEKA NAMBA YAKO HAPA
    // Mfano: 255712345678
    const phoneNumber = "255767108314;

    try {
      const code = await sock.requestPairingCode(phoneNumber);

      console.log("");
      console.log("=================================");
      console.log("🔥 MYRIQ WHATSAPP PAIRING CODE");
      console.log("=================================");
      console.log(`🔑 CODE: ${code}`);
      console.log("=================================");
      console.log("");
    } catch (error) {
      console.log("❌ Imeshindwa kupata pairing code:");
      console.log(error);
    }
  }

  // ===============================
  // 🔄 CONNECTION
  // ===============================

  sock.ev.on("connection.update", ({ connection, lastDisconnect }) => {

    if (connection === "open") {
      console.log("");
      console.log("=================================");
      console.log("🔥 MYRIQ BOT IMEUNGANISHWA!");
      console.log("📱 WhatsApp Connected ✅");
      console.log("=================================");
      console.log("");
    }

    if (connection === "close") {

      const shouldReconnect =
        lastDisconnect?.error?.output?.statusCode !==
        DisconnectReason.loggedOut;

      if (shouldReconnect) {
        console.log("🔄 MYRIQ inajaribu kuunganishwa tena...");

        setTimeout(() => {
          startMYRIQ();
        }, 3000);
      } else {
        console.log("❌ MYRIQ ime-logout kwenye WhatsApp.");
      }
    }
  });

  // ===============================
  // 💬 MESSAGE HANDLER
  // ===============================

  sock.ev.on("messages.upsert", async ({ messages }) => {

    const msg = messages[0];

    if (!msg.message || msg.key.fromMe) return;

    const text =
      msg.message.conversation ||
      msg.message.extendedTextMessage?.text ||
      "";

    console.log(`📩 Message: ${text}`);

    // ===============================
    // 🏓 PING
    // ===============================

    if (text.toLowerCase().trim() === ".ping") {

      await sock.sendMessage(msg.key.remoteJid, {
        text:
          "🔥 MYRIQ BOT\n\n" +
          "Pong! ⚡\n" +
          "Bot iko online."
      });
    }
  });
}

// ===============================
// 🚀 START MYRIQ
// ===============================

startMYRIQ();
