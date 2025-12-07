import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ToastProvider } from './contexts/ToastContext';
import Login from './pages/Login';
import Register from './pages/Register';
import ResetPassword from './pages/ResetPassword';
import ChatLayout from './pages/ChatLayout';
import StarredMessages from './pages/StarredMessages';
import Profile from './pages/Profile';
import ContactInfo from './pages/ContactInfo';
import GroupInfo from './pages/GroupInfo';
import PrivateRoute from './components/PrivateRoute';
import './styles/themes.css';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <SocketProvider>
          <ToastProvider>
          <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />
          <Route
            path="/"
            element={
              <PrivateRoute>
                <ChatLayout />
              </PrivateRoute>
            }
          />
          <Route
            path="/starred"
            element={
              <PrivateRoute>
                <StarredMessages />
              </PrivateRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <PrivateRoute>
                <Profile />
              </PrivateRoute>
            }
          />
          <Route
            path="/contact/:userId"
            element={
              <PrivateRoute>
                <ContactInfo />
              </PrivateRoute>
            }
          />
          <Route
            path="/group/:chatId"
            element={
              <PrivateRoute>
                <GroupInfo />
              </PrivateRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
          </ToastProvider>
      </SocketProvider>
    </AuthProvider>
    </ThemeProvider>
  );
}

export default App;

