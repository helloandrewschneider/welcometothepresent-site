const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "https://welcometothepresent.com",
    methods: ["GET", "POST"]
  }
});

let waiting = null;

io.on('connection', socket => {
  console.log('⚡ Client connected:', socket.id);

  // NTP-style handshake
  socket.on('ntp-ping', (clientSent) => {
    socket.emit('ntp-pong', Date.now(), clientSent);
  });

  if (!waiting) {
    waiting = socket;
    socket.emit('status', 'Waiting for a partner…');
    console.log(`🕓 ${socket.id} is now waiting for a partner`);
  } else {
    const partner = waiting;
    waiting = null;
    console.log(`🔗 Pairing ${socket.id} with ${partner.id}`);

    let bothReady = 0;

    const doStart = () => {
      const delay = 3000;
      const startTime = Date.now() + delay;
      console.log('🚦 Sending "start" to both users at', startTime);
      [partner, socket].forEach(s => {
        s.emit('start', startTime, delay);
      });
    };

    const handleReady = (label) => {
      bothReady++;
      console.log(`✅ ${label} is ready (${bothReady}/2)`);
      if (bothReady === 2) doStart();
    };

    socket.on('ready', () => handleReady(`Socket (${socket.id})`));
    partner.on('ready', () => handleReady(`Partner (${partner.id})`));

    partner.emit('status', 'Partner found! Waiting for your confirmation.');
    socket.emit('status', 'Partner found! Waiting for your confirmation.');
  }

  socket.on('disconnect', () => {
    if (waiting === socket) {
      waiting = null;
      console.log(`❌ ${socket.id} disconnected (was waiting)`);
    } else {
      console.log(`❌ ${socket.id} disconnected`);
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🔊 Sync server running on port ${PORT}`);
});
