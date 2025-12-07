import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';

import connectDB from './config/db.js';
import { initializeSocket } from './socket/socketHandler.js';

// Routes
import authRoutes from './routes/authRoutes.js';
import chatRoutes from './routes/chatRoutes.js';
import messageRoutes from './routes/messageRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';
import userRoutes from './routes/userRoutes.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);

// Initialize Socket.IO
// Allow all origins in development for network access
const io = new Server(httpServer, {
  cors: {
    origin: true, // Allow all origins in development (for network access)
    credentials: true,
    methods: ['GET', 'POST'],
  },
});

// Initialize socket handler
initializeSocket(io);

// Make io available globally for avatar updates
global.io = io;

// Connect to MongoDB
connectDB();

// Middleware
// Allow all origins in development for easier testing
app.use(cors({
  origin: true, // Allow all origins in development
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/users', userRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'LKChat API is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!', error: err.message });
});

const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0'; // Listen on all network interfaces

httpServer.listen(PORT, HOST, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`\n✅ Backend accessible at:`);
  console.log(`   - Local: http://localhost:${PORT}`);
  console.log(`   - Network: http://0.0.0.0:${PORT}`);
  console.log(`\n💡 To access from other devices, use your local IP address`);
});

