import Chat from '../models/Chat.js';
import Message from '../models/Message.js';
import User from '../models/User.js';

// @desc    Get all chats for current user
// @route   GET /api/chats
// @access  Private
export const getChats = async (req, res) => {
  try {
    const userId = req.user._id;
    const { archived } = req.query; // Optional: ?archived=true to get archived chats

    const filter = {
      participants: userId,
    };

    // Filter archived chats based on query parameter
    if (archived === 'true') {
      filter.archivedBy = userId;
    } else {
      filter.archivedBy = { $ne: userId };
    }

    const chats = await Chat.find(filter)
      .populate('participants', 'name email avatarUrl isOnline lastSeen')
      .populate('lastMessage')
      .sort({ updatedAt: -1 });

    // Format chats with chat name and other user info for private chats
    const formattedChats = chats.map((chat) => {
      const chatObj = chat.toObject();
      
      if (!chat.isGroup) {
        // For private chats, find the other participant
        const otherUser = chat.participants.find(
          (p) => p._id.toString() !== userId.toString()
        );
        chatObj.chatName = otherUser ? otherUser.name : 'Unknown';
        chatObj.otherUser = otherUser;
      } else {
        chatObj.chatName = chat.name;
        chatObj.groupAvatarUrl = chat.groupAvatarUrl || '';
      }

      // Get custom color for this user
      chatObj.customColor = chat.customColorPerUser?.get(userId.toString()) || '#0084ff';

      // Get custom background for this user
      chatObj.customBackground = chat.backgroundPerUser?.get(userId.toString()) || null;

      // Get archive status for this user
      chatObj.isArchived = chat.archivedBy?.some(
        (id) => id.toString() === userId.toString()
      ) || false;
      chatObj.archivedAt = chat.archivedAtPerUser?.get(userId.toString()) || null;

      // Get mute status for this user
      chatObj.isMuted = chat.mutedBy?.some(
        (id) => id.toString() === userId.toString()
      ) || false;
      const mutedUntil = chat.mutedUntilPerUser?.get(userId.toString());
      chatObj.mutedUntil = mutedUntil || null;
      
      // Check if mute has expired
      if (chatObj.mutedUntil && new Date(chatObj.mutedUntil) < new Date()) {
        chatObj.isMuted = false;
        chatObj.mutedUntil = null;
      }

      // Check if chat is starred by this user
      chatObj.isStarred = chat.starredBy?.some(
        (id) => id.toString() === userId.toString()
      ) || false;

      return chatObj;
    });

    res.json(formattedChats);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Create or get private chat
// @route   POST /api/chats/private
// @access  Private
export const createPrivateChat = async (req, res) => {
  try {
    const { otherUserId } = req.body;
    const userId = req.user._id;

    if (!otherUserId) {
      return res.status(400).json({ message: 'Please provide otherUserId' });
    }

    if (otherUserId === userId.toString()) {
      return res.status(400).json({ message: 'Cannot create chat with yourself' });
    }

    // Check if other user exists
    const otherUser = await User.findById(otherUserId);
    if (!otherUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if private chat already exists
    let chat = await Chat.findOne({
      isGroup: false,
      participants: { $all: [userId, otherUserId] },
      $expr: { $eq: [{ $size: '$participants' }, 2] },
    })
      .populate('participants', 'name email avatarUrl isOnline lastSeen')
      .populate('lastMessage');

    if (!chat) {
      // Create new private chat
      chat = await Chat.create({
        isGroup: false,
        participants: [userId, otherUserId],
      });

      chat = await Chat.findById(chat._id)
        .populate('participants', 'name email avatarUrl isOnline lastSeen')
        .populate('lastMessage');
    }

    const chatObj = chat.toObject();
    chatObj.chatName = otherUser.name;
    chatObj.otherUser = otherUser;
    chatObj.customColor = chat.customColorPerUser?.get(userId.toString()) || '#0084ff';
    chatObj.customBackground = chat.backgroundPerUser?.get(userId.toString()) || null;

    res.status(201).json(chatObj);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Create group chat
// @route   POST /api/chats/group
// @access  Private
export const createGroupChat = async (req, res) => {
  try {
    const { name, participantIds } = req.body;
    const userId = req.user._id;

    if (!name || !participantIds || !Array.isArray(participantIds)) {
      return res.status(400).json({ message: 'Please provide name and participantIds array' });
    }

    if (participantIds.length < 1) {
      return res.status(400).json({ message: 'Group must have at least one other participant' });
    }

    // Add current user to participants
    const allParticipants = [userId, ...participantIds];

    // Verify all users exist
    const users = await User.find({ _id: { $in: allParticipants } });
    if (users.length !== allParticipants.length) {
      return res.status(400).json({ message: 'One or more users not found' });
    }

    const chat = await Chat.create({
      name,
      isGroup: true,
      participants: allParticipants,
    });

    const populatedChat = await Chat.findById(chat._id)
      .populate('participants', 'name email avatarUrl isOnline lastSeen')
      .populate('lastMessage');

    const chatObj = populatedChat.toObject();
    chatObj.chatName = chat.name;
    chatObj.customColor = chat.customColorPerUser?.get(userId.toString()) || '#0084ff';
    chatObj.customBackground = chat.backgroundPerUser?.get(userId.toString()) || null;

    res.status(201).json(chatObj);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get chat by ID
// @route   GET /api/chats/:chatId
// @access  Private
export const getChatById = async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user._id;

    const chat = await Chat.findById(chatId)
      .populate('participants', 'name email avatarUrl isOnline lastSeen')
      .populate('lastMessage');

    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    // Check if user is a participant
    const isParticipant = chat.participants.some(
      (p) => p._id.toString() === userId.toString()
    );

    if (!isParticipant) {
      return res.status(403).json({ message: 'Not authorized to access this chat' });
    }

    const chatObj = chat.toObject();

    if (!chat.isGroup) {
      const otherUser = chat.participants.find(
        (p) => p._id.toString() !== userId.toString()
      );
      chatObj.chatName = otherUser ? otherUser.name : 'Unknown';
      chatObj.otherUser = otherUser;
    } else {
      chatObj.chatName = chat.name;
      chatObj.groupAvatarUrl = chat.groupAvatarUrl || '';
    }

    chatObj.customColor = chat.customColorPerUser?.get(userId.toString()) || '#0084ff';
    chatObj.customBackground = chat.backgroundPerUser?.get(userId.toString()) || null;

    res.json(chatObj);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Update chat accent color
// @route   PUT /api/chats/:chatId/color
// @access  Private
export const updateChatColor = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { color } = req.body;
    const userId = req.user._id;

    if (!color) {
      return res.status(400).json({ message: 'Please provide a color' });
    }

    const chat = await Chat.findById(chatId);

    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    // Check if user is a participant
    const isParticipant = chat.participants.some(
      (p) => p.toString() === userId.toString()
    );

    if (!isParticipant) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Update color for this user
    if (!chat.customColorPerUser) {
      chat.customColorPerUser = new Map();
    }
    chat.customColorPerUser.set(userId.toString(), color);
    await chat.save();

    res.json({ message: 'Color updated', color });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Update chat background
// @route   PUT /api/chats/:chatId/background
// @access  Private
export const updateChatBackground = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { background } = req.body;
    const userId = req.user._id;

    // Allow null/undefined/empty string to remove background
    if (background === undefined) {
      return res.status(400).json({ message: 'Please provide a background value (use null to remove)' });
    }

    const chat = await Chat.findById(chatId);

    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    // Check if user is a participant
    const isParticipant = chat.participants.some(
      (p) => p.toString() === userId.toString()
    );

    if (!isParticipant) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Initialize map if it doesn't exist
    if (!chat.backgroundPerUser) {
      chat.backgroundPerUser = new Map();
    }

    // If background is null or empty string, remove it; otherwise set it
    if (background === null || background === '') {
      chat.backgroundPerUser.delete(userId.toString());
    } else {
      chat.backgroundPerUser.set(userId.toString(), background);
    }
    
    await chat.save();

    res.json({ message: background === null || background === '' ? 'Background removed' : 'Background updated', background: background || null });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Archive or unarchive a chat
// @route   PUT /api/chats/:chatId/archive
// @access  Private
export const archiveChat = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { archive } = req.body; // true to archive, false to unarchive
    const userId = req.user._id;

    const chat = await Chat.findById(chatId);

    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    // Check if user is a participant
    const isParticipant = chat.participants.some(
      (p) => p.toString() === userId.toString()
    );

    if (!isParticipant) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Initialize maps if they don't exist
    if (!chat.archivedBy) {
      chat.archivedBy = [];
    }
    if (!chat.archivedAtPerUser) {
      chat.archivedAtPerUser = new Map();
    }

    if (archive) {
      // Archive the chat for this user
      if (!chat.archivedBy.some((id) => id.toString() === userId.toString())) {
        chat.archivedBy.push(userId);
      }
      chat.archivedAtPerUser.set(userId.toString(), new Date());
    } else {
      // Unarchive the chat for this user
      chat.archivedBy = chat.archivedBy.filter(
        (id) => id.toString() !== userId.toString()
      );
      chat.archivedAtPerUser.delete(userId.toString());
    }

    await chat.save();

    res.json({
      message: archive ? 'Chat archived' : 'Chat unarchived',
      isArchived: archive,
      archivedAt: archive ? chat.archivedAtPerUser.get(userId.toString()) : null,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Mute or unmute a chat
// @route   PUT /api/chats/:chatId/mute
// @access  Private
export const muteChat = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { mute, duration } = req.body; // mute: true/false, duration: hours (optional, default: 24)
    const userId = req.user._id;

    const chat = await Chat.findById(chatId);

    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    // Check if user is a participant
    const isParticipant = chat.participants.some(
      (p) => p.toString() === userId.toString()
    );

    if (!isParticipant) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Initialize maps if they don't exist
    if (!chat.mutedBy) {
      chat.mutedBy = [];
    }
    if (!chat.mutedUntilPerUser) {
      chat.mutedUntilPerUser = new Map();
    }

    if (mute) {
      // Mute the chat for this user
      if (!chat.mutedBy.some((id) => id.toString() === userId.toString())) {
        chat.mutedBy.push(userId);
      }
      
      // Calculate mute duration (default: 24 hours)
      const muteDurationHours = duration || 24;
      const mutedUntil = new Date();
      mutedUntil.setHours(mutedUntil.getHours() + muteDurationHours);
      chat.mutedUntilPerUser.set(userId.toString(), mutedUntil);
    } else {
      // Unmute the chat for this user
      chat.mutedBy = chat.mutedBy.filter(
        (id) => id.toString() !== userId.toString()
      );
      chat.mutedUntilPerUser.delete(userId.toString());
    }

    await chat.save();

    res.json({
      message: mute ? 'Chat muted' : 'Chat unmuted',
      isMuted: mute,
      mutedUntil: mute ? chat.mutedUntilPerUser.get(userId.toString()) : null,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Update group avatar
// @route   PUT /api/chats/:chatId/avatar
// @access  Private
export const updateGroupAvatar = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { avatarUrl } = req.body;
    const userId = req.user._id;

    if (!avatarUrl) {
      return res.status(400).json({ message: 'Please provide avatarUrl' });
    }

    const chat = await Chat.findById(chatId);

    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    // Verify it's a group chat
    if (!chat.isGroup) {
      return res.status(400).json({ message: 'Avatar can only be set for group chats' });
    }

    // Check if user is a participant
    const isParticipant = chat.participants.some(
      (p) => p.toString() === userId.toString()
    );

    if (!isParticipant) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    chat.groupAvatarUrl = avatarUrl;
    await chat.save();

    const updatedChat = await Chat.findById(chatId)
      .populate('participants', 'name email avatarUrl isOnline lastSeen')
      .populate('lastMessage');

    const chatObj = updatedChat.toObject();
    chatObj.chatName = chat.name;
    chatObj.groupAvatarUrl = chat.groupAvatarUrl;
    chatObj.customColor = chat.customColorPerUser?.get(userId.toString()) || '#0084ff';
    chatObj.customBackground = chat.backgroundPerUser?.get(userId.toString()) || null;

    // Broadcast avatar update to all participants
    if (global.io) {
      chat.participants.forEach((participantId) => {
        global.io.to(`user_${participantId}`).emit('group_avatar_updated', {
          chatId: chat._id.toString(),
          avatarUrl: chat.groupAvatarUrl,
        });
      });
    }

    res.json(chatObj);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Update group name
// @route   PUT /api/chats/:chatId/name
// @access  Private
export const updateGroupName = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { name } = req.body;
    const userId = req.user._id;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Please provide a group name' });
    }

    const chat = await Chat.findById(chatId);

    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    // Verify it's a group chat
    if (!chat.isGroup) {
      return res.status(400).json({ message: 'Can only update name for group chats' });
    }

    // Check if user is a participant
    const isParticipant = chat.participants.some(
      (p) => p.toString() === userId.toString()
    );

    if (!isParticipant) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    chat.name = name.trim();
    await chat.save();

    const updatedChat = await Chat.findById(chatId)
      .populate('participants', 'name email avatarUrl isOnline lastSeen')
      .populate('lastMessage');

    const chatObj = updatedChat.toObject();
    chatObj.chatName = chat.name;
    chatObj.groupAvatarUrl = chat.groupAvatarUrl || '';
    chatObj.customColor = chat.customColorPerUser?.get(userId.toString()) || '#0084ff';
    chatObj.customBackground = chat.backgroundPerUser?.get(userId.toString()) || null;

    // Broadcast name update to all participants
    if (global.io) {
      chat.participants.forEach((participantId) => {
        global.io.to(`user_${participantId}`).emit('group_name_updated', {
          chatId: chat._id.toString(),
          name: chat.name,
        });
      });
    }

    res.json(chatObj);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Add participant to group
// @route   POST /api/chats/:chatId/participants
// @access  Private
export const addParticipant = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { userId: newUserId } = req.body;
    const currentUserId = req.user._id;

    if (!newUserId) {
      return res.status(400).json({ message: 'Please provide userId' });
    }

    const chat = await Chat.findById(chatId);

    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    // Verify it's a group chat
    if (!chat.isGroup) {
      return res.status(400).json({ message: 'Can only add participants to group chats' });
    }

    // Check if current user is a participant
    const isParticipant = chat.participants.some(
      (p) => p.toString() === currentUserId.toString()
    );

    if (!isParticipant) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Check if user is already a participant
    if (chat.participants.some((p) => p.toString() === newUserId.toString())) {
      return res.status(400).json({ message: 'User is already a participant' });
    }

    // Verify new user exists
    const newUser = await User.findById(newUserId);
    if (!newUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    chat.participants.push(newUserId);
    await chat.save();

    const updatedChat = await Chat.findById(chatId)
      .populate('participants', 'name email avatarUrl isOnline lastSeen')
      .populate('lastMessage');

    const chatObj = updatedChat.toObject();
    chatObj.chatName = chat.name;
    chatObj.groupAvatarUrl = chat.groupAvatarUrl || '';
    chatObj.customColor = chat.customColorPerUser?.get(currentUserId.toString()) || '#0084ff';
    chatObj.customBackground = chat.backgroundPerUser?.get(currentUserId.toString()) || null;

    // Broadcast participant addition to all participants
    if (global.io) {
      chat.participants.forEach((participantId) => {
        global.io.to(`user_${participantId}`).emit('group_participant_added', {
          chatId: chat._id.toString(),
          participant: newUser,
        });
      });
    }

    res.json(chatObj);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Remove participant from group
// @route   DELETE /api/chats/:chatId/participants/:userId
// @access  Private
export const removeParticipant = async (req, res) => {
  try {
    const { chatId, userId: removeUserId } = req.params;
    const currentUserId = req.user._id;

    const chat = await Chat.findById(chatId);

    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    // Verify it's a group chat
    if (!chat.isGroup) {
      return res.status(400).json({ message: 'Can only remove participants from group chats' });
    }

    // Check if current user is a participant
    const isParticipant = chat.participants.some(
      (p) => p.toString() === currentUserId.toString()
    );

    if (!isParticipant) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Check if user to remove is a participant
    if (!chat.participants.some((p) => p.toString() === removeUserId.toString())) {
      return res.status(400).json({ message: 'User is not a participant' });
    }

    // Remove participant
    chat.participants = chat.participants.filter(
      (p) => p.toString() !== removeUserId.toString()
    );

    // If no participants left, delete the chat (optional - you might want to keep it)
    if (chat.participants.length === 0) {
      await Chat.findByIdAndDelete(chatId);
      return res.json({ message: 'Group deleted (no participants left)' });
    }

    await chat.save();

    const updatedChat = await Chat.findById(chatId)
      .populate('participants', 'name email avatarUrl isOnline lastSeen')
      .populate('lastMessage');

    const chatObj = updatedChat.toObject();
    chatObj.chatName = chat.name;
    chatObj.groupAvatarUrl = chat.groupAvatarUrl || '';
    chatObj.customColor = chat.customColorPerUser?.get(currentUserId.toString()) || '#0084ff';
    chatObj.customBackground = chat.backgroundPerUser?.get(currentUserId.toString()) || null;

    // Broadcast participant removal to all participants
    if (global.io) {
      chat.participants.forEach((participantId) => {
        global.io.to(`user_${participantId}`).emit('group_participant_removed', {
          chatId: chat._id.toString(),
          removedUserId: removeUserId,
        });
      });
    }

    res.json(chatObj);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get shared media for a chat
// @route   GET /api/chats/:chatId/media
// @access  Private
export const getChatMedia = async (req, res) => {
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

    // Get all messages with media in this chat
    const messages = await Message.find({
      chatId,
      mediaUrl: { $ne: '' },
      deletedAt: null,
    })
      .populate('senderId', 'name avatarUrl')
      .sort({ createdAt: -1 });

    // Categorize media by type
    const images = [];
    const files = [];
    const videos = [];
    const audio = [];

    messages.forEach((msg) => {
      const mediaItem = {
        _id: msg._id,
        mediaUrl: msg.mediaUrl,
        messageType: msg.messageType,
        senderId: msg.senderId,
        createdAt: msg.createdAt,
        content: msg.content,
      };

      if (msg.messageType === 'image') {
        images.push(mediaItem);
      } else if (msg.messageType === 'file') {
        files.push(mediaItem);
      } else if (msg.messageType === 'voice' || msg.messageType === 'audio') {
        audio.push(mediaItem);
      } else if (msg.mediaUrl.match(/\.(mp4|webm|ogg)$/i)) {
        videos.push(mediaItem);
      }
    });

    res.json({ images, files, videos, audio });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Star or unstar a chat
// @route   PUT /api/chats/:chatId/star
// @access  Private
export const toggleStarChat = async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user._id;

    const chat = await Chat.findById(chatId);

    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    // Check if user is a participant
    const isParticipant = chat.participants.some(
      (p) => p.toString() === userId.toString()
    );

    if (!isParticipant) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const isStarred = chat.starredBy.some(
      (id) => id.toString() === userId.toString()
    );

    if (isStarred) {
      // Unstar
      chat.starredBy = chat.starredBy.filter(
        (id) => id.toString() !== userId.toString()
      );
    } else {
      // Star
      if (!chat.starredBy.includes(userId)) {
        chat.starredBy.push(userId);
      }
    }

    await chat.save();

    const updatedChat = await Chat.findById(chatId)
      .populate('participants', 'name email avatarUrl isOnline lastSeen')
      .populate('lastMessage');

    const chatObj = updatedChat.toObject();
    if (!chat.isGroup) {
      const otherUser = chat.participants.find(
        (p) => p._id.toString() !== userId.toString()
      );
      chatObj.chatName = otherUser ? otherUser.name : 'Unknown';
      chatObj.otherUser = otherUser;
    } else {
      chatObj.chatName = chat.name;
      chatObj.groupAvatarUrl = chat.groupAvatarUrl || '';
    }
    chatObj.customColor = chat.customColorPerUser?.get(userId.toString()) || '#0084ff';
    chatObj.customBackground = chat.backgroundPerUser?.get(userId.toString()) || null;
    chatObj.isStarred = chat.starredBy.some(
      (id) => id.toString() === userId.toString()
    );

    res.json(chatObj);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get all starred chats for current user
// @route   GET /api/chats/starred
// @access  Private
export const getStarredChats = async (req, res) => {
  try {
    const userId = req.user._id;

    const chats = await Chat.find({
      participants: userId,
      starredBy: userId,
    })
      .populate('participants', 'name email avatarUrl isOnline lastSeen')
      .populate('lastMessage')
      .sort({ updatedAt: -1 });

    const chatsWithDetails = chats.map((chat) => {
      const chatObj = chat.toObject();
      if (!chat.isGroup) {
        const otherUser = chat.participants.find(
          (p) => p._id.toString() !== userId.toString()
        );
        chatObj.chatName = otherUser ? otherUser.name : 'Unknown';
        chatObj.otherUser = otherUser;
      } else {
        chatObj.chatName = chat.name;
        chatObj.groupAvatarUrl = chat.groupAvatarUrl || '';
      }
      chatObj.customColor = chat.customColorPerUser?.get(userId.toString()) || '#0084ff';
      chatObj.customBackground = chat.backgroundPerUser?.get(userId.toString()) || null;
      chatObj.isStarred = true;
      return chatObj;
    });

    res.json(chatsWithDetails);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

