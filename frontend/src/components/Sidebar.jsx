import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useSocket } from '../contexts/SocketContext';
import { useTheme } from '../contexts/ThemeContext';
import axios from 'axios';
import { format } from 'date-fns';
import ChatItem from './ChatItem';
import CreateChatModal from './CreateChatModal';
import ThemeToggle from './ThemeToggle';
import './Sidebar.css';

const Sidebar = ({
  user,
  chats,
  selectedChat,
  onChatSelect,
  onLogout,
  showSidebar,
  onRefreshChats,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [showStarred, setShowStarred] = useState(false);
  const [showStarredMessages, setShowStarredMessages] = useState(false);
  const [archivedChats, setArchivedChats] = useState([]);
  const [starredChats, setStarredChats] = useState([]);
  const [starredMessages, setStarredMessages] = useState([]);
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem('sidebarWidth');
    return saved ? parseInt(saved, 10) : 350;
  });
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef(null);
  const { onlineUsers } = useSocket();
  const { theme } = useTheme();

  useEffect(() => {
    if (showArchived) {
      fetchArchivedChats();
    }
  }, [showArchived]);

  useEffect(() => {
    if (showStarred) {
      fetchStarredChats();
    }
  }, [showStarred]);

  useEffect(() => {
    if (showStarredMessages) {
      fetchStarredMessagesList();
    }
  }, [showStarredMessages]);

  // Save sidebar width to localStorage
  useEffect(() => {
    localStorage.setItem('sidebarWidth', sidebarWidth.toString());
  }, [sidebarWidth]);

  // Handle sidebar resizing
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing) return;
      
      const newWidth = e.clientX;
      const minWidth = 250;
      const maxWidth = 600;
      
      if (newWidth >= minWidth && newWidth <= maxWidth) {
        setSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing]);

  // Listen for profile/avatar updates
  useEffect(() => {
    const handleProfileUpdate = (event) => {
      const { userId, avatarUrl, name } = event.detail;
      // Refresh chats to get updated avatars
      onRefreshChats();
    };

    const handleGroupAvatarUpdate = (event) => {
      // Refresh chats to get updated group avatars
      onRefreshChats();
    };

    window.addEventListener('avatarUpdated', handleProfileUpdate);
    window.addEventListener('profileUpdated', handleProfileUpdate);
    window.addEventListener('groupAvatarUpdated', handleGroupAvatarUpdate);

    return () => {
      window.removeEventListener('avatarUpdated', handleProfileUpdate);
      window.removeEventListener('profileUpdated', handleProfileUpdate);
      window.removeEventListener('groupAvatarUpdated', handleGroupAvatarUpdate);
    };
  }, [onRefreshChats]);

  const fetchArchivedChats = async () => {
    try {
      const response = await axios.get('/api/chats?archived=true');
      setArchivedChats(response.data);
    } catch (error) {
      console.error('Error fetching archived chats:', error);
    }
  };

  const fetchStarredChats = async () => {
    try {
      const response = await axios.get('/api/chats/starred');
      setStarredChats(response.data);
    } catch (error) {
      console.error('Error fetching starred chats:', error);
    }
  };

  const fetchStarredMessagesList = async () => {
    try {
      const response = await axios.get('/api/messages/starred');
      setStarredMessages(response.data);
    } catch (error) {
      console.error('Error fetching starred messages:', error);
    }
  };

  const chatsToDisplay = showArchived ? archivedChats : showStarred ? starredChats : chats;
  
  const filteredChats = chatsToDisplay.filter((chat) => {
    // Filter by search query
    const chatName = chat.chatName || '';
    const lastMessage = chat.lastMessage?.content || '';
    const query = searchQuery.toLowerCase();
    return chatName.toLowerCase().includes(query) || lastMessage.toLowerCase().includes(query);
  });

  const filteredStarredMessages = starredMessages.filter((message) => {
    const content = message.content || '';
    const senderName = message.senderId?.name || '';
    const chatName = message.chatId?.name || '';
    const query = searchQuery.toLowerCase();
    return content.toLowerCase().includes(query) || 
           senderName.toLowerCase().includes(query) || 
           chatName.toLowerCase().includes(query);
  });

  const handleArchive = async (e, chat, archive) => {
    e.stopPropagation();
    try {
      await axios.put(`/api/chats/${chat._id}/archive`, { archive });
      onRefreshChats();
      if (showArchived) {
        fetchArchivedChats();
      }
    } catch (error) {
      console.error('Error archiving chat:', error);
      alert(error.response?.data?.message || 'Failed to archive chat');
    }
  };

  const handleStar = async (e, chat) => {
    e.stopPropagation();
    try {
      await axios.put(`/api/chats/${chat._id}/star`);
      onRefreshChats();
      if (showStarred) {
        fetchStarredChats();
      }
    } catch (error) {
      console.error('Error starring chat:', error);
      alert(error.response?.data?.message || 'Failed to star chat');
    }
  };

  return (
    <>
      <div 
        ref={sidebarRef}
        className={`sidebar ${showSidebar ? 'show' : ''}`}
        style={{ width: `${sidebarWidth}px` }}
      >
        <div className="sidebar-header">
          <div className="logo-container">
            <img src="/logo.jpg" alt="LKChat" className="app-logo" />
            <ThemeToggle />
          </div>
          <div className="sidebar-header-top">
            <Link to="/profile" className="user-info" style={{ textDecoration: 'none', color: 'inherit' }}>
              <div className="user-avatar">
                {user?.avatarUrl ? (
                  <img
                    src={`${axios.defaults.baseURL || ''}${user.avatarUrl}`}
                    alt={user.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                ) : null}
                {!user?.avatarUrl && (user?.name?.charAt(0).toUpperCase() || 'U')}
              </div>
              <div className="user-details">
                <div className="user-name">{user?.name || 'User'}</div>
                <div className="user-status">{user?.statusMessage || 'Available'}</div>
              </div>
            </Link>
            <div className="header-actions">
              <button
                className="icon-button"
                onClick={() => setShowCreateModal(true)}
                title="New Chat"
              >
                +
              </button>
              <button className="icon-button" onClick={onLogout} title="Logout">
                🚪
              </button>
            </div>
          </div>
        </div>

        <div className="sidebar-search">
          <input
            type="text"
            placeholder={
              showStarredMessages 
                ? "Search starred messages..." 
                : showStarred 
                ? "Search starred chats..." 
                : showArchived 
                ? "Search archived chats..." 
                : "Search chats..."
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="sidebar-nav">
          <button
            className={`nav-item ${!showArchived && !showStarred && !showStarredMessages ? 'active' : ''}`}
            onClick={() => {
              setShowArchived(false);
              setShowStarred(false);
              setShowStarredMessages(false);
            }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left', padding: '12px 16px', color: 'inherit', fontSize: 'inherit' }}
          >
            💬 Chats
          </button>
          <button
            className={`nav-item ${showStarred ? 'active' : ''}`}
            onClick={() => {
              setShowStarred(true);
              setShowArchived(false);
              setShowStarredMessages(false);
            }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left', padding: '12px 16px', color: 'inherit', fontSize: 'inherit' }}
          >
            ⭐ Starred Chats
          </button>
          <button
            className={`nav-item ${showStarredMessages ? 'active' : ''}`}
            onClick={() => {
              setShowStarredMessages(true);
              setShowArchived(false);
              setShowStarred(false);
            }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left', padding: '12px 16px', color: 'inherit', fontSize: 'inherit' }}
          >
            ⭐ Starred Messages
          </button>
          <button
            className={`nav-item ${showArchived ? 'active' : ''}`}
            onClick={() => {
              setShowArchived(true);
              setShowStarred(false);
              setShowStarredMessages(false);
            }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left', padding: '12px 16px', color: 'inherit', fontSize: 'inherit' }}
          >
            📦 Archived
          </button>
        </div>

        <div className="chat-list">
          {showStarredMessages ? (
            filteredStarredMessages.length === 0 ? (
              <div className="empty-state">
                <p>No starred messages yet.</p>
                <p style={{ fontSize: '12px', opacity: 0.7, marginTop: '8px' }}>
                  Star important messages to find them quickly!
                </p>
              </div>
            ) : (
              filteredStarredMessages.map((message) => {
                const chatId = typeof message.chatId === 'object' ? message.chatId._id : message.chatId;
                const chatName = message.chatId?.isGroup 
                  ? message.chatId?.name 
                  : message.senderId?.name || 'Private Chat';
                const isGroup = message.chatId?.isGroup || false;
                
                return (
                  <div
                    key={message._id}
                    className="starred-message-item"
                    onClick={() => {
                      // Find or create chat for this message
                      const existingChat = chats.find(c => c._id === chatId);
                      if (existingChat) {
                        onChatSelect(existingChat);
                      } else {
                        // Navigate to chat
                        window.location.href = `/?chatId=${chatId}`;
                      }
                    }}
                  >
                    <div className="starred-message-header">
                      <div className="starred-message-sender">
                        {message.senderId?.avatarUrl ? (
                          <img
                            src={`${axios.defaults.baseURL || ''}${message.senderId.avatarUrl}`}
                            alt={message.senderId.name}
                            className="starred-message-avatar"
                          />
                        ) : (
                          <div className="starred-message-avatar-placeholder">
                            {message.senderId?.name?.charAt(0).toUpperCase() || 'U'}
                          </div>
                        )}
                        <div className="starred-message-info">
                          <div className="starred-message-name">{message.senderId?.name || 'Unknown'}</div>
                          <div className="starred-message-chat">{chatName}</div>
                        </div>
                      </div>
                      <div className="starred-message-time">
                        {format(new Date(message.createdAt), 'MMM d, HH:mm')}
                      </div>
                    </div>
                    <div className="starred-message-content">
                      {message.mediaUrl ? (
                        <span className="starred-message-media">
                          {message.messageType === 'image' ? '📷 Image' : '📎 File'}
                        </span>
                      ) : (
                        message.content
                      )}
                    </div>
                  </div>
                );
              })
            )
          ) : filteredChats.length === 0 ? (
            <div className="empty-state">
              <p>No chats yet. Start a new conversation!</p>
            </div>
          ) : (
            filteredChats.map((chat) => (
              <ChatItem
                key={chat._id}
                chat={chat}
                isSelected={selectedChat?._id === chat._id}
                onClick={() => onChatSelect(chat)}
                isOnline={
                  !chat.isGroup &&
                  chat.otherUser &&
                  onlineUsers.has(chat.otherUser._id)
                }
                onArchive={(e) => handleArchive(e, chat, !chat.isArchived)}
                isArchived={chat.isArchived}
                onStar={handleStar}
              />
            ))
          )}
        </div>
        <div 
          className="sidebar-resize-handle"
          onMouseDown={(e) => {
            e.preventDefault();
            setIsResizing(true);
          }}
        />
      </div>

      {showCreateModal && (
        <CreateChatModal
          onClose={() => setShowCreateModal(false)}
          onChatCreated={() => {
            setShowCreateModal(false);
            onRefreshChats();
          }}
        />
      )}
    </>
  );
};

export default Sidebar;

