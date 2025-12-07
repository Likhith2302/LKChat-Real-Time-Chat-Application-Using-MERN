import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import User from '../models/User.js';
import Chat from '../models/Chat.js';
import { sendPasswordResetEmail } from '../utils/emailService.js';

// Generate JWT Token
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
export const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Please provide all fields' });
    }

    // Check if user exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Create user
    const user = await User.create({
      name,
      email,
      passwordHash,
    });

    if (user) {
      const token = generateToken(user._id);
      
      // Set httpOnly cookie
      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      });

      res.status(201).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl,
        statusMessage: user.statusMessage,
        token, // Also send in response for localStorage if needed
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password' });
    }

    // Check for user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Update last seen and online status
    user.lastSeen = new Date();
    user.isOnline = true;
    await user.save();

    const token = generateToken(user._id);
    
    // Set httpOnly cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      avatarUrl: user.avatarUrl,
      statusMessage: user.statusMessage,
      isOnline: user.isOnline,
      token, // Also send in response
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-passwordHash');
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
export const updateProfile = async (req, res) => {
  try {
    const { name, statusMessage, avatarUrl, bio, phoneNumber } = req.body;
    const user = await User.findById(req.user._id);
    const oldAvatarUrl = user.avatarUrl;

    if (name) user.name = name;
    if (statusMessage !== undefined) user.statusMessage = statusMessage;
    if (avatarUrl !== undefined) user.avatarUrl = avatarUrl;
    if (bio !== undefined) user.bio = bio;
    if (phoneNumber !== undefined) user.phoneNumber = phoneNumber;

    await user.save();

    // Broadcast avatar update to all users who have chats with this user
    if (avatarUrl !== undefined && avatarUrl !== oldAvatarUrl && global.io) {
      // Find all chats where this user is a participant
      const userChats = await Chat.find({ participants: user._id });
      
      // Emit avatar update to all participants in those chats
      userChats.forEach((chat) => {
        chat.participants.forEach((participantId) => {
          if (participantId.toString() !== user._id.toString()) {
            global.io.to(`user_${participantId}`).emit('avatar_updated', {
              userId: user._id.toString(),
              avatarUrl: user.avatarUrl,
              name: user.name,
            });
          }
        });
      });
      
      // Also emit to all connected clients
      global.io.emit('user_profile_updated', {
        userId: user._id.toString(),
        avatarUrl: user.avatarUrl,
        name: user.name,
        statusMessage: user.statusMessage,
      });
    }

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      avatarUrl: user.avatarUrl,
      statusMessage: user.statusMessage,
      bio: user.bio,
      phoneNumber: user.phoneNumber,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
export const logout = async (req, res) => {
  try {
    // Update user offline status
    const user = await User.findById(req.user._id);
    if (user) {
      user.isOnline = false;
      user.lastSeen = new Date();
      await user.save();
    }

    res.cookie('token', '', {
      httpOnly: true,
      expires: new Date(0),
    });

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Forgot password - Send reset token
// @route   POST /api/auth/forgot-password
// @access  Public
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Please provide an email address' });
    }

    const user = await User.findOne({ email });

    if (!user) {
      // Don't reveal if user exists for security
      return res.json({ 
        message: 'If that email exists, a password reset link has been sent.',
        resetLink: null // In production, don't send this
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');

    // Set token and expiration (1 hour)
    user.resetPasswordToken = resetTokenHash;
    user.resetPasswordExpire = Date.now() + 60 * 60 * 1000; // 1 hour
    await user.save();

    // Create reset URL
    const resetUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/reset-password/${resetToken}`;

    try {
      // Send email with reset link
      await sendPasswordResetEmail(email, resetUrl);
      
      console.log(`✅ Password reset email sent to: ${email}`);
      
      res.json({
        message: 'Password reset link has been sent to your email.',
        emailSent: true,
        resetLink: null // Don't show link if email was sent successfully
      });
    } catch (emailError) {
      console.error('❌ Email sending failed:', emailError.message);
      console.error('   This usually means email is not configured in .env file');
      console.error('   See backend/QUICK_EMAIL_SETUP.md for setup instructions\n');
      
      // Log the reset link prominently for development
      console.log('═══════════════════════════════════════════════════════════');
      console.log('📧 PASSWORD RESET LINK (Email not configured):');
      console.log(`   ${resetUrl}`);
      console.log('═══════════════════════════════════════════════════════════\n');
      
      res.json({
        message: 'Password reset link has been generated.',
        // Always return link in development if email fails
        resetLink: resetUrl,
        emailConfigured: false,
        note: 'Email service not configured. Reset link shown above. See backend/QUICK_EMAIL_SETUP.md to configure email.'
      });
    }
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Reset password with token
// @route   POST /api/auth/reset-password/:token
// @access  Public
export const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ message: 'Please provide a new password' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    // Hash the token to compare with stored hash
    const resetTokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Find user with valid token
    const user = await User.findOne({
      resetPasswordToken: resetTokenHash,
      resetPasswordExpire: { $gt: Date.now() } // Token not expired
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Update password and clear reset token
    user.passwordHash = passwordHash;
    user.resetPasswordToken = null;
    user.resetPasswordExpire = null;
    await user.save();

    res.json({ message: 'Password has been reset successfully. You can now login with your new password.' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

