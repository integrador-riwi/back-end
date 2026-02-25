import { Router } from 'express';
import ProjectsController from './projects.controller.js';
import { authenticate } from '../../middleware/auth.js';
import { hasRole } from '../../middleware/rbac.js';

const router = Router();

router.get('/', authenticate, hasRole('ADMIN', 'CODER'), ProjectsController.list);

router.get('/team/:id', authenticate, ProjectsController.getByTeam);

router.get('/:id', authenticate, ProjectsController.get);

router.post('/', authenticate, ProjectsController.create);

router.post('/team/:id/confirm', authenticate, ProjectsController.confirmTeam);

router.put('/:id', authenticate, ProjectsController.update);

router.put('/:id/deliverables', authenticate, ProjectsController.updateDeliverables);

export default router;
