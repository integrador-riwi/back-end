import { Router } from "express";
import ProjectsController from "./projects.controller.js";
import { authenticate } from "../../middleware/auth.js";
import { hasRole } from "../../middleware/rbac.js";

const router = Router();

router.get(
    "/",
    authenticate,
    hasRole("ADMIN", "CODER"),
    ProjectsController.list,
);

// Semantic search over project descriptions. Admin only.
// GET /api/projects/search?q=<text>&limit=<n>
router.get(
    "/search",
    authenticate,
    hasRole("ADMIN"),
    ProjectsController.semanticSearch,
);

router.get("/team/:id", authenticate, ProjectsController.getByTeam);

router.get("/:id", authenticate, ProjectsController.get);

router.post("/", authenticate, ProjectsController.create);

router.post("/team/:id/confirm", authenticate, ProjectsController.confirmTeam);

router.put("/:id", authenticate, ProjectsController.update);

router.put(
    "/:id/deliverables",
    authenticate,
    ProjectsController.updateDeliverables,
);

router.post("/:id/submit", authenticate, ProjectsController.submitProject);

export default router;
