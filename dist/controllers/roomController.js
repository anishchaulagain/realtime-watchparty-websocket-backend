"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rooms = exports.roomRouter = void 0;
const express_1 = require("express");
const uuid_1 = require("uuid");
exports.roomRouter = (0, express_1.Router)();
// In-memory room store (replace with Redis later if needed)
exports.rooms = {};
exports.roomRouter.post('/create', (req, res) => {
    const roomId = (0, uuid_1.v4)().substring(0, 8); // Short ID
    exports.rooms[roomId] = {
        id: roomId,
        createdAt: Date.now(),
        videoSource: null,
        isPlaying: false,
        currentTime: 0,
        lastUpdate: Date.now()
    };
    res.json({ roomId });
});
exports.roomRouter.get('/:roomId', (req, res) => {
    const { roomId } = req.params;
    const room = exports.rooms[roomId];
    if (!room) {
        res.status(404).json({ error: 'Room not found' });
        return;
    }
    res.json(room);
});
