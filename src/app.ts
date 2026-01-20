import express from 'express';
import cors from 'cors';
import { roomRouter } from './controllers/roomController';
import { uploadRouter } from './controllers/uploadController';

const app = express();

app.use(cors());
app.use(express.json());

// Main Routes
app.use('/api/rooms', roomRouter);
app.use('/api/upload', uploadRouter);

app.get('/health', (req, res) => {
    console.log('heartbeat request');
    res.status(200).json({ status: 'ok' });
});

export default app;
