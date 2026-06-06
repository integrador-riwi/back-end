import 'dotenv/config';
import { setDefaultResultOrder } from 'dns';
setDefaultResultOrder('ipv4first');

import http from 'http';
import app from './app.js';
import { initializeSocket } from './socket/index.js';
import { setSocketIO } from './socket/notifications.js';
import { ensureRuntimeSchema } from './db/pool.js';

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  await ensureRuntimeSchema();

  const server = http.createServer(app);

  const io = initializeSocket(server);
  setSocketIO(io);

  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
};

startServer().catch((err) => {
  console.error('❌ Server startup failed:', err.message);
  process.exit(1);
});
