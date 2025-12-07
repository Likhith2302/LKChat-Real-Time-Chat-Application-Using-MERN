import mongoose from 'mongoose';

const chatSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: function () {
        return this.isGroup;
      },
    },
    isGroup: {
      type: Boolean,
      default: false,
    },
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
    ],
    lastMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
      default: null,
    },
    customColorPerUser: {
      type: Map,
      of: String,
      default: new Map(),
    },
    backgroundPerUser: {
      type: Map,
      of: String,
      default: new Map(),
    },
    // Archive per user (each user can archive/unarchive independently)
    archivedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    archivedAtPerUser: {
      type: Map,
      of: Date,
      default: new Map(),
    },
    // Mute per user (each user can mute/unmute independently)
    mutedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    mutedUntilPerUser: {
      type: Map,
      of: Date,
      default: new Map(),
    },
    // Group avatar (only for group chats)
    groupAvatarUrl: {
      type: String,
      default: '',
    },
    // Starred chats per user (each user can star/unstar independently)
    starredBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
chatSchema.index({ participants: 1 });

export default mongoose.model('Chat', chatSchema);

