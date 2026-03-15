import { Router } from "express";
import { getUploadSignature, confirmUpload } from "./upload.controller.js";
import { authenticate } from "../../middleware/auth.js";

const router = Router();

router.use(authenticate);

router.post("/signature", getUploadSignature);
router.post("/confirm",   confirmUpload);

export default router;