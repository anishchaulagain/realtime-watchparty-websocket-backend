import { Router, Request, Response } from 'express';
import multer from 'multer';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';
import { Stream } from 'stream';

dotenv.config();

export const uploadRouter = Router();

const requiredEnvVars = ['R2_ENDPOINT', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET_NAME'];
for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
        console.warn(`WARNING: Missing required environment variable: ${envVar}`);
    }
}

const s3 = new S3Client({
    region: 'auto',
    endpoint: process.env.R2_ENDPOINT,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
    },
});

const upload = multer({ storage: multer.memoryStorage() });


uploadRouter.post('/presigned-upload', async (req: Request, res: Response) => {
    try {
        const { filename, fileType } = req.body;
        const fileKey = `${uuidv4()}-${filename}`;

        // console.log('--- Presigned Upload Debug ---');
        // console.log('R2_ENDPOINT:', process.env.R2_ENDPOINT);
        // console.log('R2_BUCKET_NAME:', process.env.R2_BUCKET_NAME);
        // console.log('File Key:', fileKey);

        const command = new PutObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME,
            Key: fileKey,
            ContentType: fileType,
        });

        const url = await getSignedUrl(s3, command, { expiresIn: 3600 });

        // console.log('Generated Presigned URL:', url.substring(0, 100) + '...');
        // console.log('--- End Debug ---');

        res.json({ uploadUrl: url, fileKey });
    } catch (error) {
        console.error('Error generating presigned upload URL:', error);
        res.status(500).json({ error: 'Failed to generate upload URL' });
    }
});

// Server-side proxy upload - bypasses CORS by uploading through the backend
uploadRouter.post('/proxy-upload', upload.single('video'), async (req: Request, res: Response) => {
    try {
        if (!req.file) {
            res.status(400).json({ error: 'No file provided' });
            return;
        }

        const file = req.file;
        const fileKey = `${uuidv4()}-${file.originalname}`;

        console.log('--- Proxy Upload ---');
        console.log('File:', file.originalname, 'Size:', file.size, 'bytes');

        const command = new PutObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME,
            Key: fileKey,
            Body: file.buffer,
            ContentType: file.mimetype,
        });

        await s3.send(command);

        // console.log('Upload successful! File key:', fileKey);

        // Generate view URL
        const getCommand = new GetObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME,
            Key: fileKey
        });
        const viewUrl = await getSignedUrl(s3, getCommand, { expiresIn: 3600 * 24 });

        res.json({ fileKey, url: viewUrl });
    } catch (error) {
        console.error('Proxy upload error:', error);
        res.status(500).json({ error: 'Failed to upload file' });
    }
});

// Get presigned URL for viewing/streaming
// Public buckets don't need this, but good for private buckets.
uploadRouter.get('/video/:key', async (req: Request, res: Response) => {
    try {
        const { key } = req.params;

        // For R2, if it's a public bucket, we can just return the public URL.
        // If private, we generate a signed URL.
        // Assuming private for "production-ready" feel, or public with custom domain.
        // Let's assume we want to stream via signed URL.

        const command = new GetObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME,
            Key: key
        });

        const url = await getSignedUrl(s3, command, { expiresIn: 3600 * 24 }); // 24 hours link

        res.json({ url });
    } catch (error) {
        console.error("Error generating view URL", error);
        res.status(500).json({ error: 'Failed to generate view URL' });
    }
});
