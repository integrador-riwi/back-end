import { Router } from "express";
import AuthController from "./auth.controller.js";
import { authenticate, optionalAuth } from "../../middleware/auth.js";
import { hasRole } from "../../middleware/rbac.js";

const router = Router();

router.get("/", (req, res) => {
  res.json({ message: "Auth API" });
});

router.post("/register", AuthController.register);

router.post("/login", AuthController.login);

router.post("/logout", AuthController.logout);

router.post("/refresh", AuthController.refresh);

// Password recovery (public – no auth required)
router.post("/forgot-password", AuthController.forgotPassword);
router.post("/reset-password",  AuthController.resetPassword);

router.get("/me", authenticate, AuthController.getMe);

router.put("/password", authenticate, AuthController.changePassword);

router.put("/profile", authenticate, AuthController.updateProfile);

router.get("/github", authenticate, AuthController.githubAuth);

router.get("/github/url", authenticate, AuthController.githubAuthUrl);

router.get("/github/callback", AuthController.githubCallback);

router.get("/github/status", authenticate, AuthController.getGithubStatus);
router.get("/github/orgs", authenticate, AuthController.getGithubOrgs);

router.delete("/github", authenticate, AuthController.disconnectGithub);

export default router;
