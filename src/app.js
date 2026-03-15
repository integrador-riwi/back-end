import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import authRoutes from "./modules/auth/auth.routes.js";
import usersRoutes from "./modules/users/users.routes.js";
import teamsRoutes from "./modules/teams/teams.routes.js";
import projectsRoutes from "./modules/projects/projects.routes.js";
import eventsRoutes from "./modules/events/events.routes.js";
import rankingRoutes from "./modules/ranking/ranking.routes.js";
import finalistsRoutes from "./modules/finalists/finalists.routes.js";
import commentsRoutes from "./modules/comments/comments.routes.js";
import evaluationsRoutes from "./modules/evaluations/evaluations.routes.js";
import { errorHandler } from "./middleware/errorHandler.js";
import config from "./config/env.js";
import githubWebhookRouter from "./integrations/github.webhook.js";
import emailRoutes from "./utils/emails/emails.routes.js";
import votesRoutes from "./modules/QR-Votes/votes.routes.js";
import uploadRoutes from "./modules/upload/upload.routes.js";
import { join } from "path";

const app = express();

const allowedOrigins = [
  "https://front-end-olive-six.vercel.app",
  "http://localhost:5173",
  "http://localhost:5174",
  "https://front-end3-bice.vercel.app",
  "http://localhost:3000",
  "https://team-up.crudzaso.com",
  "https://front-end-integrador-zatc.onrender.com",
];

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("No permitido por CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Cookie"],
};

app.options("*", cors(corsOptions));
app.use(cors(corsOptions));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use("/api/webhooks", githubWebhookRouter);

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", environment: config.nodeEnv });
});

app.use("/api/auth", authRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/teams", teamsRoutes);
app.use("/api/projects", projectsRoutes);
app.use("/api/events", eventsRoutes);
app.use("/api/events/:eventId/ranking", rankingRoutes);
app.use("/api/finalists", finalistsRoutes);
app.use("/api/comments", commentsRoutes);
app.use("/api/evaluations", evaluationsRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/qr-votes", votesRoutes);

// Endpoint to send emails u
app.use("/api/emails", emailRoutes);

app.use((req, res) => {
  res.status(404).json({ success: false, error: "Endpoint no encontrado" });
});

app.use(errorHandler);

export default app;
