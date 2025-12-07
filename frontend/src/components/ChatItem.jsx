import { format } from 'date-fns';
import axios from 'axios';
import './ChatItem.css';

const ChatItem = ({ chat, isSelected, onClick, isOnline, onArchive, isArchived, onStar }) => {
  const accentColor = chat.customColor || '#0084ff';
  const lastMessage = chat.lastMessage;
  const time = lastMessage
    ? format(new Date(lastMessage.createdAt), 'HH:mm')
    : '';

  return (
    <div
      className={`chat-item ${isSelected ? 'selected' : ''} ${isArchived ? 'archived' : ''}`}
      onClick={onClick}
      style={isSelected ? { borderLeftColor: accentColor } : {}}
      onContextMenu={(e) => {
        e.preventDefault();
        if (onArchive) {
          onArchive(e);
        }
      }}
    >
      <div className="chat-item-avatar">
        {chat.isGroup ? (
          <div className="group-avatar">
            {chat.groupAvatarUrl ? (
              <img
                src={`${axios.defaults.baseURL || ''}${chat.groupAvatarUrl}`}
                alt={chat.chatName}
                style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                }}
              />
            ) : null}
            <div style={{ display: chat.groupAvatarUrl ? 'none' : 'flex' }}>👥</div>
          </div>
        ) : (
          <div className="user-avatar-container">
            <div className="user-avatar-small">
              {chat.otherUser?.avatarUrl ? (
                <img
                  src={`${axios.defaults.baseURL || ''}${chat.otherUser.avatarUrl}`}
                  alt={chat.otherUser.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
              ) : null}
              {!chat.otherUser?.avatarUrl && (chat.otherUser?.name?.charAt(0).toUpperCase() || 'U')}
            </div>
            {isOnline && <div className="online-indicator" />}
          </div>
        )}
      </div>
      <div className="chat-item-content">
        <div className="chat-item-header">
          <span className="chat-item-name">
            {chat.chatName || 'Chat'}
            {isArchived && <span style={{ marginLeft: '8px', fontSize: '0.8em', opacity: 0.7 }}>📦</span>}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {onStar && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onStar(e, chat);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '0.9em',
                  padding: '4px',
                  opacity: chat.isStarred ? 1 : 0.4,
                }}
                title={chat.isStarred ? 'Unstar chat' : 'Star chat'}
              >
                {chat.isStarred ? '⭐' : '☆'}
              </button>
            )}
            {onArchive && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onArchive(e);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '0.9em',
                  padding: '4px',
                  opacity: 0.6,
                }}
                title={isArchived ? 'Unarchive' : 'Archive'}
              >
                {isArchived ? '📤' : '📦'}
              </button>
            )}
            {time && <span className="chat-item-time">{time}</span>}
          </div>
        </div>
        <div className="chat-item-preview">
          {lastMessage ? (
            <>
              <span className="chat-item-sender">
                {lastMessage.senderId?._id === chat.currentUserId
                  ? 'You: '
                  : `${lastMessage.senderId?.name || 'User'}: `}
              </span>
              <span className="chat-item-message">
                {lastMessage.mediaUrl
                  ? lastMessage.messageType === 'image'
                    ? '📷 Image'
                    : '📎 File'
                  : lastMessage.content}
              </span>
            </>
          ) : (
            <span className="chat-item-empty">No messages yet</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatItem;

