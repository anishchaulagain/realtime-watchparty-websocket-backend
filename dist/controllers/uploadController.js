"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadRouter = void 0;
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const client_s3_1 = require("@aws-sdk/client-s3");
const s3_request_presigner_1 = require("@aws-sdk/s3-request-presigner");
const uuid_1 = require("uuid");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
exports.uploadRouter = (0, express_1.Router)();
// R2 (S3) Configuration
const s3 = new client_s3_1.S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
    },
});
const upload = (0, multer_1.default)({ storage: multer_1.default.memoryStorage() });
// Upload video to R2 (Server-side proxy for MVP)
// Ideally use presigned URLs for client-side upload to avoid server load, 
// but requirements allow local/simple. We stick to server proxy for simplicity 
// or implement presigned URL for upload if requested.
// Let's implement PRESIGNED URL for upload to be "production-ready" and avoid server bottleneck.
exports.uploadRouter.post('/presigned-upload', async (req, res) => {
    try {
        const { filename, fileType } = req.body;
        const fileKey = `${(0, uuid_1.v4)()}-${filename}`;
        const command = new client_s3_1.PutObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME,
            Key: fileKey,
            ContentType: fileType,
        });
        const url = await (0, s3_request_presigner_1.getSignedUrl)(s3, command, { expiresIn: 3600 });
        res.json({ uploadUrl: url, fileKey });
    }
    catch (error) {
        console.error('Error generating presigned upload URL:', error);
        res.status(500).json({ error: 'Failed to generate upload URL' });
    }
});
// Get presigned URL for viewing/streaming
// Public buckets don't need this, but good for private buckets.
exports.uploadRouter.get('/video/:key', async (req, res) => {
    try {
        const { key } = req.params;
        // For R2, if it's a public bucket, we can just return the public URL.
        // If private, we generate a signed URL.
        // Assuming private for "production-ready" feel, or public with custom domain.
        // Let's assume we want to stream via signed URL.
        const command = new client_s3_1.GetObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME,
            Key: key
        });
        const url = await (0, s3_request_presigner_1.getSignedUrl)(s3, command, { expiresIn: 3600 * 24 }); // 24 hours link
        res.json({ url });
    }
    catch (error) {
        console.error("Error generating view URL", error);
        res.status(500).json({ error: 'Failed to generate view URL' });
    }
});
