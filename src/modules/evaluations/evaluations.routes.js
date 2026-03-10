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

router.get(
  "/rubrics/:eventId",
  authenticate,
  canEvaluate,
  EvaluationsController.getRubrics,
);

router.post(
  "/project/:projectId",
  authenticate,
  canEvaluate,
  EvaluationsController.submitEvaluations,
);

router.get(
  "/project/:projectId/my",
  authenticate,
  canEvaluate,
  EvaluationsController.getMyEvaluations,
);

router.post(
  "/project/:projectId/calculate",
  authenticate,
  canEvaluate,
  EvaluationsController.calculateGrades,
);

router.get(
  "/project/:projectId/results",
  authenticate,
  canEvaluate,
  EvaluationsController.getProjectResults,
);

router.get(
  "/event/:eventId/results",
  authenticate,
  hasRole("ADMIN", "TL_DEVELOPMENT", "TL_SOFT_SKILLS", "TL_ENGLISH"),
  EvaluationsController.getEventResults,
);

export default router;
