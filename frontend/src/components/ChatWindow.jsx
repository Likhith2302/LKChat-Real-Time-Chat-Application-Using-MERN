import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import { useToast } from '../contexts/ToastContext';
import MessageBubble from './MessageBubble';
import MessageInput from './MessageInput';
import ColorPicker from './ColorPicker';
import BackgroundPicker from './BackgroundPicker';
import axios from 'axios';
import './ChatWindow.css';

const ChatWindow = ({ chat, onBack, onChatUpdate }) => {
  const { user } = useAuth();
  const { socket, onlineUsers } = useSocket();
  const { showToast } = useToast();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [typingUsers, setTypingUsers] = useState(new Set());
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showBackgroundPicker, setShowBackgroundPicker] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [pinnedMessages, setPinnedMessages] = useState([]);
  const [isMuted, setIsMuted] = useState(false);
  const [currentChat, setCurrentChat] = useState(chat);
  const messagesEndRef = useRef(null);
  const chatId = currentChat?._id;
  const accentColor = currentChat?.customColor || '#0084ff';
  const customBackground = currentChat?.customBackground || null;

  // Update currentChat when chat prop changes
  useEffect(() => {
    setCurrentChat(chat);
  }, [chat]);

  useEffect(() => {
    if (chatId) {
      fetchMessages();
      fetchPinnedMessages();
      joinChatRoom();
      // Update mute status from chat
      setIsMuted(currentChat?.isMuted || false);
    }

    return () => {
      if (chatId && socket) {
        socket.emit('leave_room', chatId);
      }
    };
  }, [chatId, currentChat]);

  useEffect(() => {
    if (socket) {
      socket.on('receive_message', handleReceiveMessage);
      socket.on('typing', handleTyping);
      socket.on('stop_typing', handleStopTyping);
      socket.on('reaction_updated', handleReactionUpdate);
      socket.on('star_updated', handleStarUpdate);
      socket.on('message_status_update', handleMessageStatusUpdate);
      socket.on('message_deleted', handleMessageDeleted);

      return () => {
        socket.off('receive_message', handleReceiveMessage);
        socket.off('typing', handleTyping);
        socket.off('stop_typing', handleStopTyping);
        socket.off('reaction_updated', handleReactionUpdate);
        socket.off('star_updated', handleStarUpdate);
        socket.off('message_status_update', handleMessageStatusUpdate);
        socket.off('message_deleted', handleMessageDeleted);
      };
    }
  }, [socket, chatId]);

  useEffect(() => {
    scrollToBottom();
    // Mark messages as read when chat is viewed
    if (chatId && messages.length > 0) {
      markAllMessagesAsRead();
    }
  }, [messages, chatId]);

  // Listen for avatar updates
  useEffect(() => {
    const handleAvatarUpdate = (event) => {
      const { userId, avatarUrl, name } = event.detail;
      const otherUser = getOtherUser();
      if (otherUser && otherUser._id === userId) {
        // Update the other user's avatar in the current chat
        setCurrentChat((prevChat) => {
          if (prevChat && prevChat.otherUser && prevChat.otherUser._id === userId) {
            return {
              ...prevChat,
              otherUser: {
                ...prevChat.otherUser,
                avatarUrl: avatarUrl,
                name: name,
              },
            };
          }
          return prevChat;
        });
        // Also refresh chat list in parent
        if (onChatUpdate) {
          onChatUpdate();
        }
      }
    };

    const handleGroupAvatarUpdate = (data) => {
      if (data.chatId === chatId) {
        setCurrentChat((prevChat) => ({
          ...prevChat,
          groupAvatarUrl: data.avatarUrl,
        }));
        if (onChatUpdate) {
          onChatUpdate();
        }
      }
    };

    window.addEventListener('avatarUpdated', handleAvatarUpdate);
    window.addEventListener('profileUpdated', handleAvatarUpdate);
    
    if (socket) {
      socket.on('group_avatar_updated', handleGroupAvatarUpdate);
    }

    return () => {
      window.removeEventListener('avatarUpdated', handleAvatarUpdate);
      window.removeEventListener('profileUpdated', handleAvatarUpdate);
      if (socket) {
        socket.off('group_avatar_updated', handleGroupAvatarUpdate);
      }
    };
  }, [onChatUpdate, socket, chatId]);

  const joinChatRoom = () => {
    if (socket && chatId) {
      socket.emit('join_room', chatId);
    }
  };

  const fetchMessages = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/messages/${chatId}`);
      setMessages(response.data.messages || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReceiveMessage = (message) => {
    if (message.chatId === chatId) {
      setMessages((prev) => [...prev, message]);
    }
  };

  const handleTyping = (data) => {
    if (data.chatId === chatId && data.userId !== user._id) {
      setTypingUsers((prev) => new Set([...prev, data.userName]));
    }
  };

  const handleStopTyping = (data) => {
    if (data.chatId === chatId) {
      setTypingUsers((prev) => {
        const newSet = new Set(prev);
        newSet.delete(data.userName);
        return newSet;
      });
    }
  };

  const handleReactionUpdate = (message) => {
    if (message.chatId === chatId) {
      setMessages((prev) =>
        prev.map((msg) => (msg._id === message._id ? message : msg))
      );
    }
  };

  const handleStarUpdate = (message) => {
    if (message.chatId === chatId) {
      setMessages((prev) =>
        prev.map((msg) => (msg._id === message._id ? message : msg))
      );
    }
  };

  const handleMessageStatusUpdate = (data) => {
    if (data.messageId) {
      setMessages((prev) =>
        prev.map((msg) =>
          msg._id === data.messageId
            ? { ...msg, status: data.status, readBy: data.readBy || msg.readBy }
            : msg
        )
      );
    }
  };

  const markAllMessagesAsRead = async () => {
    try {
      // Mark all unread messages in this chat as read
      const unreadMessages = messages.filter(
        (msg) =>
          msg.senderId._id !== user._id &&
          !msg.readBy?.some((id) => {
            const userId = typeof id === 'object' ? id._id?.toString() : id?.toString();
            return userId === user._id?.toString();
          })
      );

      if (unreadMessages.length > 0 && socket) {
        // Mark each unread message as read via socket
        unreadMessages.forEach((msg) => {
          socket.emit('message_read', {
            messageId: msg._id,
            chatId: chatId,
          });
        });

        // Also call API to mark all as read
        await axios.put(`/api/messages/chat/${chatId}/read-all`);
      }
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  const fetchPinnedMessages = async () => {
    try {
      const response = await axios.get(`/api/messages/chat/${chatId}/pinned`);
      setPinnedMessages(response.data || []);
    } catch (error) {
      console.error('Error fetching pinned messages:', error);
    }
  };

  const handleSendMessage = async (content, mediaUrl, messageType, audioDuration, replyToId, editMessageId) => {
    try {
      let response;
      if (replyToId) {
        // Reply to message
        response = await axios.post(`/api/messages/${replyToId}/reply`, {
          chatId,
          content,
          mediaUrl,
          messageType,
          audioDuration: audioDuration || 0,
        });
      } else if (editingMessageId) {
        // Edit message
        response = await axios.put(`/api/messages/${editingMessageId}/edit`, {
          content,
        });
        setEditingMessageId(null);
      } else {
        // Regular message
        response = await axios.post(`/api/messages/${chatId}`, {
          content,
          mediaUrl,
          messageType,
          audioDuration: audioDuration || 0,
        });
      }

      const newMessage = response.data;
      
      if (editingMessageId) {
        // Update existing message
        setMessages((prev) =>
          prev.map((msg) => (msg._id === editingMessageId ? newMessage : msg))
        );
      } else {
        // Add new message
        setMessages((prev) => [...prev, newMessage]);
      }

      // Emit via socket
      if (socket) {
        socket.emit('send_message', {
          chatId,
          messageId: newMessage._id,
        });
      }

      // Clear reply
      setReplyingTo(null);

      // Refresh chat list to update last message
      if (onChatUpdate) {
        onChatUpdate();
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleReply = (message) => {
    setReplyingTo(message);
    setEditingMessageId(null);
  };

  const handleEdit = (message) => {
    setEditingMessageId(message._id);
    setReplyingTo(null);
  };

  const handleDelete = async (messageId, deleteForEveryone) => {
    try {
      const response = await axios.delete(`/api/messages/${messageId}`, {
        data: { deleteForEveryone },
      });

      // Update message in state
      setMessages((prev) =>
        prev.map((msg) => {
          if (msg._id === messageId) {
            if (deleteForEveryone) {
              return { 
                ...msg, 
                deletedAt: new Date(), 
                content: 'This message was deleted', 
                mediaUrl: '',
                messageType: 'text'
              };
            } else {
              return { ...msg, deletedFor: [...(msg.deletedFor || []), user._id] };
            }
          }
          return msg;
        })
      );

      // Emit via socket
      if (socket) {
        socket.emit('message_deleted', {
          messageId,
          chatId,
          deleteForEveryone,
        });
      }

      if (onChatUpdate) {
        onChatUpdate();
      }
    } catch (error) {
      console.error('Error deleting message:', error);
      const errorMessage = error.response?.data?.message || 'Failed to delete message';
      showToast(errorMessage, 'error');
    }
  };

  const handleMessageDeleted = (data) => {
    if (data.chatId === chatId) {
      setMessages((prev) =>
        prev.map((msg) => {
          if (msg._id === data.messageId) {
            if (data.deleteForEveryone) {
              return {
                ...msg,
                deletedAt: new Date(),
                content: 'This message was deleted',
                mediaUrl: '',
                messageType: 'text',
              };
            }
          }
          return msg;
        })
      );
    }
  };

  const handleForward = async (message) => {
    // This will be handled by a modal component
    // For now, we'll show an alert
    const targetChatId = prompt('Enter chat ID to forward to (or comma-separated IDs for multiple):');
    if (targetChatId) {
      try {
        const chatIds = targetChatId.split(',').map((id) => id.trim());
        await axios.post(`/api/messages/${message._id}/forward`, {
          chatIds,
        });
        alert('Message forwarded successfully!');
      } catch (error) {
        console.error('Error forwarding message:', error);
        alert(error.response?.data?.message || 'Failed to forward message');
      }
    }
  };

  const handlePin = async (messageId) => {
    try {
      const response = await axios.put(`/api/messages/${messageId}/pin`);
      
      // Update message in state
      setMessages((prev) =>
        prev.map((msg) => (msg._id === messageId ? response.data : msg))
      );

      // Update pinned messages list
      await fetchPinnedMessages();

      // Emit via socket
      if (socket) {
        socket.emit('message_pinned', {
          messageId,
          chatId,
          pinned: response.data.pinned,
        });
      }
    } catch (error) {
      console.error('Error pinning message:', error);
    }
  };

  const handleReaction = async (messageId, emoji) => {
    try {
      const response = await axios.post(`/api/messages/${messageId}/react`, {
        emoji,
      });

      // Update message in state
      setMessages((prev) =>
        prev.map((msg) => (msg._id === messageId ? response.data : msg))
      );

      // Emit via socket
      if (socket) {
        socket.emit('reaction_updated', {
          messageId,
          chatId,
        });
      }
    } catch (error) {
      console.error('Error adding reaction:', error);
    }
  };

  const handleStar = async (messageId) => {
    try {
      const response = await axios.post(`/api/messages/${messageId}/star`);

      // Update message in state
      setMessages((prev) =>
        prev.map((msg) => (msg._id === messageId ? response.data : msg))
      );

      // Emit via socket
      if (socket) {
        socket.emit('star_updated', {
          messageId,
          chatId,
        });
      }
    } catch (error) {
      console.error('Error starring message:', error);
    }
  };

  const handleColorChange = async (color) => {
    try {
      await axios.put(`/api/chats/${chatId}/color`, { color });
      setShowColorPicker(false);
      if (onChatUpdate) {
        onChatUpdate();
      }
    } catch (error) {
      console.error('Error updating color:', error);
    }
  };

  const handleBackgroundChange = async (background) => {
    try {
      // Send null explicitly to remove background
      const backgroundValue = background === null || background === '' ? null : background;
      await axios.put(`/api/chats/${chatId}/background`, { background: backgroundValue });
      setShowBackgroundPicker(false);
      // Update local state
      setCurrentChat((prev) => ({
        ...prev,
        customBackground: backgroundValue,
      }));
      if (onChatUpdate) {
        onChatUpdate();
      }
    } catch (error) {
      console.error('Error updating background:', error);
      const errorMessage = error.response?.data?.message || 'Failed to update background';
      showToast(errorMessage, 'error');
    }
  };

  const handleMute = async (mute, duration = 24) => {
    try {
      await axios.put(`/api/chats/${chatId}/mute`, { mute, duration });
      setIsMuted(mute);
      if (onChatUpdate) {
        onChatUpdate();
      }
    } catch (error) {
      console.error('Error muting chat:', error);
      alert(error.response?.data?.message || 'Failed to mute chat');
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const getOtherUser = () => {
    if (currentChat?.isGroup) return null;
    return currentChat?.otherUser;
  };

  const otherUser = getOtherUser();
  const isOtherUserOnline = otherUser && onlineUsers.has(otherUser._id);

  return (
    <div className="chat-window">
      <div
        className="chat-header"
        style={{ borderBottomColor: accentColor }}
      >
        {window.innerWidth < 768 && (
          <button className="back-button" onClick={onBack}>
            ←
          </button>
        )}
        <div 
          className="chat-header-info"
          onClick={() => {
            if (currentChat?.isGroup) {
              window.location.href = `/group/${chatId}`;
            } else if (otherUser) {
              window.location.href = `/contact/${otherUser._id}`;
            }
          }}
          style={{ cursor: 'pointer' }}
        >
          <div className="chat-header-avatar">
            {currentChat?.isGroup ? (
              <div className="group-avatar-header">
                {currentChat?.groupAvatarUrl ? (
                  <img
                    src={`${axios.defaults.baseURL || ''}${currentChat.groupAvatarUrl}`}
                    alt={currentChat.chatName}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                ) : null}
                <div style={{ display: currentChat?.groupAvatarUrl ? 'none' : 'flex' }}>👥</div>
              </div>
            ) : (
              <div className="user-avatar-header">
                {otherUser?.avatarUrl ? (
                  <img
                    src={`${axios.defaults.baseURL || ''}${otherUser.avatarUrl}`}
                    alt={otherUser.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                ) : null}
                {!otherUser?.avatarUrl && (otherUser?.name?.charAt(0).toUpperCase() || 'U')}
              </div>
            )}
            {!currentChat?.isGroup && isOtherUserOnline && (
              <div className="online-dot" />
            )}
          </div>
          <div className="chat-header-details">
            <div className="chat-header-name">{currentChat?.chatName || 'Chat'}</div>
            {currentChat?.isGroup ? (
              <div className="chat-header-status">
                {currentChat?.participants?.length || 0} participants
              </div>
            ) : (
              <div className="chat-header-status">
                {isOtherUserOnline ? 'Online' : 'Offline'}
              </div>
            )}
          </div>
        </div>
        <div className="chat-header-actions">
          {currentChat?.isGroup && (
            <button
              className="header-action-button"
              onClick={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'image/*';
                input.onchange = async (e) => {
                  const file = e.target.files[0];
                  if (file) {
                    const formData = new FormData();
                    formData.append('file', file);
                    try {
                      const uploadResponse = await axios.post('/api/upload', formData, {
                        headers: { 'Content-Type': 'multipart/form-data' },
                      });
                      await axios.put(`/api/chats/${chatId}/avatar`, {
                        avatarUrl: uploadResponse.data.mediaUrl,
                      });
                      if (onChatUpdate) {
                        onChatUpdate();
                      }
                      // Update local state
                      setCurrentChat((prev) => ({
                        ...prev,
                        groupAvatarUrl: uploadResponse.data.mediaUrl,
                      }));
                    } catch (error) {
                      console.error('Error uploading group avatar:', error);
                      alert('Failed to upload group avatar');
                    }
                  }
                };
                input.click();
              }}
              title="Change group avatar"
            >
              📷
            </button>
          )}
          <button
            className={`header-action-button ${isMuted ? 'muted' : ''}`}
            onClick={() => {
              if (isMuted) {
                handleMute(false);
              } else {
                const duration = prompt('Mute for how many hours? (default: 24)', '24');
                if (duration !== null) {
                  const hours = parseInt(duration) || 24;
                  handleMute(true, hours);
                }
              }
            }}
            title={isMuted ? 'Unmute chat' : 'Mute chat'}
          >
            {isMuted ? '🔇' : '🔊'}
          </button>
          <button
            className="header-action-button"
            onClick={() => setShowColorPicker(!showColorPicker)}
            title="Change accent color"
          >
            🎨
          </button>
          <button
            className="header-action-button"
            onClick={() => setShowBackgroundPicker(!showBackgroundPicker)}
            title="Change background"
          >
            🖼️
          </button>
        </div>
      </div>

      {showColorPicker && (
        <ColorPicker
          currentColor={accentColor}
          onColorChange={handleColorChange}
          onClose={() => setShowColorPicker(false)}
        />
      )}

      {showBackgroundPicker && (
        <BackgroundPicker
          currentBackground={customBackground}
          onBackgroundChange={handleBackgroundChange}
          onClose={() => setShowBackgroundPicker(false)}
        />
      )}

      <div 
        className="messages-container"
        style={{
          background: customBackground || undefined,
          backgroundSize: customBackground?.startsWith('url(') ? 'cover' : undefined,
          backgroundPosition: customBackground?.startsWith('url(') ? 'center' : undefined,
          backgroundRepeat: customBackground?.startsWith('url(') ? 'no-repeat' : undefined,
          backgroundAttachment: customBackground?.startsWith('url(') ? 'fixed' : undefined,
        }}
      >
        {loading ? (
          <div className="loading-messages">Loading messages...</div>
        ) : messages.length === 0 ? (
          <div className="empty-messages">
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((message) => (
            <MessageBubble
              key={message._id}
              message={message}
              isOwn={message.senderId._id === user._id}
              onReaction={handleReaction}
              onStar={handleStar}
              accentColor={accentColor}
              currentUserId={user._id}
              onReply={handleReply}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onForward={handleForward}
              onPin={handlePin}
              isPinned={message.pinned}
              replyingTo={replyingTo}
              editingMessageId={editingMessageId}
            />
          ))
        )}

        {typingUsers.size > 0 && (
          <div className="typing-indicator">
            {Array.from(typingUsers).join(', ')} {typingUsers.size === 1 ? 'is' : 'are'} typing...
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <MessageInput
        onSend={handleSendMessage}
        chatId={chatId}
        socket={socket}
        accentColor={accentColor}
        replyingTo={replyingTo}
        editingMessage={editingMessageId ? messages.find(m => m._id === editingMessageId) : null}
        onCancelReply={() => setReplyingTo(null)}
        onCancelEdit={() => setEditingMessageId(null)}
      />
    </div>
  );
};

export default ChatWindow;

