import cloudinary from "../../config/cloudinary.js";

// ─────────────────────────────────────────────────────────────
// POST /api/upload/signature
// ─────────────────────────────────────────────────────────────
export const getUploadSignature = async (req, res, next) => {
    try {
        const folder = req.body.folder ?? "teamup_projects";
        const resource_type = req.body.resource_type ?? "image";

        if (!["image", "video"].includes(resource_type)) {
            return res.status(400).json({
                success: false,
                error: "Invalid resource_type. Use 'image' or 'video'.",
            });
        }

        const timestamp = Math.round(Date.now() / 1000);
        const config = cloudinary.config();

        const signature = cloudinary.utils.api_sign_request(
            { folder, timestamp },
            config.api_secret,
        );

        return res.json({
            success: true,
            data: {
                signature,
                timestamp,
                api_key: config.api_key,
                cloud_name: config.cloud_name,
                folder,
                resource_type,
            },
        });
    } catch (err) {
        next(err);
    }
};

// ─────────────────────────────────────────────────────────────
// POST /api/upload/confirm
// Verifica que el archivo realmente existe en Cloudinary
// ─────────────────────────────────────────────────────────────
export const confirmUpload = async (req, res, next) => {
    try {
        const { public_id, secure_url, resource_type } = req.body;

        if (!public_id || !secure_url) {
            return res.status(400).json({
                success: false,
                error: "Missing public_id or secure_url.",
            });
        }

        await cloudinary.api.resource(public_id, {
            resource_type: resource_type ?? "image",
        });

        return res.json({ success: true, data: { ok: true, secure_url } });
    } catch (err) {
        if (err?.http_code === 404) {
            return res.status(400).json({
                success: false,
                error: "File not found in Cloudinary.",
            });
        }
        next(err);
    }
};