import { Router } from 'express';
import EventsController from './events.controller.js';
import { authenticate } from '../../middleware/auth.js';
import { hasRole } from '../../middleware/rbac.js';

const router = Router();

router.get('/', authenticate, EventsController.list);

router.get('/upcoming', authenticate, EventsController.getUpcoming);

router.get('/past', authenticate, EventsController.getPast);

router.get('/stats', authenticate, hasRole('ADMIN'), EventsController.getStats);

router.get('/:id', authenticate, EventsController.get);

router.post('/', authenticate, hasRole('ADMIN', 'TL_DEVELOPMENT', 'TL_SOFT_SKILLS', 'TL_ENGLISH'), EventsController.create);

router.put('/:id', authenticate, hasRole('ADMIN', 'TL_DEVELOPMENT', 'TL_SOFT_SKILLS', 'TL_ENGLISH'), EventsController.update);

router.delete('/:id', authenticate, hasRole('ADMIN'), EventsController.remove);

export default router;
