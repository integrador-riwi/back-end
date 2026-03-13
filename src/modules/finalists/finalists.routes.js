import { Router } from "express";
import FinalistsController from "./finalists.controller.js";
import { authenticate } from "../../middleware/auth.js";
import { hasRole } from "../../middleware/rbac.js";

const router = Router({ mergeParams: true });

const isAdmin = hasRole("ADMIN");

router.get(
  "/public",
  FinalistsController.getPublicFinalists
);

router.get(
  "/",
  authenticate,
  FinalistsController.getFinalists
);

router.post(
  "/auto-select",
  authenticate,
  isAdmin,
  FinalistsController.autoSelectFinalists
);

router.post(
  "/",
  authenticate,
  isAdmin,
  FinalistsController.setFinalists
);

export default router;
