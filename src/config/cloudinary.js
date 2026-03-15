import cloudinary from "cloudinary";

const { v2 } = cloudinary;

// Cloudinary SDK v2 does not accept a URL string directly in .config().
// Supports two configuration methods; individual variables take priority.
const {
    CLOUDINARY_CLOUD_NAME,
    CLOUDINARY_API_KEY,
    CLOUDINARY_API_SECRET,
    CLOUDINARY_URL,
} = process.env;

if (CLOUDINARY_CLOUD_NAME && CLOUDINARY_API_KEY && CLOUDINARY_API_SECRET) {
    v2.config({
        cloud_name: CLOUDINARY_CLOUD_NAME,
        api_key: CLOUDINARY_API_KEY,
        api_secret: CLOUDINARY_API_SECRET,
    });
} else if (CLOUDINARY_URL) {
    // Parse cloudinary://api_key:api_secret@cloud_name
    const match = CLOUDINARY_URL.match(
        /^cloudinary:\/\/([^:]+):([^@]+)@(.+)$/
    );
    if (!match) {
        throw new Error(
            "CLOUDINARY_URL has an invalid format. Expected: cloudinary://api_key:api_secret@cloud_name"
        );
    }
    v2.config({
        api_key: match[1],
        api_secret: match[2],
        cloud_name: match[3],
    });
} else {
    console.warn(
        "⚠️  Cloudinary is not configured. Set CLOUDINARY_URL or CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET in your .env"
    );
}

export default v2;
