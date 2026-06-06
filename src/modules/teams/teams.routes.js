import { Router } from "express";
import TeamsController from "./teams.controller.js";
import { authenticate } from "../../middleware/auth.js";
import { hasRole, isAdminOrTeamLead } from "../../middleware/rbac.js";

const router = Router();

router.get("/", authenticate, TeamsController.list);

router.get("/my-teams", authenticate, TeamsController.getMyTeams);

router.get("/invitations", authenticate, TeamsController.getMyInvitations);

router.get("/search", authenticate, TeamsController.searchProjects);

router.get("/:id", authenticate, TeamsController.get);

router.get("/:id/members", authenticate, TeamsController.getMembers);

router.get(
  "/:id/invitations",
  authenticate,
  TeamsController.getTeamInvitations,
);

router.get(
  "/:id/available",
  authenticate,
  hasRole("ADMIN", "TL_DEVELOPMENT", "TL_SOFT_SKILLS", "TL_ENGLISH", "CODER"),
  TeamsController.getAvailable,
);

router.post(
  "/",
  authenticate,
  hasRole("ADMIN", "TL_DEVELOPMENT", "TL_SOFT_SKILLS", "TL_ENGLISH", "CODER"),
  TeamsController.create,
);

router.put("/:id", authenticate, TeamsController.update);

router.delete("/:id", authenticate, hasRole("ADMIN"), TeamsController.remove);

router.post("/:id/members", authenticate, TeamsController.addMember);

router.delete(
  "/:id/members/:userId",
  authenticate,
  TeamsController.removeMember,
);

router.delete("/:id/leave", authenticate, TeamsController.leaveTeam);

router.post("/:id/repos", authenticate, TeamsController.createAdditionalRepo);
router.get("/:id/repos", authenticate, TeamsController.listAllRepos);
router.delete("/:id/repos/:repoId", authenticate, TeamsController.deleteAdditionalRepo);

router.post(
  "/invitations/:id/accept",
  authenticate,
  TeamsController.acceptInvitation,
);

router.post(
  "/invitations/:id/reject",
  authenticate,
  TeamsController.rejectInvitation,
);

router.post("/:id/request-join", authenticate, TeamsController.requestJoinTeam);

router.get(
  "/join-requests/my",
  authenticate,
  TeamsController.getMyJoinRequests,
);

router.get(
  "/:id/join-requests",
  authenticate,
  TeamsController.getTeamJoinRequests,
);

router.post(
  "/join-requests/:id/accept",
  authenticate,
  TeamsController.acceptJoinRequest,
);

router.post(
  "/join-requests/:id/reject",
  authenticate,
  TeamsController.rejectJoinRequest,
);

router.delete(
  "/join-requests/:id/cancel",
  authenticate,
  TeamsController.cancelJoinRequest,
);

export default router;
