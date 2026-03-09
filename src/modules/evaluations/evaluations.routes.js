import { Router } from "express";
import EvaluationsController from "./evaluations.controller.js";
import { authenticate } from "../../middleware/auth.js";
import { hasRole } from "../../middleware/rbac.js";

const router = Router();

const canEvaluate = hasRole(
  "ADMIN",
  "TL_DEVELOPMENT",
  "TL_SOFT_SKILLS",
  "TL_ENGLISH",
);

// Get rubrics with grade options for an event
router.get(
  "/rubrics/:eventId",
  authenticate,
  canEvaluate,
  EvaluationsController.getRubrics,
);

// Submit (upsert) evaluations for all members of a project
router.post(
  "/project/:projectId",
  authenticate,
  canEvaluate,
  EvaluationsController.submitEvaluations,
);

// Get evaluations already submitted by this TL for a project
router.get(
  "/project/:projectId/my",
  authenticate,
  canEvaluate,
  EvaluationsController.getMyEvaluations,
);

export default router;
