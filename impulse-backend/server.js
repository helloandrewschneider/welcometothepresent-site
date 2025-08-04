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

function setupPairing(socketA, socketB) {
  console.log(`🔗 Pairing ${socketA.id} with ${socketB.id}`);

  let bothReady = 0;

  const doStart = () => {
    const delay = 3000;
    const startTime = Date.now() + delay;
    console.log('🚦 Sending "start" to both users at', startTime);
    [socketA, socketB].forEach(s => {
      s.emit('start', startTime, delay);
    });
  };

  const handleReady = (label) => {
    bothReady++;
    console.log(`✅ ${label} is ready (${bothReady}/2)`);
    if (bothReady === 2) doStart();
  };

  [socketA, socketB].forEach((socket, index) => {
    const label = index === 0 ? `Socket A (${socket.id})` : `Socket B (${socket.id})`;
    socket.on('ready', () => handleReady(label));
    socket.emit('status', 'Partner found! Waiting for your confirmation.');
  });
}

io.on('connection', socket => {
  console.log('⚡ Client connected:', socket.id);

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
    setupPairing(partner, socket);
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
