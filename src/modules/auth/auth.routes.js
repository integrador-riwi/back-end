import { Router } from 'express';
import AuthController from './auth.controller.js';
import { authenticate } from '../../middleware/auth.js';
import { hasRole } from '../../middleware/rbac.js';

const router = Router();

router.get('/', (req, res) => {
  res.json({ message: 'Auth API' });
});

router.post('/register', AuthController.register);

router.post('/login', AuthController.login);

router.post('/logout', AuthController.logout);

router.post('/refresh', AuthController.refresh);

router.get('/me', authenticate, AuthController.getMe);

router.put('/password', authenticate, AuthController.changePassword);

router.put('/profile', authenticate, AuthController.updateProfile);

export default router;
