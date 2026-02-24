import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import authRoutes from './modules/auth/auth.routes.js';
import usersRoutes from './modules/users/users.routes.js';
import teamsRoutes from './modules/teams/teams.routes.js';
import projectsRoutes from './modules/projects/projects.routes.js';
import { errorHandler } from './middleware/errorHandler.js';
import config from './config/env.js';
import pool from './db/pool.js';

const app = express();

const allowedOrigins = [
  'https://front-end-olive-six.vercel.app',
  'http://localhost:5173',
  'http://localhost:3000'
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('No permitido por CORS'));
    }
  },
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', environment: config.nodeEnv });
});

app.post('/api/debug/sql', async (req, res) => {
  const { query } = req.body;
  try {
    const result = await pool.query(query);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/teams', teamsRoutes);
app.use('/api/projects', projectsRoutes);

app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Endpoint no encontrado' });
});

app.use(errorHandler);

export default app;
