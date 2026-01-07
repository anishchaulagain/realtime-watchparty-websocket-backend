import http from 'http';
import { Server } from 'socket.io';
import app from './app';
import { setupSocket } from './socket/socketHandler';
import dotenv from 'dotenv';

dotenv.config();

const PORT = process.env.PORT || 3001;

const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: '*', 
        methods: ['GET', 'POST']
    }
});

// Initialize Socket.IO logic
setupSocket(io);

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
