# LKChat - Real-Time Messenger Application

A modern, full-featured real-time chat application built with the MERN stack (MongoDB, Express, React, Node.js) and WebSockets (Socket.IO). LKChat combines the best features of WhatsApp and Slack with unique customizations like per-chat accent colors, custom backgrounds, message reactions, and starred messages.

---

## 🚀 Features

### Core Features
- ✅ Real-Time Messaging with Socket.IO
- ✅ Private Chats (1-on-1 conversations)
- ✅ Group Chats (multi-participant rooms)
- ✅ Media Sharing (images, files, PDFs, voice messages)
- ✅ Message Reactions, Starred Messages, Reply, Edit, Delete, Forward, Pin
- ✅ Read Receipts (sent/delivered/read status)
- ✅ Typing Indicators
- ✅ Online/Offline Status

### Chat Management
- ✅ Archive/Unarchive Chats
- ✅ Mute/Unmute Chats
- ✅ Per-Chat Accent Colors
- ✅ Custom Chat Backgrounds (preset gradients or custom images)
- ✅ Starred Chats
- ✅ Group Management (add/remove participants, change name/avatar)

### User Features
- ✅ User Profiles with Avatar Creator
- ✅ Contact Info (shared media, common groups)
- ✅ Theme System (Light/Dark/System)

### Security
- ✅ JWT Authentication
- ✅ Password Reset via Email
- ✅ Secure httpOnly Cookies

---

## 🛠 Tech Stack

### Backend
- **Node.js** 20.x
- **Express.js** 4.18.2
- **MongoDB** (Mongoose 8.0.3)
- **Socket.IO** 4.6.1
- **JWT** 9.0.2
- **bcryptjs** 2.4.3
- **Multer** 1.4.5 (File uploads)
- **Nodemailer** 7.0.11 (Email service)

### Frontend
- **React** 18.2.0
- **React Router** 6.20.1
- **Vite** 5.0.8
- **Socket.IO Client** 4.6.1
- **Axios** 1.6.2
- **date-fns** 2.30.0

---

## 📦 Version Details

- **Node.js**: 20.x or higher (Required)
- **npm**: Comes with Node.js
- **Backend Version**: 1.0.0
- **Frontend Version**: 1.0.0

---

## 🔧 Prerequisites

Before starting, make sure you have:

1. **Node.js** (v20.x or higher)
   - Download: https://nodejs.org/
   - Verify: `node --version`

2. **MongoDB** (Cloud or Local)
   - MongoDB Atlas (Free): https://www.mongodb.com/cloud/atlas
   - Or install MongoDB locally

3. **Code Editor** (VS Code recommended)

---

## 🚦 Local Setup Instructions

### Step 1: Download/Clone Project

```bash
# Navigate to project folder
cd LKChat1
```

### Step 2: Install Backend Dependencies

```bash
cd backend
npm install
```

**This installs:** Express, MongoDB, Socket.IO, JWT, and other backend packages.

### Step 3: Install Frontend Dependencies

```bash
cd frontend
npm install
```

**This installs:** React, Vite, Socket.IO Client, and other frontend packages.

### Step 4: Configure Environment Variables

#### Backend Configuration

Create `backend/.env` file:

```env
MONGO_URI=mongodb+srv://LKChat:LKChat2823@lkchat.0lvfuvu.mongodb.net/?appName=LKChat
PORT=5000
JWT_SECRET=lkchat_super_secret_jwt_key_2024_production_ready
CLIENT_URL=http://localhost:5173
FRONTEND_URL=http://localhost:5173

# Email (for password reset - optional)
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_FROM="LKChat" <your-email@gmail.com>
```

**Note:** The MongoDB connection string is already configured. You can use it as-is or replace with your own MongoDB Atlas connection string.

#### Frontend Configuration

Create `frontend/.env` file:

```env
VITE_API_BASE_URL=http://localhost:5000
```

### Step 5: Start Backend Server

```bash
cd backend
npm run dev
```

**Expected Output:**
```
Server running on port 5000
MongoDB Connected
Socket.IO server initialized
```

Backend runs on: **http://localhost:5000**

### Step 6: Start Frontend Server

Open a **new terminal window**:

```bash
cd frontend
npm run dev
```

**Expected Output:**
```
VITE v5.0.8  ready in 500 ms
➜  Local:   http://localhost:5173/
```

Frontend runs on: **http://localhost:5173**

### Step 7: Open Application

1. Open browser
2. Go to: **http://localhost:5173**
3. You should see the LKChat login page

---

## 🔄 How the Application Works

### Simple Flow Overview

```
User → Browser (React Frontend)
         ↓
    HTTP Requests & WebSocket
         ↓
Express Server (Backend)
         ↓
    Database Queries
         ↓
    MongoDB Database
```

### Step-by-Step Flow

#### 1. **User Registration/Login**
- User enters email and password
- Backend validates and creates account
- JWT token is generated and stored securely
- User is redirected to chat interface

#### 2. **Sending a Message**
- User types message and clicks Send
- Frontend sends message to backend API
- Backend saves message to MongoDB
- Backend broadcasts message via Socket.IO to all users in the chat
- All connected users receive the message instantly

#### 3. **Real-Time Updates**
- When user connects, Socket.IO establishes WebSocket connection
- User joins their personal room and all chat rooms
- Any new messages, typing indicators, or status updates are sent instantly
- UI updates automatically without page refresh

#### 4. **Creating a Chat**
- User clicks "New Chat" button
- Selects "Private Chat" or "Group Chat"
- For Private: Select another user
- For Group: Enter name and select participants
- Backend creates chat in database
- Chat appears in sidebar immediately

#### 5. **File Upload**
- User selects file (image/document/audio)
- File is uploaded to backend
- Backend saves file and returns file URL
- Message is sent with file URL
- File appears in chat with preview

## 🗄️ Database

### MongoDB Connection
```
mongodb+srv://LKChat:LKChat2823@lkchat.0lvfuvu.mongodb.net/?appName=LKChat
```

### Collections
- **Users**: User accounts, profiles, authentication
- **Chats**: Chat rooms, participants, settings
- **Messages**: All messages, reactions, status

---

## 🐛 Troubleshooting

### Backend won't start
- Check if port 5000 is available
- Verify MongoDB connection string in `.env`
- Ensure all dependencies are installed: `npm install`

### Frontend won't start
- Check if port 5173 is available
- Verify `VITE_API_BASE_URL` in `.env` matches backend URL
- Ensure all dependencies are installed: `npm install`

### Can't connect to MongoDB
- Verify `MONGO_URI` in `backend/.env` is correct
- If using MongoDB Atlas, check IP whitelist settings
- Ensure internet connection is active

### Messages not appearing in real-time
- Check if both backend and frontend servers are running
- Verify Socket.IO connection in browser console
- Check `VITE_API_BASE_URL` matches backend URL

### File upload fails
- Check file size (max 10MB)
- Verify `backend/uploads/` folder exists
- Check file type is allowed (images, PDFs, documents)

---

## 📝 Quick Start Summary

1. **Install dependencies:**
   ```bash
   cd backend && npm install
   cd ../frontend && npm install
   ```

2. **Create `.env` files:**
   - `backend/.env` with MongoDB URI and JWT secret
   - `frontend/.env` with API URL

3. **Start servers:**
   ```bash
   # Terminal 1
   cd backend && npm run dev
   
   # Terminal 2
   cd frontend && npm run dev
   ```

4. **Open browser:** http://localhost:5173

---

## 📄 License

This project is open source and available for educational purposes.

---

## 👨‍💻 Author

**LKChat Development Team**

Built with ❤️ using the MERN stack

---

**Version:** 1.0.0  
**Status:** ✅ Production Ready  
**Total Features:** 25 major features

**Happy Chatting! 💬**
