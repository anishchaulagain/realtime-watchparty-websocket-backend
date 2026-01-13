"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupSocket = void 0;
const nameGenerator_1 = require("../utils/nameGenerator");
// In-memory state (should match controller's rooms but keeping separate for now or merge)
// For this simple app, we can just use the same object if we import it, 
// strictly we should use a shared store or Redis.
const roomController_1 = require("../controllers/roomController"); // Shared in-memory store
const users = {}; // socket.id -> username
const socketRoom = {}; // socket.id -> roomId
const setupSocket = (io) => {
    io.on('connection', (socket) => {
        console.log('User connected:', socket.id);
        socket.on('join_room', (roomId) => {
            // Validate room existence
            if (!roomController_1.rooms[roomId]) {
                socket.emit('error', 'Room not found');
                return;
            }
            socket.join(roomId);
            const username = (0, nameGenerator_1.generateRandomName)();
            users[socket.id] = username;
            socketRoom[socket.id] = roomId;
            console.log(`User ${socket.id} (${username}) joined room ${roomId}`);
            // Notify user of their name
            socket.emit('your_name', username);
            // Notify room
            socket.to(roomId).emit('receive_message', {
                type: 'system',
                text: `${username} joined the room`
            });
            // Send current room state to user
            const room = roomController_1.rooms[roomId];
            if (room) {
                socket.emit('sync', {
                    type: 'sa_init',
                    ...room
                });
            }
        });
        socket.on('send_message', (data) => {
            const username = users[socket.id] || 'Unknown';
            io.to(data.roomId).emit('receive_message', {
                type: 'user',
                user: username,
                text: data.text,
                timestamp: Date.now()
            });
        });
        socket.on('update_state', (data) => {
            const { roomId, type, currentTime, isPlaying, playbackRate, videoSource, videoType } = data;
            if (!roomController_1.rooms[roomId])
                return;
            // Update source of truth
            const room = roomController_1.rooms[roomId];
            room.currentTime = currentTime;
            room.isPlaying = isPlaying;
            room.playbackRate = playbackRate || 1;
            room.lastUpdated = Date.now();
            if (videoSource)
                room.videoSource = videoSource;
            if (videoType)
                room.videoType = videoType;
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
        socket.on('time_update', (data) => {
            // We could implement logic here to validate authority, 
            // but fully trust client for MVP.
            // Update room current time roughly
            if (roomController_1.rooms[data.roomId]) {
                roomController_1.rooms[data.roomId].currentTime = data.currentTime;
                roomController_1.rooms[data.roomId].lastUpdated = Date.now();
            }
        });
        socket.on('disconnect', () => {
            const username = users[socket.id];
            const roomId = socketRoom[socket.id];
            if (username && roomId) {
                console.log(`User ${username} disconnected from room ${roomId}`);
                // Notify room
                socket.to(roomId).emit('receive_message', {
                    type: 'system',
                    text: `${username} left the room`
                });
                delete users[socket.id];
                delete socketRoom[socket.id];
                // Auto-destruction logic
                const roomSockets = io.sockets.adapter.rooms.get(roomId);
                if (!roomSockets || roomSockets.size === 0) {
                    // Check if room still exists in store (it should)
                    if (roomController_1.rooms[roomId]) {
                        console.log(`Room ${roomId} is empty. Destroying...`);
                        delete roomController_1.rooms[roomId];
                    }
                }
            }
        });
    });
};
exports.setupSocket = setupSocket;
