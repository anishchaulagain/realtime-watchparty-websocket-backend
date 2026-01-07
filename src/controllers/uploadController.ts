import { Router, Request, Response } from 'express';
import multer from 'multer';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';
import { Stream } from 'stream';

dotenv.config();

export const uploadRouter = Router();

// R2 (S3) Configuration
const s3 = new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
    },
});

const upload = multer({ storage: multer.memoryStorage() });

// Upload video to R2 (Server-side proxy for MVP)
// Ideally use presigned URLs for client-side upload to avoid server load, 
// but requirements allow local/simple. We stick to server proxy for simplicity 
// or implement presigned URL for upload if requested.
// Let's implement PRESIGNED URL for upload to be "production-ready" and avoid server bottleneck.

uploadRouter.post('/presigned-upload', async (req: Request, res: Response) => {
    try {
        const { filename, fileType } = req.body;
        const fileKey = `${uuidv4()}-${filename}`;

        const command = new PutObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME,
            Key: fileKey,
            ContentType: fileType,
        });

        const url = await getSignedUrl(s3, command, { expiresIn: 3600 });

        res.json({ uploadUrl: url, fileKey });
    } catch (error) {
        console.error('Error generating presigned upload URL:', error);
        res.status(500).json({ error: 'Failed to generate upload URL' });
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
