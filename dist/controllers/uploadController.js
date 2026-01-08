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
const requiredEnvVars = ['R2_ENDPOINT', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET_NAME'];
for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
        console.warn(`WARNING: Missing required environment variable: ${envVar}`);
    }
}
const s3 = new client_s3_1.S3Client({
    region: 'auto',
    endpoint: process.env.R2_ENDPOINT,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
    },
});
const upload = (0, multer_1.default)({ storage: multer_1.default.memoryStorage() });
exports.uploadRouter.post('/presigned-upload', async (req, res) => {
    try {
        const { filename, fileType } = req.body;
        const fileKey = `${(0, uuid_1.v4)()}-${filename}`;
        // console.log('--- Presigned Upload Debug ---');
        // console.log('R2_ENDPOINT:', process.env.R2_ENDPOINT);
        // console.log('R2_BUCKET_NAME:', process.env.R2_BUCKET_NAME);
        // console.log('File Key:', fileKey);
        const command = new client_s3_1.PutObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME,
            Key: fileKey,
            ContentType: fileType,
        });
        const url = await (0, s3_request_presigner_1.getSignedUrl)(s3, command, { expiresIn: 3600 });
        // console.log('Generated Presigned URL:', url.substring(0, 100) + '...');
        // console.log('--- End Debug ---');
        res.json({ uploadUrl: url, fileKey });
    }
    catch (error) {
        console.error('Error generating presigned upload URL:', error);
        res.status(500).json({ error: 'Failed to generate upload URL' });
    }
});
// Server-side proxy upload - bypasses CORS by uploading through the backend
exports.uploadRouter.post('/proxy-upload', upload.single('video'), async (req, res) => {
    try {
        if (!req.file) {
            res.status(400).json({ error: 'No file provided' });
            return;
        }
        const file = req.file;
        const fileKey = `${(0, uuid_1.v4)()}-${file.originalname}`;
        console.log('--- Proxy Upload ---');
        console.log('File:', file.originalname, 'Size:', file.size, 'bytes');
        const command = new client_s3_1.PutObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME,
            Key: fileKey,
            Body: file.buffer,
            ContentType: file.mimetype,
        });
        await s3.send(command);
        // console.log('Upload successful! File key:', fileKey);
        // Generate view URL
        const getCommand = new client_s3_1.GetObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME,
            Key: fileKey
        });
        const viewUrl = await (0, s3_request_presigner_1.getSignedUrl)(s3, getCommand, { expiresIn: 3600 * 24 });
        res.json({ fileKey, url: viewUrl });
    }
    catch (error) {
        console.error('Proxy upload error:', error);
        res.status(500).json({ error: 'Failed to upload file' });
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
