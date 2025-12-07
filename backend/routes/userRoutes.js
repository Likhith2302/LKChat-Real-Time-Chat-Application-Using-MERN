import express from 'express';
import { searchUsers, getUserById, getSharedMedia, getCommonGroups } from '../controllers/userController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(protect); // All routes require authentication

router.get('/search', searchUsers);
router.get('/:userId/media', getSharedMedia);
router.get('/:userId/groups', getCommonGroups);
router.get('/:userId', getUserById);

export default router;

