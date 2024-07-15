const { makeWASocket } = require('@whiskeysockets/baileys');
const pino = require('pino');
const fs = require('fs');
const { useRedisAuthState } = require('./redisAuthState');

let qrCode = null;
let sessionData = {};

async function connectWhatsapp() {
  console.log('Attempting to connect to WhatsApp...');
  const { state, saveCreds } = await useRedisAuthState();
  console.log('Auth state loaded from Redis');

  const { state, saveCreds } = {
    state: {
      creds: sessionData.creds || {},
      keys: {
        get: async (type, ids) => {
          const data = {};
          for (let id of ids) {
            if (sessionData[`${type}-${id}`]) {
              data[id] = JSON.parse(sessionData[`${type}-${id}`]);
            }
          }
          return data;
        },
        set: async (data) => {
          for (const category in data) {
            for (const id in data[category]) {
              sessionData[`${category}-${id}`] = JSON.stringify(data[category][id]);
            }
          }
        }
      }
    },
    saveCreds: async () => {
      sessionData.creds = state.creds;
      console.log('Menyimpan kredensial:', JSON.stringify(sessionData));
      // Kirim data sesi ke endpoint
      try {
        const response = await fetch(`${process.env.APP_URL}/save-session`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(sessionData),
        });
        if (!response.ok) {
          throw new Error('Gagal menyimpan sesi');
        }
      } catch (error) {
        console.error('Error menyimpan sesi:', error);
      }
    }
  };

  const socket = makeWASocket({
    printQRInTerminal: false,
    browser: ["DAPABOT", "", ""],
    auth: state,
    logger: pino({ level: "silent" }),
  });

  socket.ev.on("creds.update", saveCreds);
  socket.ev.on("connection.update", async ({ connection, qr }) => {
    if (connection === 'open') {
      console.log("WhatsApp Active..");
      qrCode = null;
    } else if (connection === 'close') {
      console.log("WhatsApp Closed..");
      setTimeout(connectWhatsapp, 10000);
    } else if (connection === 'connecting') {
      console.log('WhatsApp Connecting');
    }
    if (qr && !qrCode) {
      console.log('New QR Code generated');
      qrCode = qr;
      fs.writeFileSync('qr.txt', qr);
    }
  });

  socket.ev.on("messages.upsert", ({messages}) => {
    const pesan = messages[0].message.conversation
    const phone =  messages[0].key.remoteJid
    console.log(messages[0])
    if(!messages[0].key.fromMe){
      query({"question": pesan}).then(async (response) => {
        console.log(response);
        const {text} = response
        await socket.sendMessage(phone, { text: text })
      });
    }
    return
  });
}

async function query(data) {
  const response = await fetch(
    "https://geghnreb.cloud.sealos.io/api/v1/prediction/28a6b79e-bd21-436c-ae21-317eee710cb0",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(data)
    }
  );
  const result = await response.json();
  return result;
}

connectWhatsapp();

module.exports = { connectWhatsapp, getQRCode: () => qrCode };