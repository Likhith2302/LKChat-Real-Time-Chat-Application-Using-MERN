import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Sidebar from '../components/Sidebar';
import ChatWindow from '../components/ChatWindow';
import axios from 'axios';
import './ChatLayout.css';

const ChatLayout = () => {
  const { user, logout } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedChat, setSelectedChat] = useState(null);
  const [chats, setChats] = useState([]);
  const [showSidebar, setShowSidebar] = useState(true);

  useEffect(() => {
    fetchChats();
  }, []);

  useEffect(() => {
    const chatId = searchParams.get('chatId');
    if (chatId) {
      if (chats.length > 0) {
      const chat = chats.find((c) => c._id === chatId);
      if (chat) {
        setSelectedChat(chat);
        if (window.innerWidth < 768) {
          setShowSidebar(false);
        }
        } else {
          // Chat not found in list, try to fetch it directly
          fetchChatById(chatId);
      }
      }
    } else {
      // No chatId in URL, clear selection
      setSelectedChat(null);
    }
  }, [searchParams, chats]);

  const fetchChatById = async (chatId) => {
    try {
      const response = await axios.get(`/api/chats/${chatId}`);
      setSelectedChat(response.data);
      if (window.innerWidth < 768) {
        setShowSidebar(false);
      }
    } catch (error) {
      console.error('Error fetching chat:', error);
      // Chat not found, clear URL
      setSearchParams({});
    }
  };

  const fetchChats = async (archived = false) => {
    try {
      const response = await axios.get(`/api/chats${archived ? '?archived=true' : ''}`);
      setChats(response.data);
    } catch (error) {
      console.error('Error fetching chats:', error);
    }
  };

  const handleChatSelect = (chat) => {
    setSelectedChat(chat);
    // Update URL with chatId
    setSearchParams({ chatId: chat._id });
    if (window.innerWidth < 768) {
      setShowSidebar(false);
    }
  };

  const handleBackToSidebar = () => {
    setShowSidebar(true);
    setSelectedChat(null);
    // Clear chatId from URL
    setSearchParams({});
  };

  return (
    <div className="chat-layout">
      <Sidebar
        user={user}
        chats={chats}
        selectedChat={selectedChat}
        onChatSelect={handleChatSelect}
        onLogout={logout}
        showSidebar={showSidebar}
        onRefreshChats={fetchChats}
      />
      {selectedChat ? (
        <ChatWindow
          chat={selectedChat}
          onBack={handleBackToSidebar}
          onChatUpdate={fetchChats}
        />
      ) : (
        <div className="chat-window-placeholder">
          <div className="placeholder-content">
            <img src="/logo.jpg" alt="LKChat" style={{ width: '120px', height: 'auto', marginBottom: '24px' }} />
            <h2>Welcome to <span style={{ 
              background: 'linear-gradient(135deg, #0084ff 0%, #667eea 50%, #764ba2 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              fontWeight: '800',
              letterSpacing: '-1px'
            }}>LKChat</span></h2>
            <p style={{ fontSize: '18px', fontWeight: '500', marginTop: '8px' }}>Select a chat to start messaging</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatLayout;

