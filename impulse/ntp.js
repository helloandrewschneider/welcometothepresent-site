export async function estimateClockOffset(socket, rounds = 5) {
  return new Promise((resolve) => {
    let offsets = [];
    let completed = 0;

    function ping() {
      const clientSent = Date.now();
      socket.emit('ntp-ping', clientSent);

      socket.once('ntp-pong', (serverTime, clientEcho) => {
        const clientRecv = Date.now();
        const RTT = clientRecv - clientSent;
        const offset = serverTime - (clientSent + RTT / 2);
        offsets.push(offset);
        completed++;
        if (completed >= rounds) {
          const avg = offsets.reduce((a, b) => a + b, 0) / offsets.length;
          resolve(avg);
        } else {
          setTimeout(ping, 100);
        }
      });
    }

    ping();
  });
}
