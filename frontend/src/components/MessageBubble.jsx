import { useState, useRef } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import axios from 'axios';
import './MessageBubble.css';

const MessageBubble = ({ 
  message, 
  isOwn, 
  onReaction, 
  onStar, 
  accentColor, 
  currentUserId,
  onReply,
  onEdit,
  onDelete,
  onForward,
  onPin,
  isPinned,
  replyingTo,
  editingMessageId,
}) => {
  const [showReactions, setShowReactions] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef(null);
  const isStarred = message.starredBy?.some(
    (id) => {
      const userId = typeof id === 'object' ? id._id?.toString() : id?.toString();
      return userId === currentUserId?.toString();
    }
  );

  const handleReactionClick = (emoji) => {
    if (onReaction) {
      onReaction(message._id, emoji);
    }
    setShowReactions(false);
  };

  const handleStarClick = () => {
    if (onStar) {
      onStar(message._id);
    }
  };

  const getReactionCount = (emoji) => {
    return message.reactions?.filter((r) => r.emoji === emoji).length || 0;
  };

  const hasReactions = message.reactions && message.reactions.length > 0;
  const isDeleted = message.deletedAt || (message.deletedFor && message.deletedFor.some(
    (id) => {
      const userId = typeof id === 'object' ? id._id?.toString() : id?.toString();
      return userId === currentUserId?.toString();
    }
  ));
  const isEdited = message.editedAt;
  const isForwarded = message.forwarded;
  const canEdit = isOwn && !isDeleted && !message.deletedAt; // No time limit
  const canDeleteForEveryone = isOwn && !message.deletedAt && 
    (Date.now() - new Date(message.createdAt).getTime()) < (60 * 60 * 1000); // 1 hour

  const [showTimestamp, setShowTimestamp] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div className={`message-bubble-container ${isOwn ? 'own' : 'other'} ${isPinned ? 'pinned' : ''}`}>
      {isPinned && <div className="pin-indicator">📌</div>}
      <div
        className={`message-bubble ${isOwn ? 'own' : 'other'}`}
        style={isOwn ? { backgroundColor: accentColor } : {}}
        onMouseEnter={() => setShowTimestamp(true)}
        onMouseLeave={() => setShowTimestamp(false)}
      >
        {/* Reply Context */}
        {message.replyTo && (
          <div className="reply-context">
            <div className="reply-line"></div>
            <div className="reply-info">
              <span className="reply-sender">
                {message.replyTo.senderId?.name || 'Unknown'}
              </span>
              <span className="reply-content">
                {message.replyTo.content || 'Media'}
              </span>
            </div>
          </div>
        )}

        {/* Forwarded Indicator */}
        {isForwarded && (
          <div className="forwarded-indicator">
            ↪ Forwarded
          </div>
        )}

        {!isOwn && (
          <div className="message-sender-name">
            {message.senderId?.name || 'Unknown'}
          </div>
        )}

        {/* Deleted Message */}
        {isDeleted ? (
          <div className="message-deleted">
            <span className="deleted-icon">🗑️</span>
            <span className="deleted-text">This message was deleted</span>
          </div>
        ) : (
          <>

        {message.mediaUrl ? (
          <div className="message-media">
            {message.messageType === 'image' ? (
              <img
                src={`${axios.defaults.baseURL || ''}${message.mediaUrl}`}
                alt="Shared"
                className="message-image"
              />
            ) : message.messageType === 'voice' || message.messageType === 'audio' ? (
              <div className="voice-message-player">
                <audio
                  ref={audioRef}
                  preload="metadata"
                  onTimeUpdate={() => {
                    if (audioRef.current) {
                      setCurrentTime(audioRef.current.currentTime);
                    }
                  }}
                  onEnded={() => {
                    setIsPlaying(false);
                    setCurrentTime(0);
                    if (audioRef.current) {
                      audioRef.current.currentTime = 0;
                    }
                  }}
                  onError={(e) => {
                    console.error('Audio playback error:', e);
                    setIsPlaying(false);
                  }}
                >
                  <source src={`${axios.defaults.baseURL || ''}${message.mediaUrl}`} type="audio/webm" />
                  <source src={`${axios.defaults.baseURL || ''}${message.mediaUrl}`} type="audio/mp4" />
                  <source src={`${axios.defaults.baseURL || ''}${message.mediaUrl}`} type="audio/ogg" />
                  <source src={`${axios.defaults.baseURL || ''}${message.mediaUrl}`} type="audio/wav" />
                  Your browser does not support the audio element.
                </audio>
                <button
                  className="voice-play-button"
                  onClick={async () => {
                    if (audioRef.current) {
                      try {
                        if (isPlaying) {
                          audioRef.current.pause();
                          setIsPlaying(false);
                        } else {
                          // Ensure audio is loaded
                          if (audioRef.current.readyState < 2) {
                            audioRef.current.load();
                          }
                          await audioRef.current.play();
                          setIsPlaying(true);
                        }
                      } catch (error) {
                        console.error('Error playing audio:', error);
                        alert('Could not play audio. The file format might not be supported.');
                        setIsPlaying(false);
                      }
                    }
                  }}
                >
                  {isPlaying ? '⏸' : '▶'}
                </button>
                <div className="voice-waveform">
                  <div
                    className="voice-progress"
                    style={{
                      width: audioRef.current
                        ? `${(currentTime / (message.audioDuration || 1)) * 100}%`
                        : '0%',
                    }}
                  />
                </div>
                <span className="voice-duration">
                  {message.audioDuration
                    ? `${Math.floor(message.audioDuration / 60)}:${(message.audioDuration % 60).toString().padStart(2, '0')}`
                    : '0:00'}
                </span>
              </div>
            ) : (
              <a
                href={`${axios.defaults.baseURL || ''}${message.mediaUrl}`}
                target="_blank"
                rel="noopener noreferrer"
                className="message-file"
              >
                📎 {message.mediaUrl.split('/').pop()}
              </a>
            )}
            {message.content && (
              <div className="message-content">{message.content}</div>
            )}
          </div>
        ) : (
          <div className="message-content">{message.content}</div>
        )}

        <div className="message-footer">
          <span className="message-time">
            {format(new Date(message.createdAt), 'HH:mm')}
          </span>
          {isEdited && (
            <span className="edited-indicator" title={`Edited ${formatDistanceToNow(new Date(message.editedAt))} ago`}>
              (edited)
            </span>
          )}
          {isOwn && (
            <span className={`message-status ${message.status || 'sent'}`}>
              {message.status === 'read' ? (
                <span className="read-receipt blue">✓✓</span>
              ) : message.status === 'delivered' ? (
                <span className="read-receipt">✓✓</span>
              ) : (
                <span className="read-receipt">✓</span>
              )}
            </span>
          )}
        </div>
        </>
        )}

        {/* Detailed Timestamp Tooltip */}
        {showTimestamp && (
          <div className="timestamp-tooltip">
            {format(new Date(message.createdAt), 'PPpp')}
            {isEdited && (
              <div className="edited-time">
                Edited: {format(new Date(message.editedAt), 'PPpp')}
              </div>
            )}
          </div>
        )}

        {hasReactions && (
          <div className="message-reactions-display">
            {['👍', '❤', '😂', '😮'].map((emoji) => {
              const count = getReactionCount(emoji);
              if (count > 0) {
                return (
                  <span key={emoji} className="reaction-badge">
                    {emoji} {count}
                  </span>
                );
              }
              return null;
            })}
          </div>
        )}
      </div>

      <div className="message-actions">
        {!isDeleted && (
          <>
            <button
              className="message-action-button"
              onClick={() => {
                if (onReply) onReply(message);
                setShowMenu(false);
              }}
              title="Reply"
            >
              💬
            </button>
            <button
              className="message-action-button"
              onClick={() => setShowReactions(!showReactions)}
              title="Add reaction"
            >
              😊
            </button>
            <button
              className={`message-action-button ${isStarred ? 'starred' : ''}`}
              onClick={handleStarClick}
              title="Star message"
            >
              ⭐
            </button>
            <button
              className="message-action-button"
              onClick={() => {
                if (onForward) onForward(message);
                setShowMenu(false);
              }}
              title="Forward"
            >
              ↪
            </button>
            {onPin && (
              <button
                className={`message-action-button ${isPinned ? 'pinned' : ''}`}
                onClick={() => {
                  if (onPin) onPin(message._id);
                  setShowMenu(false);
                }}
                title={isPinned ? 'Unpin' : 'Pin'}
              >
                📌
              </button>
            )}
          </>
        )}
        {isOwn && !isDeleted && (
          <div className="message-menu">
            <button
              className="message-menu-button"
              onClick={() => setShowMenu(!showMenu)}
              title="More options"
            >
              ⋮
            </button>
            {showMenu && (
              <div className="message-menu-dropdown">
                {canEdit && (
                  <button
                    className="menu-item"
                    onClick={() => {
                      if (onEdit) onEdit(message);
                      setShowMenu(false);
                    }}
                  >
                    ✏️ Edit
                  </button>
                )}
                <button
                  className="menu-item delete"
                  onClick={() => {
                    if (onDelete) onDelete(message._id, false);
                    setShowMenu(false);
                  }}
                >
                  🗑️ Delete for me
                </button>
                {canDeleteForEveryone && (
                  <button
                    className="menu-item delete"
                    onClick={() => {
                      if (onDelete) onDelete(message._id, true);
                      setShowMenu(false);
                    }}
                  >
                    🗑️ Delete for everyone
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {showReactions && (
        <div className="reactions-picker">
          {['👍', '❤', '😂', '😮'].map((emoji) => (
            <button
              key={emoji}
              className="reaction-emoji-button"
              onClick={() => handleReactionClick(emoji)}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default MessageBubble;

