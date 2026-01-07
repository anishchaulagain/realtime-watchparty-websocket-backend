import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

export const roomRouter = Router();

// In-memory room store (replace with Redis later if needed)
export const rooms: Record<string, any> = {};

roomRouter.post('/create', (req: Request, res: Response) => {
    const roomId = uuidv4().substring(0, 8); // Short ID
    rooms[roomId] = {
        id: roomId,
        createdAt: Date.now(),
        videoSource: null,
        isPlaying: false,
        currentTime: 0,
        lastUpdate: Date.now()
    };
    res.json({ roomId });
});

roomRouter.get('/:roomId', (req: Request, res: Response) => {
    const { roomId } = req.params;
    const room = rooms[roomId];
    if (!room) {
        res.status(404).json({ error: 'Room not found' });
        return;
    }
    res.json(room);
});
