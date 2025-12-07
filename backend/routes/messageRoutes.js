import express from 'express';
import {
  getMessages,
  sendMessage,
  toggleReaction,
  toggleStar,
  getStarredMessages,
  markAsRead,
  markAllAsRead,
  replyToMessage,
  editMessage,
  deleteMessage,
  searchMessages,
  forwardMessage,
  pinMessage,
  getPinnedMessages,
} from '../controllers/messageController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(protect); // All routes require authentication

// Search (must be before /:chatId to avoid route conflict)
router.get('/search', searchMessages);

// Starred messages
router.get('/starred', getStarredMessages);

// Pinned messages
router.get('/chat/:chatId/pinned', getPinnedMessages);

// Read receipts
router.put('/chat/:chatId/read-all', markAllAsRead);
router.put('/:messageId/read', markAsRead);

// Message actions
router.post('/:messageId/reply', replyToMessage);
router.put('/:messageId/edit', editMessage);
router.delete('/:messageId', deleteMessage);
router.post('/:messageId/forward', forwardMessage);
router.put('/:messageId/pin', pinMessage);

// Reactions and stars
router.post('/:messageId/react', toggleReaction);
router.post('/:messageId/star', toggleStar);

// Get messages and send message
router.get('/:chatId', getMessages);
router.post('/:chatId', sendMessage);

export default router;

