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
const activePairs = new Map(); // socket.id => { partner, ready }

function setupPairing(socketA, socketB) {
  console.log(`🔗 Pairing ${socketA.id} with ${socketB.id}`);

  activePairs.set(socketA.id, { partner: socketB, ready: false });
  activePairs.set(socketB.id, { partner: socketA, ready: false });

  const checkAndStart = () => {
    const a = activePairs.get(socketA.id);
    const b = activePairs.get(socketB.id);
    if (a?.ready && b?.ready) {
      const delay = 3000;
      const startTime = Date.now() + delay;
      console.log(`🚦 Starting playback at ${startTime} for ${socketA.id} and ${socketB.id}`);
      socketA.emit('start', startTime, delay);
      socketB.emit('start', startTime, delay);
    }
  };

  socketA.on('ready', () => {
    console.log(`✅ ${socketA.id} is ready`);
    const a = activePairs.get(socketA.id);
    if (a) a.ready = true;
    checkAndStart();
  });

  socketB.on('ready', () => {
    console.log(`✅ ${socketB.id} is ready`);
    const b = activePairs.get(socketB.id);
    if (b) b.ready = true;
    checkAndStart();
  });

  socketA.emit('status', 'Partner found! Waiting for your confirmation.');
  socketB.emit('status', 'Partner found! Waiting for your confirmation.');
}

io.on('connection', socket => {
  console.log(`⚡ Client connected: ${socket.id}`);

  socket.on('ntp-ping', (clientSent) => {
    socket.emit('ntp-pong', Date.now(), clientSent);
  });

  // Guard against overwriting pairing state
  if (!waiting && !activePairs.has(socket.id)) {
    waiting = socket;
    socket.emit('status', 'Waiting for a partner…');
    console.log(`🕓 ${socket.id} is now waiting`);
  } else if (waiting && waiting !== socket && !activePairs.has(socket.id)) {
    const partner = waiting;
    waiting = null;
    setupPairing(partner, socket);
  }

  socket.on('disconnect', () => {
    console.log(`❌ Disconnected: ${socket.id}`);

    if (waiting === socket) {
      waiting = null;
      console.log(`🧹 Cleared ${socket.id} from waiting`);
    }

    const entry = activePairs.get(socket.id);
    if (entry) {
      const partner = entry.partner;
      activePairs.delete(socket.id);
      activePairs.delete(partner.id);
      partner.emit('status', 'Your partner disconnected. Waiting for someone new…');
      partner.removeAllListeners('ready');

      // Only reassign if they’re not already in waiting
      if (!waiting && partner.connected) {
        waiting = partner;
        console.log(`🔄 Re-queued ${partner.id}`);
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🔊 Sync server running on port ${PORT}`);
});
