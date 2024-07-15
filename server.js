const qrcode = require('qrcode-terminal');

// Fungsi untuk menampilkan QR code di terminal
function displayTerminalQR(qr) {
  qrcode.generate(qr, { small: true });
  console.log('Scan QR code di atas dengan WhatsApp Anda');
}

// Contoh penggunaan dengan whatsapp-web.js
const { Client } = require('whatsapp-web.js');
const client = new Client();

client.on('qr', (qr) => {
  displayTerminalQR(qr);
});

client.on('ready', () => {
  console.log('Client is ready!');
});

client.initialize();