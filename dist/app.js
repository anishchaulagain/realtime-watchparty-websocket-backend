"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const roomController_1 = require("./controllers/roomController");
const uploadController_1 = require("./controllers/uploadController");
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Main Routes
app.use('/api/rooms', roomController_1.roomRouter);
app.use('/api/upload', uploadController_1.uploadRouter);
app.get('/health', (req, res) => {
    console.log('heartbeat request');
    res.status(200).json({ status: 'ok' });
});
exports.default = app;
