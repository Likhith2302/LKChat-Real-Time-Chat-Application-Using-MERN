import Message from '../models/Message.js';
import Chat from '../models/Chat.js';

// @desc    Get messages for a chat
// @route   GET /api/messages/:chatId
// @access  Private
export const getMessages = async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user._id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    // Verify user is participant
    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    const isParticipant = chat.participants.some(
      (p) => p.toString() === userId.toString()
    );

    if (!isParticipant) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const messages = await Message.find({ 
      chatId,
      deletedAt: null, // Don't show deleted messages
      deletedFor: { $ne: userId }, // Don't show messages deleted for this user
    })
      .populate('senderId', 'name email avatarUrl')
      .populate('replyTo', 'content senderId')
      .sort({ createdAt: 1 }) // Oldest first
      .skip(skip)
      .limit(limit);

    const total = await Message.countDocuments({ chatId });

    res.json({
      messages,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Send a message
// @route   POST /api/messages/:chatId
// @access  Private
export const sendMessage = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { content, mediaUrl, messageType, audioDuration } = req.body;
    const userId = req.user._id;

    if (!content && !mediaUrl) {
      return res.status(400).json({ message: 'Please provide content or mediaUrl' });
    }

    // Verify user is participant
    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    const isParticipant = chat.participants.some(
      (p) => p.toString() === userId.toString()
    );

    if (!isParticipant) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Determine message type
    let finalMessageType = messageType || 'text';
    if (mediaUrl) {
      if (!messageType) {
        // Auto-detect from file extension
        const ext = mediaUrl.split('.').pop().toLowerCase();
        if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) {
          finalMessageType = 'image';
        } else {
          finalMessageType = 'file';
        }
      }
    }

    const message = await Message.create({
      chatId,
      senderId: userId,
      content: content || '',
      mediaUrl: mediaUrl || '',
      messageType: finalMessageType,
      status: 'sent', // Will be updated to 'delivered' via socket
      audioDuration: audioDuration || 0,
      readBy: [userId], // Mark as read by sender
    });

    // Update chat's lastMessage and updatedAt
    chat.lastMessage = message._id;
    chat.updatedAt = new Date();
    await chat.save();

    const populatedMessage = await Message.findById(message._id)
      .populate('senderId', 'name email avatarUrl');

    res.status(201).json(populatedMessage);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Add or remove reaction to message
// @route   POST /api/messages/:messageId/react
// @access  Private
export const toggleReaction = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { emoji } = req.body;
    const userId = req.user._id;

    if (!emoji) {
      return res.status(400).json({ message: 'Please provide an emoji' });
    }

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    // Check if user already reacted with this emoji
    const existingReaction = message.reactions.find(
      (r) => r.userId.toString() === userId.toString() && r.emoji === emoji
    );

    if (existingReaction) {
      // Remove reaction
      message.reactions = message.reactions.filter(
        (r) => !(r.userId.toString() === userId.toString() && r.emoji === emoji)
      );
    } else {
      // Add reaction
      message.reactions.push({ userId, emoji });
    }

    await message.save();

    const updatedMessage = await Message.findById(messageId)
      .populate('senderId', 'name email avatarUrl')
      .populate('reactions.userId', 'name');

    res.json(updatedMessage);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Star or unstar a message
// @route   POST /api/messages/:messageId/star
// @access  Private
export const toggleStar = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user._id;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    const isStarred = message.starredBy.some(
      (id) => id.toString() === userId.toString()
    );

    if (isStarred) {
      // Unstar
      message.starredBy = message.starredBy.filter(
        (id) => id.toString() !== userId.toString()
      );
    } else {
      // Star
      if (!message.starredBy.includes(userId)) {
        message.starredBy.push(userId);
      }
    }

    await message.save();

    const updatedMessage = await Message.findById(messageId)
      .populate('senderId', 'name email avatarUrl');

    res.json(updatedMessage);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get all starred messages for current user
// @route   GET /api/messages/starred
// @access  Private
export const getStarredMessages = async (req, res) => {
  try {
    const userId = req.user._id;

    const messages = await Message.find({
      starredBy: userId,
    })
      .populate('senderId', 'name email avatarUrl')
      .populate('chatId', 'name isGroup')
      .sort({ createdAt: -1 });

    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Mark message as read
// @route   PUT /api/messages/:messageId/read
// @access  Private
export const markAsRead = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user._id;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    // Check if user is participant in the chat
    const chat = await Chat.findById(message.chatId);
    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    const isParticipant = chat.participants.some(
      (p) => p.toString() === userId.toString()
    );

    if (!isParticipant) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Add user to readBy if not already there
    if (!message.readBy.some((id) => id.toString() === userId.toString())) {
      message.readBy.push(userId);
    }

    // Update status to 'read' if all participants have read it (for group chats)
    // For private chats, if the other user has read it, mark as 'read'
    const allParticipantsRead = chat.participants.every((participantId) =>
      message.readBy.some((readId) => readId.toString() === participantId.toString())
    );

    if (allParticipantsRead) {
      message.status = 'read';
    } else if (message.readBy.length > 1) {
      // At least one other person has read it
      message.status = 'read';
    }

    await message.save();

    const updatedMessage = await Message.findById(messageId)
      .populate('senderId', 'name email avatarUrl')
      .populate('readBy', 'name');

    res.json(updatedMessage);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Mark all messages in chat as read
// @route   PUT /api/messages/chat/:chatId/read-all
// @access  Private
export const markAllAsRead = async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user._id;

    // Verify user is participant
    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    const isParticipant = chat.participants.some(
      (p) => p.toString() === userId.toString()
    );

    if (!isParticipant) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Mark all unread messages in this chat as read
    const result = await Message.updateMany(
      {
        chatId,
        senderId: { $ne: userId }, // Not sent by current user
        readBy: { $ne: userId }, // Not already read by current user
      },
      {
        $addToSet: { readBy: userId },
        $set: { status: 'read' },
      }
    );

    res.json({
      message: 'Messages marked as read',
      updatedCount: result.modifiedCount,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Reply to a message
// @route   POST /api/messages/:messageId/reply
// @access  Private
export const replyToMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { chatId, content, mediaUrl, messageType, audioDuration } = req.body;
    const userId = req.user._id;

    if (!content && !mediaUrl) {
      return res.status(400).json({ message: 'Please provide content or mediaUrl' });
    }

    // Verify original message exists
    const originalMessage = await Message.findById(messageId);
    if (!originalMessage) {
      return res.status(404).json({ message: 'Original message not found' });
    }

    // Verify user is participant in the chat
    const chat = await Chat.findById(chatId || originalMessage.chatId);
    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    const isParticipant = chat.participants.some(
      (p) => p.toString() === userId.toString()
    );

    if (!isParticipant) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Determine message type
    let finalMessageType = messageType || 'text';
    if (mediaUrl && !messageType) {
      const ext = mediaUrl.split('.').pop().toLowerCase();
      if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) {
        finalMessageType = 'image';
      } else {
        finalMessageType = 'file';
      }
    }

    const replyMessage = await Message.create({
      chatId: chatId || originalMessage.chatId,
      senderId: userId,
      content: content || '',
      mediaUrl: mediaUrl || '',
      messageType: finalMessageType,
      replyTo: messageId,
      status: 'sent',
      audioDuration: audioDuration || 0,
      readBy: [userId],
    });

    // Update chat's lastMessage
    chat.lastMessage = replyMessage._id;
    chat.updatedAt = new Date();
    await chat.save();

    const populatedMessage = await Message.findById(replyMessage._id)
      .populate('senderId', 'name email avatarUrl')
      .populate('replyTo', 'content senderId');

    res.status(201).json(populatedMessage);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Edit a message
// @route   PUT /api/messages/:messageId/edit
// @access  Private
export const editMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { content } = req.body;
    const userId = req.user._id;

    if (!content) {
      return res.status(400).json({ message: 'Please provide content' });
    }

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    // Verify user is the sender
    if (message.senderId.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'You can only edit your own messages' });
    }

    // No time limit for editing messages - removed as requested

    // Check if message is deleted
    if (message.deletedAt) {
      return res.status(400).json({ message: 'Cannot edit deleted message' });
    }

    message.content = content;
    message.editedAt = new Date();
    await message.save();

    const updatedMessage = await Message.findById(messageId)
      .populate('senderId', 'name email avatarUrl')
      .populate('replyTo', 'content senderId');

    res.json(updatedMessage);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Delete a message
// @route   DELETE /api/messages/:messageId
// @access  Private
export const deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { deleteForEveryone } = req.body;
    const userId = req.user._id;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    // Verify user is the sender
    if (message.senderId.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'You can only delete your own messages' });
    }

    // Check if message is already deleted for everyone
    if (message.deletedAt) {
      return res.status(400).json({ 
        message: 'Message is already deleted' 
      });
    }

    // Check if message can be deleted for everyone (within 1 hour)
    const deleteTimeLimit = 60 * 60 * 1000; // 1 hour
    const timeSinceCreation = Date.now() - new Date(message.createdAt).getTime();

    if (deleteForEveryone) {
      if (timeSinceCreation > deleteTimeLimit) {
        return res.status(400).json({ 
          message: 'Message can only be deleted for everyone within 1 hour' 
        });
      }
      // Delete for everyone - mark as deleted
      message.deletedAt = new Date();
      message.content = 'This message was deleted';
      message.mediaUrl = '';
      message.messageType = 'text';
    } else {
      // Delete for me only - add user to deletedFor array
      const isAlreadyDeleted = message.deletedFor.some(
        (id) => id.toString() === userId.toString()
      );
      if (!isAlreadyDeleted) {
        message.deletedFor.push(userId);
      }
    }

    await message.save();

    const updatedMessage = await Message.findById(messageId)
      .populate('senderId', 'name email avatarUrl');

    res.json(updatedMessage);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Search messages
// @route   GET /api/messages/search
// @access  Private
export const searchMessages = async (req, res) => {
  try {
    const { query, chatId } = req.query;
    const userId = req.user._id;

    if (!query || query.trim().length === 0) {
      return res.status(400).json({ message: 'Please provide a search query' });
    }

    let searchFilter = {
      content: { $regex: query, $options: 'i' },
      deletedAt: null, // Don't show deleted messages
      deletedFor: { $ne: userId }, // Don't show messages deleted for this user
    };

    if (chatId) {
      // Search within specific chat
      const chat = await Chat.findById(chatId);
      if (!chat) {
        return res.status(404).json({ message: 'Chat not found' });
      }

      const isParticipant = chat.participants.some(
        (p) => p.toString() === userId.toString()
      );

      if (!isParticipant) {
        return res.status(403).json({ message: 'Not authorized' });
      }

      searchFilter.chatId = chatId;
    } else {
      // Global search - only in chats user is part of
      const userChats = await Chat.find({
        participants: userId,
      });
      const chatIds = userChats.map((chat) => chat._id);
      searchFilter.chatId = { $in: chatIds };
    }

    const messages = await Message.find(searchFilter)
      .populate('senderId', 'name email avatarUrl')
      .populate('chatId', 'name isGroup')
      .populate('replyTo', 'content senderId')
      .sort({ createdAt: -1 })
      .limit(50);

    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Forward a message
// @route   POST /api/messages/:messageId/forward
// @access  Private
export const forwardMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { chatIds } = req.body; // Array of chat IDs to forward to
    const userId = req.user._id;

    if (!chatIds || !Array.isArray(chatIds) || chatIds.length === 0) {
      return res.status(400).json({ message: 'Please provide chat IDs to forward to' });
    }

    const originalMessage = await Message.findById(messageId);
    if (!originalMessage) {
      return res.status(404).json({ message: 'Message not found' });
    }

    // Verify user is participant in all target chats
    const chats = await Chat.find({ _id: { $in: chatIds } });
    if (chats.length !== chatIds.length) {
      return res.status(404).json({ message: 'One or more chats not found' });
    }

    for (const chat of chats) {
      const isParticipant = chat.participants.some(
        (p) => p.toString() === userId.toString()
      );
      if (!isParticipant) {
        return res.status(403).json({ message: 'Not authorized for one or more chats' });
      }
    }

    // Forward message to each chat
    const forwardedMessages = [];
    for (const chatId of chatIds) {
      const forwardedMessage = await Message.create({
        chatId,
        senderId: userId,
        content: originalMessage.content,
        mediaUrl: originalMessage.mediaUrl,
        messageType: originalMessage.messageType,
        forwarded: true,
        forwardedFrom: messageId,
        status: 'sent',
        audioDuration: originalMessage.audioDuration,
        readBy: [userId],
      });

      // Update chat's lastMessage
      const chat = chats.find((c) => c._id.toString() === chatId);
      if (chat) {
        chat.lastMessage = forwardedMessage._id;
        chat.updatedAt = new Date();
        await chat.save();
      }

      const populatedMessage = await Message.findById(forwardedMessage._id)
        .populate('senderId', 'name email avatarUrl')
        .populate('forwardedFrom', 'content senderId');

      forwardedMessages.push(populatedMessage);
    }

    res.status(201).json({ messages: forwardedMessages });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Pin or unpin a message
// @route   PUT /api/messages/:messageId/pin
// @access  Private
export const pinMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user._id;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    // Verify user is participant in the chat
    const chat = await Chat.findById(message.chatId);
    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    const isParticipant = chat.participants.some(
      (p) => p.toString() === userId.toString()
    );

    if (!isParticipant) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Toggle pin status
    message.pinned = !message.pinned;
    if (message.pinned) {
      message.pinnedAt = new Date();
    } else {
      message.pinnedAt = null;
    }

    await message.save();

    const updatedMessage = await Message.findById(messageId)
      .populate('senderId', 'name email avatarUrl')
      .populate('replyTo', 'content senderId');

    res.json(updatedMessage);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get pinned messages for a chat
// @route   GET /api/messages/chat/:chatId/pinned
// @access  Private
export const getPinnedMessages = async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user._id;

    // Verify user is participant
    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    const isParticipant = chat.participants.some(
      (p) => p.toString() === userId.toString()
    );

    if (!isParticipant) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const pinnedMessages = await Message.find({
      chatId,
      pinned: true,
      deletedAt: null,
      deletedFor: { $ne: userId },
    })
      .populate('senderId', 'name email avatarUrl')
      .populate('replyTo', 'content senderId')
      .sort({ pinnedAt: -1 });

    res.json(pinnedMessages);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

