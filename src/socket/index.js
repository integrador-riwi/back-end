import { Server } from "socket.io";
import jwt from "jsonwebtoken";

let _io = null;

const connectedUsers = new Map();

const ALLOWED_ORIGINS = [
  "https://front-end-olive-six.vercel.app",
  "http://localhost:5173",
  "http://localhost:5174",
  "https://front-end3-bice.vercel.app",
  "http://localhost:3000",
  "https://team-up.crudzaso.com",
  "https://front-end-integrador-zatc.onrender.com",
];

export function initializeSocket(server) {
  const io = new Server(server, {
    cors: {
      origin: ALLOWED_ORIGINS,
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  _io = io;

  io.use((socket, next) => {
    const token = socket.handshake.auth.token || socket.handshake.query.token;
    
    if (!token) {
      return next(new Error("Authentication required"));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || "default-secret");
      socket.user = decoded;
      next();
    } catch (err) {
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    const userId = socket.user?.id_user;
    
    if (userId) {
      connectedUsers.set(userId, socket.id);
      socket.join(`user_${userId}`);
    }

    socket.on("join_project", (projectId) => {
      socket.join(`project_${projectId}`);
    });

    socket.on("leave_project", (projectId) => {
      socket.leave(`project_${projectId}`);
    });

    socket.on("disconnect", () => {
      if (userId) {
        connectedUsers.delete(userId);
      }
    });
  });

  return io;
}

export function getIO() {
  return _io;
}

export function sendNotificationToUser(io, userId, event, data) {
  const socketId = connectedUsers.get(userId);
  if (socketId) {
    io.to(socketId).emit(event, data);
  }
}

export function sendNotificationToTeam(io, teamId, event, data, excludeUserId = null) {
  io.to(`team_${teamId}`).emit(event, data);
}

export function getConnectedUsers() {
  return connectedUsers;
}

export default { initializeSocket, sendNotificationToUser, sendNotificationToTeam, getConnectedUsers };
