import { Router } from "express";
import UploadController from "./upload.controller.js";
import { authenticate } from "../../middleware/auth.js";

/**
 * @swagger
 * tags:
 *   name: Upload
 *   description: Endpoints para carga de archivos
 */

/**
 * @swagger
 * /api/upload/signature:
 *   post:
 *     summary: Obtener firma para carga de archivos
 *     tags: [Upload]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Firma generada
 */

/**
 * @swagger
 * /api/upload/confirm:
 *   post:
 *     summary: Confirmar carga de archivo
 *     tags: [Upload]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Carga confirmada
 */

const router = Router();

router.post("/signature", authenticate, UploadController.getUploadSignature);
router.post("/confirm", authenticate, UploadController.confirmUpload);

export default router;
