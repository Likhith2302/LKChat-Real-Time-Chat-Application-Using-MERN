import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema(
  {
    chatId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Chat',
      required: true,
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    content: {
      type: String,
      required: function () {
        return !this.mediaUrl;
      },
    },
    mediaUrl: {
      type: String,
      default: '',
    },
    messageType: {
      type: String,
      enum: ['text', 'image', 'file', 'audio', 'voice'],
      default: 'text',
    },
    status: {
      type: String,
      enum: ['sent', 'delivered', 'read'],
      default: 'sent',
    },
    audioDuration: {
      type: Number,
      default: 0, // Duration in seconds for voice messages
    },
    readBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    reactions: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        emoji: {
          type: String,
          required: true,
        },
      },
    ],
    starredBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    // Reply to message
    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
    },
    // Edit message
    editedAt: {
      type: Date,
    },
    // Delete message
    deletedAt: {
      type: Date,
    },
    deletedFor: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    // Pin message
    pinned: {
      type: Boolean,
      default: false,
    },
    pinnedAt: {
      type: Date,
    },
    // Forward message
    forwarded: {
      type: Boolean,
      default: false,
    },
    forwardedFrom: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
messageSchema.index({ chatId: 1, createdAt: -1 });

export default mongoose.model('Message', messageSchema);

