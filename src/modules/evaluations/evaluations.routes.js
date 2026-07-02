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
    "/project/:projectId/my/summary",
    authenticate,
    canEvaluate,
    EvaluationsController.getMyEvaluationSummary,
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

router.get(
    "/event/:eventId/grade-audit",
    authenticate,
    hasRole("ADMIN"),
    EvaluationsController.getGradeAuditByEvent,
);

router.post(
    "/event/:eventId/recalculate-existing-results",
    authenticate,
    hasRole("ADMIN"),
    EvaluationsController.recalculateExistingEventResults,
);

// GET /api/evaluations/event/:eventId/coverage
// Any TL or ADMIN can check coverage before the admin closes.
router.get(
    "/event/:eventId/coverage",
    authenticate,
    hasRole("ADMIN", "TL_DEVELOPMENT", "TL_SOFT_SKILLS", "TL_ENGLISH"),
    EvaluationsController.getEventEvalCoverage,
);

// POST /api/evaluations/event/:eventId/close  — ADMIN only
router.post(
    "/event/:eventId/close",
    authenticate,
    hasRole("ADMIN"),
    EvaluationsController.closeEvaluations,
);

// POST /api/evaluations/event/:eventId/reopen  — ADMIN only
router.post(
    "/event/:eventId/reopen",
    authenticate,
    hasRole("ADMIN"),
    EvaluationsController.reopenEvaluations,
);

// GET /api/evaluations/project/:projectId/eval-status
// TL calls this on page load to know if they can still grade.
router.get(
    "/project/:projectId/eval-status",
    authenticate,
    canEvaluate,
    EvaluationsController.getProjectEvalStatus,
);

// GET /api/evaluations/event/:eventId/team-eval-counts
router.get(
    "/event/:eventId/team-eval-counts",
    authenticate,
    hasRole("ADMIN", "TL_DEVELOPMENT", "TL_SOFT_SKILLS", "TL_ENGLISH"),
    EvaluationsController.getTeamEvalCounts,
);

export default router;
