import { useState, useEffect } from 'react';
import axios from 'axios';
import './CreateChatModal.css';

const CreateChatModal = ({ onClose, onChatCreated }) => {
  const [chatType, setChatType] = useState('private');
  const [groupName, setGroupName] = useState('');
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [groupSearchQuery, setGroupSearchQuery] = useState('');
  const [groupSearchResults, setGroupSearchResults] = useState([]);
  const [groupSearching, setGroupSearching] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');

  const searchUsers = async (query) => {
    if (!query || query.trim().length < 2) {
      setUsers([]);
      return;
    }

    setSearching(true);
    try {
      const response = await axios.get(`/api/users/search?q=${encodeURIComponent(query)}`);
      setUsers(response.data);
    } catch (error) {
      console.error('Error searching users:', error);
      setUsers([]);
    } finally {
      setSearching(false);
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery.trim().length >= 2) {
        searchUsers(searchQuery);
      } else {
        setUsers([]);
        setSelectedUser(null);
      }
    }, 300); // Debounce search

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const handleCreatePrivateChat = async (userId) => {
    if (!userId) {
      setError('Please select a user');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await axios.post('/api/chats/private', {
        otherUserId: userId,
      });
      onChatCreated(response.data);
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.response?.data?.error || 'Failed to create chat';
      setError(errorMsg);
      console.error('Create chat error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUserSelect = (user) => {
    setSelectedUser(user);
    setSearchQuery(user.name);
    setUsers([]);
  };

  const searchUsersForGroup = async (query) => {
    if (!query || query.trim().length < 2) {
      setGroupSearchResults([]);
      return;
    }

    setGroupSearching(true);
    try {
      const response = await axios.get(`/api/users/search?q=${encodeURIComponent(query)}`);
      // Filter out already selected users
      const filtered = response.data.filter(
        (user) => !selectedUsers.some((selected) => selected._id === user._id)
      );
      setGroupSearchResults(filtered);
    } catch (error) {
      console.error('Error searching users:', error);
      setGroupSearchResults([]);
    } finally {
      setGroupSearching(false);
    }
  };

  useEffect(() => {
    if (chatType === 'group') {
      const timeoutId = setTimeout(() => {
        if (groupSearchQuery.trim().length >= 2) {
          searchUsersForGroup(groupSearchQuery);
        } else {
          setGroupSearchResults([]);
        }
      }, 300);

      return () => clearTimeout(timeoutId);
    }
  }, [groupSearchQuery, chatType, selectedUsers]);

  const handleAddUserToGroup = (user) => {
    if (!selectedUsers.some((u) => u._id === user._id)) {
      setSelectedUsers([...selectedUsers, user]);
      setGroupSearchQuery('');
      setGroupSearchResults([]);
    }
  };

  const handleRemoveUserFromGroup = (userId) => {
    setSelectedUsers(selectedUsers.filter((u) => u._id !== userId));
  };

  const handleCreateGroupChat = async () => {
    if (!groupName.trim()) {
      setError('Please enter a group name');
      return;
    }

    if (selectedUsers.length < 1) {
      setError('Please select at least one participant');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Extract user IDs from selected users
      const participantIds = selectedUsers.map((user) => user._id);
      
      const response = await axios.post('/api/chats/group', {
        name: groupName.trim(),
        participantIds: participantIds,
      });
      onChatCreated(response.data);
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.response?.data?.error || 'Failed to create group';
      setError(errorMsg);
      console.error('Create group error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>New Chat</h2>
          <button className="close-button" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="modal-tabs">
          <button
            className={`tab ${chatType === 'private' ? 'active' : ''}`}
            onClick={() => setChatType('private')}
          >
            Private Chat
          </button>
          <button
            className={`tab ${chatType === 'group' ? 'active' : ''}`}
            onClick={() => setChatType('group')}
          >
            Group Chat
          </button>
        </div>

        {error && <div className="error-message">{error}</div>}

        {chatType === 'private' ? (
          <div className="modal-body">
            <p>Search for a user by name or email to start a private chat.</p>
            <div className="search-container">
              <input
                type="text"
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="modal-input"
              />
              {searching && <div className="search-loading">Searching...</div>}
              {users.length > 0 && (
                <div className="user-search-results">
                  {users.map((user) => (
                    <div
                      key={user._id}
                      className={`user-result-item ${selectedUser?._id === user._id ? 'selected' : ''}`}
                      onClick={() => handleUserSelect(user)}
                    >
                      <div className="user-result-avatar">
                        {user.name?.charAt(0).toUpperCase() || 'U'}
                      </div>
                      <div className="user-result-info">
                        <div className="user-result-name">{user.name}</div>
                        <div className="user-result-email">{user.email}</div>
                      </div>
                      {user.isOnline && <div className="user-result-online">●</div>}
                    </div>
                  ))}
                </div>
              )}
              {searchQuery.length >= 2 && users.length === 0 && !searching && (
                <div className="no-results">No users found</div>
              )}
            </div>
            <button
              onClick={() => handleCreatePrivateChat(selectedUser?._id)}
              disabled={loading || !selectedUser}
              className="modal-button"
            >
              {loading ? 'Creating...' : 'Create Chat'}
            </button>
          </div>
        ) : (
          <div className="modal-body">
            <input
              type="text"
              placeholder="Group name"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="modal-input"
            />
            
            <p style={{ marginTop: '16px', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
              Add Participants:
            </p>
            
            <div className="search-container">
              <input
                type="text"
                placeholder="Search by name or email..."
                value={groupSearchQuery}
                onChange={(e) => setGroupSearchQuery(e.target.value)}
                className="modal-input"
              />
              {groupSearching && <div className="search-loading">Searching...</div>}
              {groupSearchResults.length > 0 && (
                <div className="user-search-results">
                  {groupSearchResults.map((user) => (
                    <div
                      key={user._id}
                      className="user-result-item"
                      onClick={() => handleAddUserToGroup(user)}
                    >
                      <div className="user-result-avatar">
                        {user.name?.charAt(0).toUpperCase() || 'U'}
                      </div>
                      <div className="user-result-info">
                        <div className="user-result-name">{user.name}</div>
                        <div className="user-result-email">{user.email}</div>
                      </div>
                      {user.isOnline && <div className="user-result-online">●</div>}
                    </div>
                  ))}
                </div>
              )}
              {groupSearchQuery.length >= 2 && groupSearchResults.length === 0 && !groupSearching && (
                <div className="no-results">No users found</div>
              )}
            </div>

            {selectedUsers.length > 0 && (
              <div className="selected-users-list">
                <p style={{ fontSize: '14px', marginBottom: '8px', fontWeight: '500' }}>
                  Selected ({selectedUsers.length}):
                </p>
                <div className="selected-users">
                  {selectedUsers.map((user) => (
                    <div key={user._id} className="selected-user-chip">
                      <span>{user.name}</span>
                      <button
                        onClick={() => handleRemoveUserFromGroup(user._id)}
                        className="remove-user-button"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={handleCreateGroupChat}
              disabled={loading || !groupName.trim() || selectedUsers.length < 1}
              className="modal-button"
            >
              {loading ? 'Creating...' : 'Create Group'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CreateChatModal;

