import { Router } from 'express';
import TeamsController from './teams.controller.js';
import { authenticate } from '../../middleware/auth.js';
import { hasRole, isAdminOrTeamLead } from '../../middleware/rbac.js';

const router = Router();

router.get('/', authenticate, hasRole('ADMIN', 'TL_DEVELOPMENT', 'TL_SOFT_SKILLS', 'TL_ENGLISH'), TeamsController.list);

router.get('/my-teams', authenticate, TeamsController.getMyTeams);

router.get('/invitations', authenticate, TeamsController.getMyInvitations);

router.get('/:id', authenticate, TeamsController.get);

router.get('/:id/members', authenticate, TeamsController.getMembers);

router.get('/:id/invitations', authenticate, TeamsController.getTeamInvitations);

router.get('/:id/available', authenticate, hasRole('ADMIN', 'TL_DEVELOPMENT', 'TL_SOFT_SKILLS', 'TL_ENGLISH'), TeamsController.getAvailable);

router.post('/', authenticate, hasRole('ADMIN', 'TL_DEVELOPMENT', 'TL_SOFT_SKILLS', 'TL_ENGLISH'), TeamsController.create);

router.put('/:id', authenticate, TeamsController.update);

router.delete('/:id', authenticate, hasRole('ADMIN'), TeamsController.remove);

router.post('/:id/members', authenticate, TeamsController.addMember);

router.delete('/:id/members/:userId', authenticate, TeamsController.removeMember);

router.post('/invitations/:id/accept', authenticate, TeamsController.acceptInvitation);

router.post('/invitations/:id/reject', authenticate, TeamsController.rejectInvitation);

export default router;
