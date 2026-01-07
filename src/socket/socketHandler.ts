import { Server, Socket } from 'socket.io';

interface RoomState {
    isPlaying: boolean;
    currentTime: number;
    lastUpdated: number; // Date.now() when the last action happened
    videoSource?: string;
    videoType?: 'url' | 'upload';
    playbackRate: number;
}

// In-memory state (should match controller's rooms but keeping separate for now or merge)
// For this simple app, we can just use the same object if we import it, 
// strictly we should use a shared store or Redis.
import { rooms } from '../controllers/roomController'; // Shared in-memory store

export const setupSocket = (io: Server) => {
    io.on('connection', (socket: Socket) => {
        console.log('User connected:', socket.id);

        socket.on('join_room', (roomId: string) => {
            socket.join(roomId);
            console.log(`User ${socket.id} joined room ${roomId}`);

            // Send current room state to user
            const room = rooms[roomId];
            if (room) {
                socket.emit('sync', {
                    type: 'sa_init',
                    ...room
                });
            }
        });

        socket.on('update_state', (data: { roomId: string, type: string, currentTime: number, isPlaying: boolean, playbackRate: number, videoSource?: string, videoType?: 'url' | 'upload' }) => {
            const { roomId, type, currentTime, isPlaying, playbackRate, videoSource, videoType } = data;

            if (!rooms[roomId]) return;

            // Update source of truth
            const room = rooms[roomId];
            room.currentTime = currentTime;
            room.isPlaying = isPlaying;
            room.playbackRate = playbackRate || 1;
            room.lastUpdated = Date.now();

            if (videoSource) room.videoSource = videoSource;
            if (videoType) room.videoType = videoType;

            // Broadcast to EVERYONE in the room (including sender? usually excluding sender is smoother for them, but for strict sync inclusion is okay. 
            // Better: broadcast.to(room) excludes sender. io.to(room) includes.
            // We want to exclude sender for immediate play/pause to avoid "jitter" where they play -> server -> forces them to seek back slightly.
            // But we must support eventual consistency.

            socket.to(roomId).emit('sync', {
                type,
                currentTime,
                isPlaying,
                playbackRate,
                timestamp: Date.now()
            });
        });

        // Heartbeat for drift correction
        socket.on('time_update', (data: { roomId: string, currentTime: number }) => {
            // We could implement logic here to validate authority, 
            // but fully trust client for MVP.
            // Update room current time roughly
            if (rooms[data.roomId]) {
                rooms[data.roomId].currentTime = data.currentTime;
                rooms[data.roomId].lastUpdated = Date.now();
            }
        });

        socket.on('disconnect', () => {
            console.log('User disconnected:', socket.id);
        });
    });
};
