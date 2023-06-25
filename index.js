const {
  default: MAseasionByRossyChan,
  useMultiFileAuthState,
  DisconnectReason,
  delay,
  downloadContentFromMessage,
  makeInMemoryStore,
  jidDecode,
  proto,
} = require("@adiwajshing/baileys");
const pino = require("pino");
const { Boom } = require("@hapi/boom");
const fs = require("fs");
//qrwa = null
//PORT = 5000
const { toBuffer, toDataURL } = require("qrcode");
const express = require("express");
let app = express();
const { createServer } = require("http");
//let server = createServer(app)
let _qr = "invalid";
let PORT = 3000 || 8000 || 8080;
const path = require("path");

async function startSesi() {
  const store = makeInMemoryStore({
    logger: pino().child({ level: "silent", stream: "store" }),
  });

  const { state, saveCreds } = await useMultiFileAuthState(`session`);
  const rossy = MAseasionByRossyChan({
    logger: pino({ level: "silent" }),
    printQRInTerminal: true,
    browser: ["Rossy-Chan × Ayodya", "Safari", "1.0.0"],
    auth: state,
  });

  store.bind(rossy.ev);
  rossy.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;
    if (qr) {
      app.use(async (req, res) => {
        res.setHeader("content-type", "image/png");
        res.end(await toBuffer(qr));
      });
      app.use(express.static(path.join(__dirname, "views")));
      app.listen(process.env.PORT, () => {
        console.log("🍟 Scan QR");
      });
    }
    if (connection === "close") {
      let reason = new Boom(lastDisconnect?.error)?.output.statusCode;
      if (reason === DisconnectReason.badSession) {
        console.log(`🚩Bad Session File, Please Delete Session and Scan Again`);
        rossy.logout();
      } else if (reason === DisconnectReason.connectionClosed) {
        console.log("🚩 Connection closed, reconnecting....");
        startSesi();
      } else if (reason === DisconnectReason.connectionLost) {
        console.log("🚩 Connection Lost from Server, reconnecting...");
        startSesi();
      } else if (reason === DisconnectReason.connectionReplaced) {
        console.log(
          "🚩 Connection Replaced, Another New Session Opened, Please Close Current Session First"
        );
        rossy.logout();
      } else if (reason === DisconnectReason.loggedOut) {
        console.log(`🚩 Device Logged Out, Please Scan Again And Run.`);
        rossy.logout();
      } else if (reason === DisconnectReason.restartRequired) {
        console.log("🚩 Restart Required, Restarting...");
        startSesi();
      } else if (reason === DisconnectReason.timedOut) {
        console.log("🚩 Connection TimedOut, Reconnecting...");
        startSesi();
      } else if (reason === DisconnectReason.Multidevicemismatch) {
        console.log("🚩 Multi device mismatch, please scan again");
        rossy.logout();
      } else rossy.end(`🚩 Unknown DisconnectReason: ${reason}|${connection}`);
    }
    console.log("🍔 Connected...", update);
  });

  rossy.ev.on("creds.update", saveCreds);

  return rossy;
}

startSesi();
