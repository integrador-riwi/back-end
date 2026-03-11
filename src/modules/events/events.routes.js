import { Router } from "express";
import EventsController from "./events.controller.js";
import { authenticate } from "../../middleware/auth.js";
import { hasRole } from "../../middleware/rbac.js";

const router = Router();

const isAdmin = hasRole("ADMIN");
const canManage = hasRole(
  "ADMIN",
  "TL_DEVELOPMENT",
  "TL_SOFT_SKILLS",
  "TL_ENGLISH",
);

// ── Events ────────────────────────────────────────────────────────────────────

router.get("/", authenticate, EventsController.list);
router.get("/upcoming", authenticate, EventsController.getUpcoming);
router.get("/active", authenticate, EventsController.getActive);
router.get("/past", authenticate, EventsController.getPast);
router.get("/stats", authenticate, isAdmin, EventsController.getStats);
router.get("/:id", authenticate, EventsController.get);

router.post("/", authenticate, canManage, EventsController.create);
router.put("/:id", authenticate, canManage, EventsController.update);
router.delete("/:id", authenticate, isAdmin, EventsController.remove);

// ── Rubrics (scoped to an event) ─────────────────────────────────────────────

// GET  /api/events/:id/rubrics           — list all rubrics for an event
router.get("/:id/rubrics", authenticate, EventsController.getRubrics);

// POST /api/events/:id/rubrics           — add rubrics to an existing event
router.post(
  "/:id/rubrics",
  authenticate,
  canManage,
  EventsController.addRubrics,
);

// PUT  /api/events/:id/rubrics/:rubricId — update a single rubric
router.put(
  "/:id/rubrics/:rubricId",
  authenticate,
  canManage,
  EventsController.updateRubric,
);

// DELETE /api/events/:id/rubrics/:rubricId — soft-delete a rubric
router.delete(
  "/:id/rubrics/:rubricId",
  authenticate,
  isAdmin,
  EventsController.deleteRubric,
);

// Ranking
import RankingController from "../ranking/ranking.controller.js";

// GET  /api/events/:id/ranking-status
router.get(
  "/:id/ranking-status",
  authenticate,
  isAdmin,
  RankingController.getRankingStatus,
);

// POST /api/events/:id/publish-ranking
router.post(
  "/:id/publish-ranking",
  authenticate,
  isAdmin,
  RankingController.publishRanking,
);

// GET  /api/events/:id/ranking
router.get("/:id/ranking", authenticate, RankingController.getRanking);

export default router;
