import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Message from '../models/Message.js';
import Chat from '../models/Chat.js';

export const initializeSocket = (io) => {
  // Middleware to authenticate socket connections
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.token;
      
      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId);
      
      if (!user) {
        return next(new Error('Authentication error: User not found'));
      }

      socket.userId = user._id.toString();
      socket.user = user;
      next();
    } catch (error) {
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', async (socket) => {
    console.log(`User connected: ${socket.user.name} (${socket.userId})`);

    // Update user online status
    await User.findByIdAndUpdate(socket.userId, {
      isOnline: true,
      lastSeen: new Date(),
    });

    // Emit user online to all clients
    io.emit('user_online', { userId: socket.userId });

    // Join user's personal room for direct notifications
    socket.join(`user_${socket.userId}`);

    // Join all user's chat rooms
    const userChats = await Chat.find({ participants: socket.userId });
    userChats.forEach((chat) => {
      socket.join(`chat_${chat._id}`);
    });

    // Handle joining a chat room
    socket.on('join_room', async (chatId) => {
      // Verify user is participant
      const chat = await Chat.findById(chatId);
      if (chat && chat.participants.some((p) => p.toString() === socket.userId)) {
        socket.join(`chat_${chatId}`);
        console.log(`User ${socket.user.name} joined chat ${chatId}`);
      }
    });

    // Handle leaving a chat room
    socket.on('leave_room', (chatId) => {
      socket.leave(`chat_${chatId}`);
      console.log(`User ${socket.user.name} left chat ${chatId}`);
    });

    // Handle sending a message (already saved via REST API, just broadcast)
    socket.on('send_message', async (data) => {
      const { chatId, messageId } = data;

      // Verify user is participant
      const chat = await Chat.findById(chatId);
      if (!chat || !chat.participants.some((p) => p.toString() === socket.userId)) {
        return;
      }

      // Fetch the message
      const message = await Message.findById(messageId)
        .populate('senderId', 'name email avatarUrl');

      if (message) {
        // Update status to 'delivered' for all recipients
        message.status = 'delivered';
        await message.save();

        // Emit to all users in the chat room except sender
        socket.to(`chat_${chatId}`).emit('receive_message', message);
        
        // Emit status update to sender
        socket.emit('message_status_update', {
          messageId: message._id,
          status: 'delivered',
        });
      }
    });

    // Handle message read receipt
    socket.on('message_read', async (data) => {
      const { messageId, chatId } = data;

      try {
        const message = await Message.findById(messageId);
        if (!message) return;

        // Verify user is participant
        const chat = await Chat.findById(chatId);
        if (!chat || !chat.participants.some((p) => p.toString() === socket.userId)) {
          return;
        }

        // Add user to readBy if not already there
        if (!message.readBy.some((id) => id.toString() === socket.userId)) {
          message.readBy.push(socket.userId);
        }

        // Update status to 'read' if all participants have read it
        const allParticipantsRead = chat.participants.every((participantId) =>
          message.readBy.some((readId) => readId.toString() === participantId.toString())
        );

        if (allParticipantsRead) {
          message.status = 'read';
        } else if (message.readBy.length > 1) {
          message.status = 'read';
        }

        await message.save();

        // Notify sender about read status
        const updatedMessage = await Message.findById(messageId)
          .populate('senderId', 'name email avatarUrl');

        // Emit to chat room
        io.to(`chat_${chatId}`).emit('message_status_update', {
          messageId: message._id,
          status: message.status,
          readBy: message.readBy,
        });
      } catch (error) {
        console.error('Error handling message read:', error);
      }
    });

    // Handle typing indicator
    socket.on('typing', (data) => {
      const { chatId } = data;
      socket.to(`chat_${chatId}`).emit('typing', {
        userId: socket.userId,
        userName: socket.user.name,
        chatId,
      });
    });

    // Handle stop typing
    socket.on('stop_typing', (data) => {
      const { chatId } = data;
      socket.to(`chat_${chatId}`).emit('stop_typing', {
        userId: socket.userId,
        chatId,
      });
    });

    // Handle reaction update
    socket.on('reaction_updated', async (data) => {
      const { messageId, chatId } = data;

      const message = await Message.findById(messageId)
        .populate('senderId', 'name email avatarUrl')
        .populate('reactions.userId', 'name');

      if (message) {
        io.to(`chat_${chatId}`).emit('reaction_updated', message);
      }
    });

    // Handle star update
    socket.on('star_updated', async (data) => {
      const { messageId, chatId } = data;

      const message = await Message.findById(messageId)
        .populate('senderId', 'name email avatarUrl');

      if (message) {
        io.to(`chat_${chatId}`).emit('star_updated', message);
      }
    });

    // Handle message deletion
    socket.on('message_deleted', async (data) => {
      const { messageId, chatId, deleteForEveryone } = data;

      try {
        // Verify user is participant
        const chat = await Chat.findById(chatId);
        if (!chat || !chat.participants.some((p) => p.toString() === socket.userId)) {
          return;
        }

        const message = await Message.findById(messageId)
          .populate('senderId', 'name email avatarUrl');

        if (message) {
          // Broadcast to all participants in the chat
          io.to(`chat_${chatId}`).emit('message_deleted', {
            messageId,
            chatId,
            deleteForEveryone,
            message,
          });
        }
      } catch (error) {
        console.error('Error handling message deletion:', error);
      }
    });

    // Handle call initiation
    socket.on('call_user', (data) => {
      const { userIdToCall, signalData, from, name, callType } = data;
      io.to(`user_${userIdToCall}`).emit('call_received', {
        signal: signalData,
        from: from || socket.userId, // Use the from parameter or fallback to socket userId
        name: name || socket.user.name,
        callType: callType || 'video', // 'video' or 'audio'
      });
    });

    // Handle call acceptance
    socket.on('accept_call', (data) => {
      const { to, signal } = data;
      io.to(`user_${to}`).emit('call_accepted', {
        signal,
        from: socket.userId,
      });
    });

    // Handle call rejection
    socket.on('reject_call', (data) => {
      const { to } = data;
      io.to(`user_${to}`).emit('call_rejected', {
        from: socket.userId,
        name: socket.user.name,
      });
    });

    // Handle call end
    socket.on('end_call', (data) => {
      const { to } = data;
      io.to(`user_${to}`).emit('call_ended', {
        from: socket.userId,
      });
    });

    // Handle ICE candidate exchange
    socket.on('ice_candidate', (data) => {
      const { to, candidate } = data;
      io.to(`user_${to}`).emit('ice_candidate', {
        candidate,
        from: socket.userId,
      });
    });

    // Handle disconnect
    socket.on('disconnect', async () => {
      console.log(`User disconnected: ${socket.user.name} (${socket.userId})`);

      // Notify all users in active calls that this user disconnected
      io.emit('user_disconnected_from_call', { userId: socket.userId });

      // Update user offline status
      await User.findByIdAndUpdate(socket.userId, {
        isOnline: false,
        lastSeen: new Date(),
      });

      // Emit user offline to all clients
      io.emit('user_offline', { userId: socket.userId });
    });
  });
};

