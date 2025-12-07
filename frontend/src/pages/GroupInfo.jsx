import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import './GroupInfo.css';

const GroupInfo = () => {
  const { chatId } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [group, setGroup] = useState(null);
  const [sharedMedia, setSharedMedia] = useState({ images: [], files: [], videos: [], audio: [] });
  const [activeTab, setActiveTab] = useState('info'); // 'info', 'participants', 'media'
  const [loading, setLoading] = useState(true);
  const [editingName, setEditingName] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [saving, setSaving] = useState(false);
  const [showAddParticipant, setShowAddParticipant] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (chatId) {
      fetchGroupInfo();
      fetchSharedMedia();
    }
  }, [chatId]);

  const fetchGroupInfo = async () => {
    try {
      const response = await axios.get(`/api/chats/${chatId}`);
      setGroup(response.data);
      setGroupName(response.data.name || '');
    } catch (error) {
      console.error('Error fetching group info:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSharedMedia = async () => {
    try {
      const response = await axios.get(`/api/chats/${chatId}/media`);
      setSharedMedia(response.data);
    } catch (error) {
      console.error('Error fetching shared media:', error);
    }
  };

  const handleUpdateGroupName = async () => {
    if (!groupName.trim()) {
      alert('Group name cannot be empty');
      return;
    }

    setSaving(true);
    try {
      await axios.put(`/api/chats/${chatId}/name`, { name: groupName.trim() });
      setGroup((prev) => ({ ...prev, name: groupName.trim() }));
      setEditingName(false);
    } catch (error) {
      console.error('Error updating group name:', error);
      alert(error.response?.data?.message || 'Failed to update group name');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateAvatar = async () => {
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
          fetchGroupInfo();
        } catch (error) {
          console.error('Error uploading group avatar:', error);
          alert('Failed to upload group avatar');
        }
      }
    };
    input.click();
  };

  const searchUsers = async (query) => {
    if (!query || query.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const response = await axios.get(`/api/users/search?q=${encodeURIComponent(query)}`);
      // Filter out users already in the group
      const filtered = response.data.filter(
        (user) => !group?.participants?.some((p) => p._id === user._id)
      );
      setSearchResults(filtered);
    } catch (error) {
      console.error('Error searching users:', error);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  useEffect(() => {
    if (showAddParticipant) {
      const timeoutId = setTimeout(() => {
        if (searchQuery.trim().length >= 2) {
          searchUsers(searchQuery);
        } else {
          setSearchResults([]);
        }
      }, 300);

      return () => clearTimeout(timeoutId);
    }
  }, [searchQuery, showAddParticipant, group]);

  const handleAddParticipant = async (userId) => {
    try {
      await axios.post(`/api/chats/${chatId}/participants`, { userId });
      fetchGroupInfo();
      setShowAddParticipant(false);
      setSearchQuery('');
      setSearchResults([]);
    } catch (error) {
      console.error('Error adding participant:', error);
      alert(error.response?.data?.message || 'Failed to add participant');
    }
  };

  const handleRemoveParticipant = async (userId) => {
    if (!confirm('Remove this participant from the group?')) {
      return;
    }

    try {
      await axios.delete(`/api/chats/${chatId}/participants/${userId}`);
      fetchGroupInfo();
    } catch (error) {
      console.error('Error removing participant:', error);
      alert(error.response?.data?.message || 'Failed to remove participant');
    }
  };

  const isAdmin = group?.participants?.some(
    (p) => p._id === currentUser._id
  );

  if (loading) {
    return (
      <div className="group-info-container">
        <div className="loading">Loading...</div>
      </div>
    );
  }

  if (!group || !group.isGroup) {
    return (
      <div className="group-info-container">
        <div className="error">Group not found</div>
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
    <div className="group-info-container">
      <div className="group-info-header">
        <button className="back-button" onClick={() => navigate(-1)}>
          ← Back
        </button>
        <h2>Group Info</h2>
      </div>

      <div className="group-info-content">
        {/* Profile Section */}
        <div className="group-profile-section">
          <div className="group-avatar-large" onClick={handleUpdateAvatar} style={{ cursor: 'pointer' }}>
            {group.groupAvatarUrl ? (
              <img
                src={`${axios.defaults.baseURL || ''}${group.groupAvatarUrl}`}
                alt={group.name}
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                }}
              />
            ) : null}
            <div
              className="avatar-placeholder"
              style={{ display: group.groupAvatarUrl ? 'none' : 'flex' }}
            >
              👥
            </div>
            <div className="avatar-edit-overlay">
              <span>📷</span>
            </div>
          </div>
          {editingName ? (
            <div className="name-edit-container">
              <input
                type="text"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                className="name-input"
                autoFocus
                maxLength={50}
              />
              <div className="name-edit-actions">
                <button
                  onClick={() => {
                    setEditingName(false);
                    setGroupName(group.name);
                  }}
                  className="cancel-button"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateGroupName}
                  disabled={saving || !groupName.trim()}
                  className="save-button"
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          ) : (
            <div className="name-display-container">
              <h3>{group.name}</h3>
              <button
                onClick={() => setEditingName(true)}
                className="edit-name-button"
                title="Edit group name"
              >
                ✏️
              </button>
            </div>
          )}
          <p className="group-meta">{group.participants?.length || 0} participants</p>
        </div>

        {/* Tabs */}
        <div className="group-tabs">
          <button
            className={`tab-button ${activeTab === 'info' ? 'active' : ''}`}
            onClick={() => setActiveTab('info')}
          >
            Info
          </button>
          <button
            className={`tab-button ${activeTab === 'participants' ? 'active' : ''}`}
            onClick={() => setActiveTab('participants')}
          >
            Participants ({group.participants?.length || 0})
          </button>
          <button
            className={`tab-button ${activeTab === 'media' ? 'active' : ''}`}
            onClick={() => setActiveTab('media')}
          >
            Media ({allMedia.length})
          </button>
        </div>

        {/* Tab Content */}
        <div className="tab-content">
          {activeTab === 'info' && (
            <div className="info-tab">
              <div className="info-item">
                <label>Group Name</label>
                <p>{group.name}</p>
              </div>
              <div className="info-item">
                <label>Created</label>
                <p>{new Date(group.createdAt).toLocaleDateString()}</p>
              </div>
              <div className="info-item">
                <label>Participants</label>
                <p>{group.participants?.length || 0} members</p>
              </div>
            </div>
          )}

          {activeTab === 'participants' && (
            <div className="participants-tab">
              {showAddParticipant && (
                <div className="add-participant-section">
                  <input
                    type="text"
                    placeholder="Search users to add..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="search-input"
                  />
                  {searching && <div className="search-loading">Searching...</div>}
                  {searchResults.length > 0 && (
                    <div className="search-results">
                      {searchResults.map((user) => (
                        <div
                          key={user._id}
                          className="user-result-item"
                          onClick={() => handleAddParticipant(user._id)}
                        >
                          <div className="user-avatar-small">
                            {user.avatarUrl ? (
                              <img
                                src={`${axios.defaults.baseURL || ''}${user.avatarUrl}`}
                                alt={user.name}
                                style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                  e.target.nextSibling.style.display = 'flex';
                                }}
                              />
                            ) : null}
                            {!user.avatarUrl && (user.name?.charAt(0).toUpperCase() || 'U')}
                          </div>
                          <div className="user-info">
                            <div className="user-name">{user.name}</div>
                            <div className="user-email">{user.email}</div>
                          </div>
                          <button className="add-button">+ Add</button>
                        </div>
                      ))}
                    </div>
                  )}
                  <button
                    onClick={() => {
                      setShowAddParticipant(false);
                      setSearchQuery('');
                      setSearchResults([]);
                    }}
                    className="cancel-add-button"
                  >
                    Cancel
                  </button>
                </div>
              )}

              {!showAddParticipant && (
                <button
                  onClick={() => setShowAddParticipant(true)}
                  className="add-participant-button"
                >
                  + Add Participant
                </button>
              )}

              <div className="participants-list">
                {group.participants?.map((participant) => (
                  <div key={participant._id} className="participant-item">
                    <div className="participant-avatar">
                      {participant.avatarUrl ? (
                        <img
                          src={`${axios.defaults.baseURL || ''}${participant.avatarUrl}`}
                          alt={participant.name}
                          style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      {!participant.avatarUrl && (participant.name?.charAt(0).toUpperCase() || 'U')}
                    </div>
                    <div className="participant-info">
                      <div className="participant-name">
                        {participant.name}
                        {participant._id === currentUser._id && (
                          <span className="you-badge"> (You)</span>
                        )}
                      </div>
                      <div className="participant-email">{participant.email}</div>
                    </div>
                    {participant._id !== currentUser._id && (
                      <button
                        onClick={() => handleRemoveParticipant(participant._id)}
                        className="remove-participant-button"
                        title="Remove participant"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>
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
        </div>
      </div>
    </div>
  );
};

export default GroupInfo;

