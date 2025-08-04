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

  // Matchmaking logic
  if (!waiting) {
    waiting = socket;
    socket.emit('status', 'Waiting for a partner…');
  } else {
    const partner = waiting;
    waiting = null;

    const delay = 3000;
    const startTime = Date.now() + delay;

    [partner, socket].forEach(s => {
      s.emit('status', 'Partner found!');
      s.emit('start', startTime, delay);
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
