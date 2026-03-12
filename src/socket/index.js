import { Server } from "socket.io";
import jwt from "jsonwebtoken";

const connectedUsers = new Map();

export function initializeSocket(server) {
  const io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || "http://localhost:5173",
      methods: ["GET", "POST"],
      credentials: true
    }
  });

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
    const userId = socket.user.id;
    
    connectedUsers.set(userId, socket.id);
    console.log(`User ${userId} connected with socket ${socket.id}`);

    socket.join(`user_${userId}`);

    socket.on("disconnect", () => {
      connectedUsers.delete(userId);
      console.log(`User ${userId} disconnected`);
    });
  });

  return io;
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
