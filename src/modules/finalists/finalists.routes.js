import { Router } from 'express';
import FinalistsController from './finalists.controller.js';
import { authenticate } from '../../middleware/auth.js';
import { hasRole } from '../../middleware/rbac.js';

const router = Router({ mergeParams: true });

const isAdmin = hasRole('ADMIN');

// GET /api/finalists/events/:eventId
router.get('/events/:eventId', authenticate, FinalistsController.getFinalists);

// POST /api/finalists/events/:eventId/calculate
// Calculates the top 3 finalists using (score * 0.8) + (votes * 0.2), saves them and closes the event.
// Admin only. Can only be run once per event.
router.post('/events/:eventId/calculate', authenticate, isAdmin, FinalistsController.calculateFinalists);

// POST /api/finalists/events/:eventId/auto-select
// Selects the top N projects from the ranking without factoring in votes.
router.post('/events/:eventId/auto-select', authenticate, isAdmin, FinalistsController.autoSelectFinalists);

// POST /api/finalists/events/:eventId
// Manually sets finalists by providing an array of projectIds.
router.post('/events/:eventId', authenticate, isAdmin, FinalistsController.setFinalists);

export default router;
