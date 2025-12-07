import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import AvatarCreator from '../components/AvatarCreator';
import './Profile.css';

const Profile = () => {
  const { user, checkAuth } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showAvatarCreator, setShowAvatarCreator] = useState(false);
  const [notification, setNotification] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    bio: '',
    statusMessage: '',
    phoneNumber: '',
    avatarUrl: '',
  });

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        bio: user.bio || '',
        statusMessage: user.statusMessage || 'Available',
        phoneNumber: user.phoneNumber || '',
        avatarUrl: user.avatarUrl || '',
      });
    }
  }, [user]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAvatarClick = () => {
    setShowAvatarCreator(true);
  };

  const handleAvatarSelect = async (avatarData, type) => {
    setShowAvatarCreator(false);
    setLoading(true);

    try {
      let newAvatarUrl = '';

      if (type === 'upload') {
        // For uploaded images, we need to convert data URL to file and upload
        const response = await fetch(avatarData);
        const blob = await response.blob();
        const file = new File([blob], 'avatar.png', { type: 'image/png' });
        
        const uploadFormData = new FormData();
        uploadFormData.append('file', file);

        const uploadResponse = await axios.post('/api/upload', uploadFormData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });

        newAvatarUrl = uploadResponse.data.mediaUrl;
      } else if (type === 'generate' || type === 'preset') {
        // For generated/preset avatars, convert data URL to blob and upload
        const response = await fetch(avatarData);
        const blob = await response.blob();
        const file = new File([blob], 'avatar.png', { type: 'image/png' });
        
        const uploadFormData = new FormData();
        uploadFormData.append('file', file);

        const uploadResponse = await axios.post('/api/upload', uploadFormData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });

        newAvatarUrl = uploadResponse.data.mediaUrl;
      }

      setFormData((prev) => ({ ...prev, avatarUrl: newAvatarUrl }));
      
      // Auto-save avatar
      try {
        await axios.put('/api/auth/profile', { ...formData, avatarUrl: newAvatarUrl });
        await checkAuth();
        setNotification({ type: 'success', message: 'Avatar updated successfully!' });
        setTimeout(() => setNotification(null), 3000);
      } catch (error) {
        console.error('Error saving avatar:', error);
        setNotification({ type: 'error', message: 'Avatar created but failed to save. Please click Save Changes.' });
        setTimeout(() => setNotification(null), 3000);
      }
    } catch (error) {
      console.error('Error creating avatar:', error);
      setNotification({ type: 'error', message: 'Failed to create avatar. Please try again.' });
      setTimeout(() => setNotification(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setNotification({ type: 'error', message: 'Please select an image file' });
      setTimeout(() => setNotification(null), 3000);
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setNotification({ type: 'error', message: 'Image size should be less than 5MB' });
      setTimeout(() => setNotification(null), 3000);
      return;
    }

    setLoading(true);
    try {
      const uploadFormData = new FormData();
      uploadFormData.append('file', file);

      const response = await axios.post('/api/upload', uploadFormData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const newAvatarUrl = response.data.mediaUrl;
      setFormData((prev) => ({ ...prev, avatarUrl: newAvatarUrl }));
      
      // Auto-save avatar immediately after upload
      try {
        await axios.put('/api/auth/profile', { ...formData, avatarUrl: newAvatarUrl });
        await checkAuth(); // Refresh user data
        setNotification({ type: 'success', message: 'Profile picture updated successfully!' });
        setTimeout(() => setNotification(null), 3000);
      } catch (error) {
        console.error('Error saving avatar:', error);
        setNotification({ type: 'error', message: 'Avatar uploaded but failed to save. Please click Save Changes.' });
        setTimeout(() => setNotification(null), 3000);
      }
    } catch (error) {
      console.error('Error uploading avatar:', error);
      setNotification({ type: 'error', message: 'Failed to upload avatar. Please try again.' });
      setTimeout(() => setNotification(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const response = await axios.put('/api/auth/profile', formData);
      await checkAuth(); // Refresh user data
      setNotification({ type: 'success', message: 'Profile updated successfully!' });
      setTimeout(() => setNotification(null), 3000);
    } catch (error) {
      console.error('Error updating profile:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to update profile. Please try again.';
      setNotification({ type: 'error', message: errorMessage });
      setTimeout(() => setNotification(null), 3000);
    } finally {
      setSaving(false);
    }
  };

  // Check if form has changes
  const hasChanges = () => {
    if (!user) return false;
    return (
      formData.name !== (user.name || '') ||
      formData.bio !== (user.bio || '') ||
      formData.statusMessage !== (user.statusMessage || 'Available') ||
      formData.phoneNumber !== (user.phoneNumber || '') ||
      formData.avatarUrl !== (user.avatarUrl || '')
    );
  };

  return (
    <div className="profile-page">
      <div className="profile-container">
        {notification && (
          <div className={`profile-notification ${notification.type}`}>
            {notification.type === 'success' ? '✅' : '❌'} {notification.message}
            <button 
              className="notification-close"
              onClick={() => setNotification(null)}
            >
              ×
            </button>
          </div>
        )}
        <div className="profile-header">
          <button className="back-button" onClick={() => navigate(-1)}>
            ← Back
          </button>
          <h1>Profile</h1>
        </div>

        <form onSubmit={handleSubmit} className="profile-form">
          <div className="profile-avatar-section">
            <p className="avatar-hint">Click to create avatar</p>
            <div className="avatar-container" onClick={handleAvatarClick}>
              {loading ? (
                <div className="avatar-loading">Uploading...</div>
              ) : formData.avatarUrl ? (
                <img
                  src={`${axios.defaults.baseURL || ''}${formData.avatarUrl}`}
                  alt="Avatar"
                  className="profile-avatar"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
              ) : null}
              <div
                className="avatar-placeholder"
                style={{ display: formData.avatarUrl ? 'none' : 'flex' }}
              >
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="avatar-overlay">
                <span className="avatar-edit-icon">✨</span>
                <span className="avatar-edit-text">Create Avatar</span>
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              style={{ display: 'none' }}
            />
          </div>

          {showAvatarCreator && (
            <AvatarCreator
              currentAvatar={formData.avatarUrl}
              userName={formData.name || user?.name}
              onSelect={handleAvatarSelect}
              onClose={() => setShowAvatarCreator(false)}
            />
          )}

          <div className="form-group">
            <label htmlFor="name">Name</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              required
              maxLength={50}
            />
          </div>

          <div className="form-group">
            <label htmlFor="bio">Bio</label>
            <textarea
              id="bio"
              name="bio"
              value={formData.bio}
              onChange={handleInputChange}
              placeholder="Tell us about yourself..."
              maxLength={150}
              rows={3}
            />
            <div className="char-count">{formData.bio.length}/150</div>
          </div>

          <div className="form-group">
            <label htmlFor="statusMessage">Status Message</label>
            <input
              type="text"
              id="statusMessage"
              name="statusMessage"
              value={formData.statusMessage}
              onChange={handleInputChange}
              placeholder="Available"
              maxLength={50}
            />
          </div>

          <div className="form-group">
            <label htmlFor="phoneNumber">Phone Number (Optional)</label>
            <input
              type="tel"
              id="phoneNumber"
              name="phoneNumber"
              value={formData.phoneNumber}
              onChange={handleInputChange}
              placeholder="+1234567890"
            />
          </div>

          <div className="form-actions">
            <button type="button" onClick={() => navigate(-1)} className="cancel-button">
              Cancel
            </button>
            <button 
              type="submit" 
              className={`save-button ${hasChanges() ? 'has-changes' : ''}`} 
              disabled={saving || !hasChanges()}
              title={!hasChanges() ? 'No changes to save' : 'Save your changes'}
            >
              {saving ? 'Saving...' : '💾 Save Changes'}
            </button>
          </div>
        </form>

        {/* Floating save button for mobile */}
        {hasChanges() && (
          <div className="floating-save-button">
            <button 
              onClick={(e) => {
                e.preventDefault();
                handleSubmit(e);
              }}
              className="floating-save-btn"
              disabled={saving}
            >
              {saving ? '⏳' : '💾 Save'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;

