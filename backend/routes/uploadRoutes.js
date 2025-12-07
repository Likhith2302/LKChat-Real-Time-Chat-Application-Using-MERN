import express from 'express';
import { upload, uploadFile } from '../controllers/uploadController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(protect); // All routes require authentication

router.post('/', upload.single('file'), uploadFile);

export default router;

