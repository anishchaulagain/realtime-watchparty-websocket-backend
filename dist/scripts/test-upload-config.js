"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_s3_1 = require("@aws-sdk/client-s3");
const s3_request_presigner_1 = require("@aws-sdk/s3-request-presigner");
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
// Load .env from backend root
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, '../../.env') });
async function testR2Connection() {
    console.log('--- R2 Configuration Check ---');
    console.log(`R2_ENDPOINT: ${process.env.R2_ENDPOINT ? 'SET' : 'MISSING'}`);
    console.log(`R2_ACCESS_KEY_ID: ${process.env.R2_ACCESS_KEY_ID ? 'SET' : 'MISSING'}`);
    console.log(`R2_SECRET_ACCESS_KEY: ${process.env.R2_SECRET_ACCESS_KEY ? 'SET' : 'MISSING'}`);
    console.log(`R2_BUCKET_NAME: ${process.env.R2_BUCKET_NAME ? 'SET' : 'MISSING'}`);
    if (!process.env.R2_ENDPOINT || !process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY || !process.env.R2_BUCKET_NAME) {
        console.error('ERROR: Missing required environment variables.');
        return;
    }
    const s3 = new client_s3_1.S3Client({
        region: 'auto',
        endpoint: process.env.R2_ENDPOINT,
        credentials: {
            accessKeyId: process.env.R2_ACCESS_KEY_ID,
            secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
        },
    });
    try {
        console.log('\n--- Testing Connectivity (ListBuckets) ---');
        const listRes = await s3.send(new client_s3_1.ListBucketsCommand({}));
        console.log('Success! Connected to R2.');
        console.log('Buckets:', listRes.Buckets?.map(b => b.Name).join(', '));
        const bucketExists = listRes.Buckets?.some(b => b.Name === process.env.R2_BUCKET_NAME);
        if (!bucketExists) {
            console.error(`ERROR: Configured bucket '${process.env.R2_BUCKET_NAME}' not found in account.`);
        }
        else {
            console.log(`Verified bucket '${process.env.R2_BUCKET_NAME}' exists.`);
        }
        console.log('\n--- Testing Presigned URL Generation ---');
        const command = new client_s3_1.PutObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME,
            Key: 'test-upload-config.txt',
            ContentType: 'text/plain',
        });
        const url = await (0, s3_request_presigner_1.getSignedUrl)(s3, command, { expiresIn: 60 });
        console.log('Success! Generated presigned URL.');
        console.log('URL Preview:', url.substring(0, 50) + '...');
    }
    catch (error) {
        console.error('FAILED to connect to R2:', error);
    }
}
testR2Connection();
