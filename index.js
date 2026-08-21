const express = require("express");
const QRCode = require("qrcode");
const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason
} = require("@whiskeysockets/baileys");

const pino = require("pino");

// =====================================
// 🌐 RENDER WEB SERVER
// =====================================

const app = express();
const PORT = process.env.PORT || 3000;

let currentQR = null;
let botStatus = "Starting MYRIQ...";

// Browser page
app.get("/", async (req, res) => {

  if (currentQR) {

    try {

      const qrImage =
        await QRCode.toDataURL(currentQR);

      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport"
                content="width=device-width, initial-scale=1.0">

          <title>MYRIQ WhatsApp Bot</title>

          <style>
            body {
              margin: 0;
              padding: 30px;
              background: #111;
              color: white;
              font-family: Arial, sans-serif;
              text-align: center;
            }

            h1 {
              font-size: 32px;
            }

            .box {
              max-width: 450px;
              margin: auto;
              background: #222;
              padding: 25px;
              border-radius: 20px;
            }

            img {
              width: 300px;
              max-width: 90%;
              background: white;
              padding: 10px;
              border-radius: 10px;
            }

            .status {
              margin-top: 20px;
              font-size: 20px;
            }
          </style>
        </head>

        <body>

          <div class="box">

            <h1>🔥 MYRIQ AI</h1>

            <p>WhatsApp Bot</p>

            <img src="${qrImage}" />

            <div class="status">
              📱 Scan this QR with WhatsApp
            </div>

            <p>
              WhatsApp → Settings → Linked Devices
              → Link a device
            </p>

          </div>

        </body>
        </html>
      `);

    } catch (error) {

      res.send("❌ QR generation error");

    }

  } else {

    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport"
              content="width=device-width, initial-scale=1.0">

        <title>MYRIQ Bot</title>

        <style>
          body {
            background: #111;
            color: white;
            font-family: Arial;
            text-align: center;
            padding: 60px 20px;
          }

          h1 {
            font-size: 35px;
          }

          .status {
            font-size: 22px;
            margin-top: 30px;
          }
        </style>
      </head>

      <body>

        <h1>🔥 MYRIQ AI</h1>

        <div class="status">
          ${botStatus}
        </div>

        <p>
          Refresh this page after a few seconds.
        </p>

      </body>
      </html>
    `);
  }
});

app.listen(PORT, () => {

  console.log(
    `🔥 MYRIQ Web Server running on port ${PORT}`
  );

});

// =====================================
// 🤖 START MYRIQ
// =====================================

async function startMYRIQ() {

  try {

    const {
      state,
      saveCreds
    } = await useMultiFileAuthState("./auth");

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

    // Save credentials
    sock.ev.on(
      "creds.update",
      saveCreds
    );

    // =================================
    // 🔌 CONNECTION UPDATE
    // =================================

    sock.ev.on(
      "connection.update",
      async ({
        connection,
        lastDisconnect,
        qr
      }) => {

        // QR RECEIVED
        if (qr) {

          currentQR = qr;

          botStatus =
            "📱 QR Code iko tayari!";

          console.log("");
          console.log(
            "================================"
          );
          console.log(
            "🔥 MYRIQ QR CODE READY"
          );
          console.log(
            "🌐 Fungua Render URL kuiona"
          );
          console.log(
            "================================"
          );
          console.log("");
        }

        // CONNECTED
        if (connection === "open") {

          currentQR = null;

          botStatus =
            "🔥 MYRIQ IMEUNGANISHWA NA WHATSAPP!";

          console.log("");
          console.log(
            "================================"
          );
          console.log(
            "🔥🔥🔥 MYRIQ BOT CONNECTED!"
          );
          console.log(
            "📱 WhatsApp Connected ✅"
          );
          console.log(
            "================================"
          );
          console.log("");
        }

        // CLOSED
        if (connection === "close") {

          currentQR = null;

          const statusCode =
            lastDisconnect
              ?.error
              ?.output
              ?.statusCode;

          console.log(
            `❌ WhatsApp connection closed. Code: ${statusCode}`
          );

          const shouldReconnect =
            statusCode !==
            DisconnectReason.loggedOut;

          if (shouldReconnect) {

            botStatus =
              "🔄 Reconnecting to WhatsApp...";

            console.log(
              "🔄 MYRIQ inajaribu kuunganishwa tena..."
            );

            setTimeout(() => {
              startMYRIQ();
            }, 5000);

          } else {

            botStatus =
              "❌ MYRIQ ime-logout.";

          }
        }

      }
    );

    // =====================================
    // 💬 MESSAGE HANDLER
    // =====================================

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
            msg.message
              .extendedTextMessage
              ?.text ||
            "";

          const cleanText =
            text
              .trim()
              .toLowerCase();

          console.log(
            `📩 Message: ${text}`
          );

          // ===============================
          // 🏓 PING
          // ===============================

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

    setTimeout(() => {
      startMYRIQ();
    }, 5000);
  }

}

// =====================================
// 🚀 START
// =====================================

startMYRIQ();
