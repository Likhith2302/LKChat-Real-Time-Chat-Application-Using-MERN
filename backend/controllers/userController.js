import User from '../models/User.js';
import Chat from '../models/Chat.js';
import Message from '../models/Message.js';

// @desc    Search users by name or email
// @route   GET /api/users/search?q=query
// @access  Private
export const searchUsers = async (req, res) => {
  try {
    const { q } = req.query;
    const currentUserId = req.user._id;

    if (!q || q.trim().length < 2) {
      return res.status(400).json({ message: 'Search query must be at least 2 characters' });
    }

    const searchQuery = q.trim();

    // Search by name or email (case-insensitive)
    const users = await User.find({
      $and: [
        { _id: { $ne: currentUserId } }, // Exclude current user
        {
          $or: [
            { name: { $regex: searchQuery, $options: 'i' } },
            { email: { $regex: searchQuery, $options: 'i' } },
          ],
        },
      ],
    })
      .select('name email avatarUrl isOnline lastSeen')
      .limit(20);

    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get user by ID
// @route   GET /api/users/:userId
// @access  Private
export const getUserById = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user._id;

    const user = await User.findById(userId).select('name email avatarUrl isOnline lastSeen statusMessage bio phoneNumber');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get shared media with a user
// @route   GET /api/users/:userId/media
// @access  Private
export const getSharedMedia = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user._id;

    // Find the private chat between current user and target user
    const chat = await Chat.findOne({
      isGroup: false,
      participants: { $all: [currentUserId, userId] },
      $expr: { $eq: [{ $size: '$participants' }, 2] },
    });

    if (!chat) {
      return res.json({ images: [], files: [], videos: [], audio: [] });
    }

    // Get all messages with media in this chat
    const messages = await Message.find({
      chatId: chat._id,
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

// @desc    Get common groups with a user
// @route   GET /api/users/:userId/groups
// @access  Private
export const getCommonGroups = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user._id;

    // Find all group chats where both users are participants
    const commonGroups = await Chat.find({
      isGroup: true,
      participants: { $all: [currentUserId, userId] },
    })
      .populate('participants', 'name email avatarUrl')
      .populate('lastMessage')
      .sort({ updatedAt: -1 });

    res.json(commonGroups);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

