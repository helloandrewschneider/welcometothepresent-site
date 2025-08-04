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

  // Matchmaking
  if (!waiting) {
    waiting = socket;
    socket.emit('status', 'Waiting for a partner…');
  } else {
    const partner = waiting;
    waiting = null;

    partner.emit('status', 'Partner found! Waiting for your confirmation.');
    socket.emit('status', 'Partner found! Waiting for your confirmation.');

    let bothReady = 0;
    const doStart = () => {
      const delay = 3000;
      const startTime = Date.now() + delay;
      [partner, socket].forEach(s => {
        s.emit('start', startTime, delay);
      });
      console.log('🎬 Both users ready. Sync start at', startTime);
    };

    partner.on('ready', () => {
      bothReady++;
      if (bothReady === 2) doStart();
    });

    socket.on('ready', () => {
      bothReady++;
      if (bothReady === 2) doStart();
    });
  }

  socket.on('disconnect', () => {
    if (waiting === socket) waiting = null;
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🔊 Sync server running on port ${PORT}`);
});
