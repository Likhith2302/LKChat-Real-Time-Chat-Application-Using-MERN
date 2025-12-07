import { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Auto-detect API base URL based on current hostname
  const getApiBaseUrl = () => {
    if (import.meta.env.VITE_API_BASE_URL) {
      return import.meta.env.VITE_API_BASE_URL;
    }
    // If accessed via IP address, use that IP for backend
    const hostname = window.location.hostname;
    const port = window.location.port;
    
    // If accessed via IP address (not localhost), use that IP for backend
    if (hostname !== 'localhost' && hostname !== '127.0.0.1' && hostname !== '') {
      const backendUrl = `http://${hostname}:5000`;
      console.log('🌐 Using network API URL:', backendUrl);
      console.log('📱 Accessing from:', window.location.href);
      return backendUrl;
    }
    // For localhost, use relative URL (will be proxied by Vite)
    console.log('🏠 Using localhost API (proxied)');
    return '';
  };

  const API_BASE_URL = getApiBaseUrl();

  // Configure axios defaults
  axios.defaults.baseURL = API_BASE_URL;
  axios.defaults.withCredentials = true;

  // Add axios interceptor for better error handling
  axios.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
        console.error('🌐 Network Error:', {
          message: error.message,
          baseURL: API_BASE_URL,
          url: error.config?.url,
          hostname: window.location.hostname,
        });
        // Provide more helpful error message with network IP
        const hostname = window.location.hostname;
        const backendUrl = hostname !== 'localhost' && hostname !== '127.0.0.1' 
          ? `http://${hostname}:5000`
          : 'http://localhost:5000';
        
        error.userMessage = `Network Error: Cannot connect to server.
Please ensure:
- The backend server is running
- Both devices are on the same network
- Windows Firewall allows connections on port 5000
- Try accessing: ${backendUrl}`;
      }
      return Promise.reject(error);
    }
  );

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        const response = await axios.get('/api/auth/me');
        setUser(response.data);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      localStorage.removeItem('token');
      delete axios.defaults.headers.common['Authorization'];
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      const response = await axios.post('/api/auth/login', { email, password });
      const { token, ...userData } = response.data;
      
      if (token) {
        localStorage.setItem('token', token);
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      }
      
      setUser(userData);
      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      let errorMessage = error.userMessage || 
                        error.response?.data?.message || 
                        error.response?.data?.error ||
                        error.message;
      
      // Provide more specific network error messages
      if (error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
        errorMessage = `Network Error: Cannot connect to server. Please ensure:
- The backend server is running
- Both devices are on the same network
- Windows Firewall allows connections on port 5000
- Try accessing: ${API_BASE_URL || 'http://[server-ip]:5000'}`;
      }
      
      return {
        success: false,
        message: errorMessage || 'Login failed. Please check if the server is running.',
      };
    }
  };

  const register = async (name, email, password) => {
    try {
      const response = await axios.post('/api/auth/register', {
        name,
        email,
        password,
      });
      const { token, ...userData } = response.data;
      
      if (token) {
        localStorage.setItem('token', token);
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      }
      
      setUser(userData);
      return { success: true };
    } catch (error) {
      console.error('Registration error:', error);
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error ||
                          error.message ||
                          'Registration failed. Please check if the server is running.';
      return {
        success: false,
        message: errorMessage,
      };
    }
  };

  const logout = async () => {
    try {
      await axios.post('/api/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('token');
      delete axios.defaults.headers.common['Authorization'];
      setUser(null);
    }
  };

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    checkAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

