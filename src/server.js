import 'dotenv/config';
import { setDefaultResultOrder } from 'dns';
setDefaultResultOrder('ipv4first');

import http from 'http';
import app from './app.js';
import { initializeSocket } from './socket/index.js';
import { setSocketIO } from './socket/notifications.js';

const PORT = process.env.PORT || 3000;

const server = http.createServer(app);

const io = initializeSocket(server);
setSocketIO(io);

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
