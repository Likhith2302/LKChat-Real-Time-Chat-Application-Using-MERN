import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import './ContactInfo.css';

const ContactInfo = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [contact, setContact] = useState(null);
  const [sharedMedia, setSharedMedia] = useState({ images: [], files: [], videos: [], audio: [] });
  const [commonGroups, setCommonGroups] = useState([]);
  const [activeTab, setActiveTab] = useState('info'); // 'info', 'media', 'groups'
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      fetchContactInfo();
      fetchSharedMedia();
      fetchCommonGroups();
    }
  }, [userId]);

  const fetchContactInfo = async () => {
    try {
      const response = await axios.get(`/api/users/${userId}`);
      setContact(response.data);
    } catch (error) {
      console.error('Error fetching contact info:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSharedMedia = async () => {
    try {
      const response = await axios.get(`/api/users/${userId}/media`);
      setSharedMedia(response.data);
    } catch (error) {
      console.error('Error fetching shared media:', error);
    }
  };

  const fetchCommonGroups = async () => {
    try {
      const response = await axios.get(`/api/users/${userId}/groups`);
      setCommonGroups(response.data);
    } catch (error) {
      console.error('Error fetching common groups:', error);
    }
  };

  const handleStartChat = async () => {
    try {
      const response = await axios.post('/api/chats/private', {
        otherUserId: userId,
      });
      navigate(`/?chatId=${response.data._id}`);
    } catch (error) {
      console.error('Error creating chat:', error);
      alert('Failed to start chat');
    }
  };

  if (loading) {
    return (
      <div className="contact-info-container">
        <div className="loading">Loading...</div>
      </div>
    );
  }

  if (!contact) {
    return (
      <div className="contact-info-container">
        <div className="error">Contact not found</div>
      </div>
    );
  }

  const allMedia = [
    ...sharedMedia.images,
    ...sharedMedia.files,
    ...sharedMedia.videos,
    ...sharedMedia.audio,
  ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return (
    <div className="contact-info-container">
      <div className="contact-info-header">
        <button className="back-button" onClick={() => navigate(-1)}>
          ← Back
        </button>
        <h2>Contact Info</h2>
      </div>

      <div className="contact-info-content">
        {/* Profile Section */}
        <div className="contact-profile-section">
          <div className="contact-avatar-large">
            {contact.avatarUrl ? (
              <img
                src={`${axios.defaults.baseURL || ''}${contact.avatarUrl}`}
                alt={contact.name}
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                }}
              />
            ) : null}
            <div
              className="avatar-placeholder"
              style={{ display: contact.avatarUrl ? 'none' : 'flex' }}
            >
              {contact.name?.charAt(0).toUpperCase() || 'U'}
            </div>
          </div>
          <h3>{contact.name}</h3>
          <p className="contact-status">{contact.statusMessage || 'Available'}</p>
          {contact.isOnline ? (
            <span className="online-badge">🟢 Online</span>
          ) : (
            <span className="offline-badge">
              Last seen: {contact.lastSeen ? new Date(contact.lastSeen).toLocaleString() : 'Never'}
            </span>
          )}
        </div>

        {/* Action Buttons */}
        <div className="contact-actions">
          <button className="action-button primary" onClick={handleStartChat}>
            💬 Message
          </button>
        </div>

        {/* Tabs */}
        <div className="contact-tabs">
          <button
            className={`tab-button ${activeTab === 'info' ? 'active' : ''}`}
            onClick={() => setActiveTab('info')}
          >
            Info
          </button>
          <button
            className={`tab-button ${activeTab === 'media' ? 'active' : ''}`}
            onClick={() => setActiveTab('media')}
          >
            Media ({allMedia.length})
          </button>
          <button
            className={`tab-button ${activeTab === 'groups' ? 'active' : ''}`}
            onClick={() => setActiveTab('groups')}
          >
            Groups ({commonGroups.length})
          </button>
        </div>

        {/* Tab Content */}
        <div className="tab-content">
          {activeTab === 'info' && (
            <div className="info-tab">
              <div className="info-item">
                <label>Name</label>
                <p>{contact.name}</p>
              </div>
              {contact.email && (
                <div className="info-item">
                  <label>Email</label>
                  <p>{contact.email}</p>
                </div>
              )}
              {contact.phoneNumber && (
                <div className="info-item">
                  <label>Phone</label>
                  <p>{contact.phoneNumber}</p>
                </div>
              )}
              {contact.bio && (
                <div className="info-item">
                  <label>Bio</label>
                  <p>{contact.bio}</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'media' && (
            <div className="media-tab">
              {allMedia.length === 0 ? (
                <div className="empty-state">No shared media</div>
              ) : (
                <div className="media-grid">
                  {allMedia.map((item) => (
                    <div key={item._id} className="media-item">
                      {item.messageType === 'image' ? (
                        <img
                          src={`${axios.defaults.baseURL || ''}${item.mediaUrl}`}
                          alt="Shared media"
                          onClick={() => window.open(`${axios.defaults.baseURL || ''}${item.mediaUrl}`, '_blank')}
                        />
                      ) : (
                        <div className="file-item">
                          <div className="file-icon">📎</div>
                          <div className="file-name">
                            {item.mediaUrl.split('/').pop()}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'groups' && (
            <div className="groups-tab">
              {commonGroups.length === 0 ? (
                <div className="empty-state">No common groups</div>
              ) : (
                <div className="groups-list">
                  {commonGroups.map((group) => (
                    <div
                      key={group._id}
                      className="group-item"
                      onClick={() => navigate(`/?chatId=${group._id}`)}
                    >
                      <div className="group-avatar">👥</div>
                      <div className="group-info">
                        <div className="group-name">{group.name}</div>
                        <div className="group-participants">
                          {group.participants?.length || 0} participants
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ContactInfo;

