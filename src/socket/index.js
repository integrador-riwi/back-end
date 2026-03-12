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
    
    console.log("[Socket] Token received:", token ? `${token.substring(0, 30)}...` : "NO TOKEN");
    console.log("[Socket] JWT_SECRET:", process.env.JWT_SECRET || "default-secret");

    if (!token) {
      console.log("[Socket] No token provided");
      return next(new Error("Authentication required"));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || "default-secret");
      console.log("[Socket] Decoded user:", decoded);
      socket.user = decoded;
      next();
    } catch (err) {
      console.error("[Socket] Token verification failed:", err.message);
      next(new Error("Invalid token: " + err.message));
    }
  });

  io.on("connection", (socket) => {
    const userId = socket.user?.id_user;
    const userEmail = socket.user?.email;
    
    console.log(`[Socket] User ${userId} (${userEmail}) connected with socket ${socket.id}`);

    if (userId) {
      connectedUsers.set(userId, socket.id);
      socket.join(`user_${userId}`);
    }

    socket.on("disconnect", () => {
      if (userId) {
        connectedUsers.delete(userId);
        console.log(`[Socket] User ${userId} disconnected`);
      }
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
