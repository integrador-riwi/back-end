import cloudinary from "../../config/cloudinary.js";
import { ValidationError, NotFoundError } from "../../middleware/errorHandler.js";

const ALLOWED_RESOURCE_TYPES = ["image", "video"];
const DEFAULT_FOLDER = "teamup_projects";

// ─────────────────────────────────────────────────────────────
// Generates a signature so the client can upload directly to
// Cloudinary without exposing the api_secret.
// ─────────────────────────────────────────────────────────────
export const generateSignature = ({ folder, resource_type }) => {
    const resolvedFolder = folder ?? DEFAULT_FOLDER;
    const resolvedType = resource_type ?? "image";

    if (!ALLOWED_RESOURCE_TYPES.includes(resolvedType)) {
        throw new ValidationError(
            `Invalid resource_type. Allowed values: ${ALLOWED_RESOURCE_TYPES.join(", ")}.`
        );
    }

    const timestamp = Math.round(Date.now() / 1000);
    const cfg = cloudinary.config();

    if (!cfg.api_secret) {
        throw new Error(
            "Cloudinary is not configured correctly. Check your environment variables."
        );
    }

    const signature = cloudinary.utils.api_sign_request(
        { folder: resolvedFolder, timestamp },
        cfg.api_secret
    );

    return {
        signature,
        timestamp,
        api_key: cfg.api_key,
        cloud_name: cfg.cloud_name,
        folder: resolvedFolder,
        resource_type: resolvedType,
    };
};

// ─────────────────────────────────────────────────────────────
// Verifies that a file actually exists in Cloudinary
// after the client has uploaded it directly.
// ─────────────────────────────────────────────────────────────
export const verifyUpload = async ({ public_id, secure_url, resource_type }) => {
    if (!public_id || !secure_url) {
        throw new ValidationError("public_id and secure_url are required.");
    }

    const resolvedType = resource_type ?? "image";

    if (!ALLOWED_RESOURCE_TYPES.includes(resolvedType)) {
        throw new ValidationError(
            `Invalid resource_type. Allowed values: ${ALLOWED_RESOURCE_TYPES.join(", ")}.`
        );
    }

    try {
        await cloudinary.api.resource(public_id, { resource_type: resolvedType });
    } catch (err) {
        if (err?.http_code === 404) {
            throw new NotFoundError(
                "File not found in Cloudinary. Check the public_id provided."
            );
        }
        throw err;
    }

    return { ok: true, secure_url };
};

export default {
    generateSignature,
    verifyUpload,
};
