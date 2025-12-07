import { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext();

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within SocketProvider');
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const { user } = useAuth();
  const [socket, setSocket] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState(new Set());

  useEffect(() => {
    if (user) {
      const token = localStorage.getItem('token');
      if (!token) return;

      // Auto-detect Socket.IO URL based on current hostname
      const getSocketUrl = () => {
        if (import.meta.env.VITE_API_BASE_URL) {
          return import.meta.env.VITE_API_BASE_URL;
        }
        const hostname = window.location.hostname;
        if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
          const socketUrl = `http://${hostname}:5000`;
          console.log('Using network Socket.IO URL:', socketUrl);
          return socketUrl;
        }
        console.log('Using localhost Socket.IO URL');
        return 'http://localhost:5000';
      };

      const newSocket = io(getSocketUrl(), {
        auth: {
          token: token,
        },
        transports: ['websocket', 'polling'],
      });

      newSocket.on('connect', () => {
        console.log('Socket connected');
        // Store user ID for easy access
        newSocket.userId = user._id;
      });

      newSocket.on('disconnect', () => {
        console.log('Socket disconnected');
      });

      newSocket.on('user_online', (data) => {
        setOnlineUsers((prev) => new Set([...prev, data.userId]));
      });

      newSocket.on('user_offline', (data) => {
        setOnlineUsers((prev) => {
          const newSet = new Set(prev);
          newSet.delete(data.userId);
          return newSet;
        });
      });

      newSocket.on('avatar_updated', (data) => {
        // Trigger a page refresh or update user data
        window.dispatchEvent(new CustomEvent('avatarUpdated', { detail: data }));
      });

      newSocket.on('user_profile_updated', (data) => {
        // Trigger a page refresh or update user data
        window.dispatchEvent(new CustomEvent('profileUpdated', { detail: data }));
      });

      newSocket.on('group_avatar_updated', (data) => {
        // Trigger chat list refresh
        window.dispatchEvent(new CustomEvent('groupAvatarUpdated', { detail: data }));
      });

      setSocket(newSocket);

      return () => {
        newSocket.close();
      };
    }
  }, [user]);

  const value = {
    socket,
    onlineUsers,
  };

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
};

