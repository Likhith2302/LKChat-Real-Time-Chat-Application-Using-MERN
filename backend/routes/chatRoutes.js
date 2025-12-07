import express from 'express';
import {
  getChats,
  createPrivateChat,
  createGroupChat,
  getChatById,
  updateChatColor,
  updateChatBackground,
  archiveChat,
  muteChat,
  updateGroupAvatar,
  updateGroupName,
  addParticipant,
  removeParticipant,
  getChatMedia,
  toggleStarChat,
  getStarredChats,
} from '../controllers/chatController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(protect); // All routes require authentication

router.get('/', getChats);
router.get('/starred', getStarredChats);
router.post('/private', createPrivateChat);
router.post('/group', createGroupChat);
router.get('/:chatId/media', getChatMedia);
router.get('/:chatId', getChatById);
router.put('/:chatId/color', updateChatColor);
router.put('/:chatId/background', updateChatBackground);
router.put('/:chatId/archive', archiveChat);
router.put('/:chatId/mute', muteChat);
router.put('/:chatId/star', toggleStarChat);
router.put('/:chatId/avatar', updateGroupAvatar);
router.put('/:chatId/name', updateGroupName);
router.post('/:chatId/participants', addParticipant);
router.delete('/:chatId/participants/:userId', removeParticipant);

export default router;

