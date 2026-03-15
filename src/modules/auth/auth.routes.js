import { Router } from "express";
import AuthController from "./auth.controller.js";
import { authenticate, optionalAuth } from "../../middleware/auth.js";
import { hasRole } from "../../middleware/rbac.js";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Endpoints de autenticación y gestión de usuario
 */

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Registrar un nuevo usuario
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               name:
 *                 type: string
 *     responses:
 *       201:
 *         description: Usuario registrado correctamente
 *       400:
 *         description: Error de validación
 */

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Iniciar sesión
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Sesión iniciada correctamente
 *       401:
 *         description: Credenciales inválidas
 */

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Cerrar sesión
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Sesión cerrada correctamente
 */

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     summary: Refrescar token de acceso
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Token refrescado correctamente
 */

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Obtener información del usuario autenticado
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Información del usuario
 *       401:
 *         description: No autenticado
 */

router.get("/", (req, res) => {
  res.json({ message: "Auth API" });
});

router.post("/register", AuthController.register);

router.post("/login", AuthController.login);

router.post("/logout", AuthController.logout);

router.post("/refresh", AuthController.refresh);

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
