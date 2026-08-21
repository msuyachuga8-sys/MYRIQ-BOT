const http = require("http");

const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason
} = require("@whiskeysockets/baileys");

const pino = require("pino");

// 🌐 RENDER WEB SERVER
const PORT = process.env.PORT || 3000;

http.createServer((req, res) => {
  res.writeHead(200, {
    "Content-Type": "text/plain"
  });

  res.end("🔥 MYRIQ WhatsApp Bot is running!");
}).listen(PORT, () => {
  console.log(`🔥 MYRIQ Web Server running on port ${PORT}`);
});

// ⚙️ YOUR WHATSAPP NUMBER
const PHONE_NUMBER = "255767108314";

let isStarting = false;
let pairingCodeRequested = false;

// 🤖 START MYRIQ
async function startMYRIQ() {

  if (isStarting) return;

  isStarting = true;

  try {

    const { state, saveCreds } =
      await useMultiFileAuthState("./auth");

    const sock = makeWASocket({
      auth: state,

      logger: pino({
        level: "silent"
      }),

      printQRInTerminal: false,

      browser: [
        "MYRIQ",
        "Chrome",
        "1.0.0"
      ],

      connectTimeoutMs: 60000,
      defaultQueryTimeoutMs: 60000
    });

    // 💾 SAVE CREDENTIALS
    sock.ev.on("creds.update", saveCreds);

    // 🔌 CONNECTION
    sock.ev.on(
      "connection.update",
      async ({
        connection,
        lastDisconnect,
        qr
      }) => {

        // 🔐 PAIRING CODE
        if (
          qr &&
          !sock.authState.creds.registered &&
          !pairingCodeRequested
        ) {

          pairingCodeRequested = true;

          try {

            console.log("");
            console.log("⏳ MYRIQ socket iko tayari...");
            console.log("🔐 Inaomba WhatsApp Pairing Code...");

            await new Promise(resolve =>
              setTimeout(resolve, 5000)
            );

            const code =
              await sock.requestPairingCode(
                PHONE_NUMBER
              );

            const formattedCode =
              code.match(/.{1,4}/g)?.join("-") ||
              code;

            console.log("");
            console.log("======================================");
            console.log("🔥 MYRIQ WHATSAPP PAIRING CODE");
            console.log("======================================");
            console.log(`📱 Namba: ${PHONE_NUMBER}`);
            console.log(`🔑 CODE: ${formattedCode}`);
            console.log("======================================");
            console.log("");
            console.log("📲 WhatsApp → Settings");
            console.log("➡️ Linked Devices");
            console.log("➡️ Link a device");
            console.log("➡️ Link with phone number instead");
            console.log("");
            console.log("⚠️ Tumia code hiyo kwenye WhatsApp.");
            console.log("");

          } catch (error) {

            console.log("");
            console.log("❌ IMESHINDWA KUPATA PAIRING CODE");
            console.log(error);
            console.log("");

            pairingCodeRequested = false;
          }
        }

        // ✅ CONNECTED
        if (connection === "open") {

          console.log("");
          console.log("======================================");
          console.log("🔥🔥🔥 MYRIQ BOT IMEUNGANISHWA!");
          console.log("📱 WhatsApp Connected ✅");
          console.log("🤖 MYRIQ iko online!");
          console.log("======================================");
          console.log("");

          isStarting = false;
        }

        // ❌ CLOSED
        if (connection === "close") {

          const statusCode =
            lastDisconnect?.error?.output?.statusCode;

          console.log("");
          console.log(
            `❌ WhatsApp connection closed. Code: ${statusCode}`
          );

          const shouldReconnect =
            statusCode !== DisconnectReason.loggedOut;

          if (shouldReconnect) {

            console.log(
              "🔄 MYRIQ inajaribu kuunganishwa tena..."
            );

            isStarting = false;
            pairingCodeRequested = false;

            setTimeout(() => {
              startMYRIQ();
            }, 5000);

          } else {

            console.log(
              "🚪 MYRIQ ime-logout kwenye WhatsApp."
            );

            isStarting = false;
          }
        }
      }
    );

    // 💬 MESSAGE HANDLER
    sock.ev.on(
      "messages.upsert",
      async ({ messages }) => {

        try {

          const msg = messages[0];

          if (!msg) return;
          if (!msg.message) return;
          if (msg.key.fromMe) return;

          const text =
            msg.message.conversation ||
            msg.message.extendedTextMessage?.text ||
            "";

          const cleanText =
            text.trim().toLowerCase();

          console.log(
            `📩 Message received: ${text}`
          );

          // 🏓 .PING
          if (cleanText === ".ping") {

            await sock.sendMessage(
              msg.key.remoteJid,
              {
                text:
                  "🔥 MYRIQ BOT\n\n" +
                  "Pong! ⚡\n" +
                  "Bot iko online."
              }
            );

            console.log(
              "✅ .ping response sent!"
            );
          }

        } catch (error) {

          console.log(
            "❌ Message error:",
            error
          );
        }
      }
    );

  } catch (error) {

    console.log(
      "❌ MYRIQ startup error:",
      error
    );

    isStarting = false;

    setTimeout(() => {
      startMYRIQ();
    }, 5000);
  }
}

// 🚀 START MYRIQ
startMYRIQ();
