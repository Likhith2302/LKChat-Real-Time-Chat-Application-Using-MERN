import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { format } from 'date-fns';
import './StarredMessages.css';

const StarredMessages = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [starredMessages, setStarredMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStarredMessages();
  }, []);

  const fetchStarredMessages = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/messages/starred');
      setStarredMessages(response.data);
    } catch (error) {
      console.error('Error fetching starred messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMessageClick = (message) => {
    // Navigate to chat with the message's chat
    const chatId = typeof message.chatId === 'object' ? message.chatId._id : message.chatId;
    navigate(`/?chatId=${chatId}`);
  };

  if (loading) {
    return (
      <div className="starred-messages-page">
        <div className="loading">Loading starred messages...</div>
      </div>
    );
  }

  return (
    <div className="starred-messages-page">
      <div className="starred-header">
        <Link to="/" className="back-link">
          ← Back to Chats
        </Link>
        <h1>⭐ Starred Messages</h1>
        <p className="starred-count">
          {starredMessages.length} {starredMessages.length === 1 ? 'message' : 'messages'}
        </p>
      </div>

      <div className="starred-list">
        {starredMessages.length === 0 ? (
          <div className="empty-starred">
            <p>No starred messages yet.</p>
            <p className="empty-hint">Star important messages to find them quickly!</p>
          </div>
        ) : (
          starredMessages.map((message) => (
            <div
              key={message._id}
              className="starred-item"
              onClick={() => handleMessageClick(message)}
            >
              <div className="starred-item-header">
                <div className="starred-sender">
                  {message.senderId?.name || 'Unknown'}
                </div>
                <div className="starred-chat-name">
                  {message.chatId?.isGroup
                    ? message.chatId?.name
                    : 'Private Chat'}
                </div>
                <div className="starred-time">
                  {format(new Date(message.createdAt), 'MMM d, yyyy HH:mm')}
                </div>
              </div>
              <div className="starred-content">
                {message.mediaUrl ? (
                  <span className="starred-media">
                    {message.messageType === 'image' ? '📷 Image' : '📎 File'}
                  </span>
                ) : (
                  message.content
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default StarredMessages;

