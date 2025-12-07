import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import './Auth.css';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);
  const [forgotPasswordMessage, setForgotPasswordMessage] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login(email, password);

    if (result.success) {
      navigate('/');
    } else {
      setError(result.message);
    }

    setLoading(false);
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-logo">
          <img src="/logo.jpg" alt="LKChat" />
        </div>
        <h2>Welcome Back to <span style={{ 
          background: 'linear-gradient(135deg, #0084ff 0%, #667eea 50%, #764ba2 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          fontWeight: '800'
        }}>LKChat</span></h2>
        <p className="auth-subtitle">Sign in to continue</p>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="Enter your email"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <div className="password-input-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Enter your password"
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
          </div>

          <div className="forgot-password-link">
            <button
              type="button"
              onClick={() => setShowForgotPassword(true)}
              className="link-button"
            >
              Forgot Password?
            </button>
          </div>

          <button type="submit" disabled={loading} className="auth-button">
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        {showForgotPassword && (
          <div className="forgot-password-modal">
            <div className="forgot-password-content">
              <h3>Reset Password</h3>
              <p>Enter your email address and we'll send you a link to reset your password.</p>
              {forgotPasswordMessage && (
                <div className={`forgot-password-message ${
                  forgotPasswordMessage.includes('✅') 
                    ? 'success' 
                    : forgotPasswordMessage.includes('⚠️')
                    ? 'warning'
                    : 'error'
                }`}>
                  {forgotPasswordMessage.split('Reset link:')[0]}
                  {forgotPasswordMessage.includes('Reset link:') && (
                    <div style={{ marginTop: '10px', wordBreak: 'break-all' }}>
                      <p style={{ margin: '5px 0', fontSize: '12px', color: '#666' }}>
                        Email not configured. Use this link to reset password:
                      </p>
                      <a 
                        href={forgotPasswordMessage.split('Reset link: ')[1]?.split(' ')[0]} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        style={{ color: '#667eea', textDecoration: 'underline', fontSize: '13px' }}
                      >
                        {forgotPasswordMessage.split('Reset link: ')[1]?.split(' ')[0]}
                      </a>
                    </div>
                  )}
                </div>
              )}
              <input
                type="email"
                placeholder="Enter your email"
                value={forgotPasswordEmail}
                onChange={(e) => setForgotPasswordEmail(e.target.value)}
                className="forgot-password-input"
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !forgotPasswordLoading) {
                    e.preventDefault();
                    document.querySelector('.forgot-password-actions .auth-button')?.click();
                  }
                }}
              />
              <div className="forgot-password-actions">
                <button
                  onClick={async () => {
                    if (!forgotPasswordEmail) {
                      setForgotPasswordMessage('Please enter your email address');
                      return;
                    }
                    setForgotPasswordLoading(true);
                    setForgotPasswordMessage('');
                    try {
                      const response = await axios.post('/api/auth/forgot-password', {
                        email: forgotPasswordEmail,
                      });
                      
                      // If email was sent successfully, show success message
                      if (response.data.emailSent || !response.data.resetLink) {
                        setForgotPasswordMessage('✅ ' + response.data.message);
                        setTimeout(() => {
                          setShowForgotPassword(false);
                          setForgotPasswordEmail('');
                          setForgotPasswordMessage('');
                        }, 5000);
                      } else {
                        // Email failed - show the reset link as fallback
                        setForgotPasswordMessage(
                          `⚠️ Email not configured. Reset link: ${response.data.resetLink}`
                        );
                      }
                    } catch (error) {
                      const errorMsg = error.response?.data?.message || 'Failed to send reset email. Please try again.';
                      setForgotPasswordMessage('❌ ' + errorMsg);
                    } finally {
                      setForgotPasswordLoading(false);
                    }
                  }}
                  disabled={forgotPasswordLoading}
                  className="auth-button"
                >
                  {forgotPasswordLoading ? 'Sending...' : 'Send Reset Link'}
                </button>
                <button
                  onClick={() => {
                    setShowForgotPassword(false);
                    setForgotPasswordEmail('');
                    setForgotPasswordMessage('');
                  }}
                  className="cancel-button"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        <p className="auth-footer">
          Don't have an account? <Link to="/register">Sign up</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;

