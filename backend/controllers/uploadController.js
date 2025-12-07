import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

// File filter
const fileFilter = (req, file, cb) => {
  // Allow images, audio, and common file types
  const allowedTypes = /jpeg|jpg|png|gif|webp|pdf|doc|docx|txt|zip|mp3|wav|ogg|m4a|webm/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype) || 
                   file.mimetype.startsWith('audio/') || 
                   file.mimetype.startsWith('image/');

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images, audio, and common files are allowed.'));
  }
};

export const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter,
});

// @desc    Upload file
// @route   POST /api/upload
// @access  Private
export const uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const mediaUrl = `/uploads/${req.file.filename}`;
    res.json({ mediaUrl });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

