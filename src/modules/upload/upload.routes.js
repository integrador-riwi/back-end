import { Router } from "express";
import UploadController from "./upload.controller.js";
import { authenticate } from "../../middleware/auth.js";

const router = Router();

router.post("/signature", authenticate, UploadController.getUploadSignature);
router.post("/confirm", authenticate, UploadController.confirmUpload);

export default router;
