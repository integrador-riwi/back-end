import UploadService from "./upload.service.js";
import { success } from "../../utils/response.js";
import { asyncHandler } from "../../middleware/errorHandler.js";

// POST /api/upload/signature
// Returns the data needed for the client to upload directly
// to Cloudinary (signature, timestamp, api_key, etc.)
export const getUploadSignature = asyncHandler(async (req, res) => {
    const { folder, resource_type } = req.body;
    const data = UploadService.generateSignature({ folder, resource_type });
    return success(res, data);
});

// POST /api/upload/confirm
// Verifies that the file actually exists in Cloudinary
// after the client has uploaded it directly.
export const confirmUpload = asyncHandler(async (req, res) => {
    const { public_id, secure_url, resource_type } = req.body;
    const data = await UploadService.verifyUpload({ public_id, secure_url, resource_type });
    return success(res, data);
});

export default {
    getUploadSignature,
    confirmUpload,
};
