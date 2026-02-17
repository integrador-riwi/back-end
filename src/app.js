import express from 'express';
import cookieParser from 'cookie-parser';
import authRoutes from './modules/auth/auth.routes.js';
import usersRoutes from './modules/users/users.routes.js';
import { errorHandler } from './middleware/errorHandler.js';
import config from './config/env.js';

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', environment: config.nodeEnv });
});

app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);

app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Endpoint no encontrado' });
});

app.use(errorHandler);

export default app;
