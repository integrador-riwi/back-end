import { Router } from "express";
import RankingController from "./ranking.controller.js";
import { authenticate } from "../../middleware/auth.js";
import { hasRole } from "../../middleware/rbac.js";

const router = Router({ mergeParams: true });

const isAdmin = hasRole("ADMIN");

router.get(
  "/status",
  authenticate,
  isAdmin,
  RankingController.getRankingStatus,
);

router.post(
  "/publish",
  authenticate,
  isAdmin,
  RankingController.publishRanking,
);

router.get("/", authenticate, RankingController.getRanking);

export default router;
