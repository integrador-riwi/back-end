import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { hasRole, isAdminOrTeamLead } from '../../middleware/rbac.js';
import * as usersController from './users.controller.js';

const router = Router();

router.get('/me', authenticate, usersController.getMe);

router.get('/available', authenticate, hasRole('CODER', 'ADMIN', 'TL_DEVELOPMENT', 'TL_SOFT_SKILLS', 'TL_ENGLISH'), usersController.getAvailable);

router.get('/stats', authenticate, hasRole('ADMIN'), usersController.getStats);

router.get('/', authenticate, hasRole('ADMIN'), usersController.list);

router.get('/:id', authenticate, hasRole('ADMIN'), usersController.get);

router.post('/', authenticate, hasRole('ADMIN'), usersController.create);

router.put('/:id', authenticate, hasRole('ADMIN'), usersController.update);



router.put('/:id/password', authenticate, hasRole('ADMIN'), usersController.updatePassword);

router.put('/:id/status', authenticate, hasRole('ADMIN'), usersController.toggleStatus);

export default router;
