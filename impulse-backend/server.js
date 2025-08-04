
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

let waiting = null;

io.on('connection', socket => {
  console.log('⚡ Client connected:', socket.id);
  socket.emit('connected');

  if (!waiting) {
    waiting = socket;
    socket.emit('status', 'Waiting for a partner…');
  } else {
    const partner = waiting;
    waiting = null;

    partner.emit('status', 'Partner found! Ready when you are.');
    socket.emit('status', 'Partner found! Ready when you are.');

    let readyCount = 0;

    const checkStart = () => {
      readyCount++;
      if (readyCount === 2) {
        const delayMs = 3000;
        const startTime = Date.now() + delayMs;
        partner.emit('start', startTime, delayMs);
        socket.emit('start', startTime, delayMs);
      }
    };

    partner.once('ready', checkStart);
    socket.once('ready', checkStart);
  }

  socket.on('disconnect', () => {
    console.log('⚠️ Client disconnected:', socket.id);
    if (waiting === socket) {
      waiting = null;
    }
  });
});

server.listen(3000, () => {
  console.log('🚀 Server listening on port 3000');
});
