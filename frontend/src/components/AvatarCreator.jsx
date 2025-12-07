import { useState, useRef } from 'react';
import './AvatarCreator.css';

const AvatarCreator = ({ currentAvatar, userName, onSelect, onClose }) => {
  const [selectedOption, setSelectedOption] = useState('upload'); // 'upload', 'generate', 'preset'
  const [selectedColor, setSelectedColor] = useState('#667eea');
  const [selectedPreset, setSelectedPreset] = useState(null);
  const fileInputRef = useRef(null);

  // Color options for generated avatars
  const colorOptions = [
    '#667eea', '#764ba2', '#f093fb', '#4facfe', '#43e97b',
    '#fa709a', '#fee140', '#30cfd0', '#a8edea', '#fed6e3',
    '#ff9a9e', '#fecfef', '#fecfef', '#ffecd2', '#fcb69f'
  ];

  // Preset avatar emojis
  const presetAvatars = [
    '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂',
    '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩',
    '😘', '😗', '😚', '😙', '😋', '😛', '😜', '🤪',
    '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨',
    '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥',
    '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕'
  ];

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        onSelect(event.target.result, 'upload');
      };
      reader.readAsDataURL(file);
    }
  };

  const generateAvatarFromInitials = () => {
    const initials = userName
      ? userName
          .split(' ')
          .map((n) => n[0])
          .join('')
          .toUpperCase()
          .slice(0, 2)
      : 'U';

    // Create avatar using canvas
    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 200;
    const ctx = canvas.getContext('2d');

    // Draw background circle
    ctx.fillStyle = selectedColor;
    ctx.beginPath();
    ctx.arc(100, 100, 100, 0, 2 * Math.PI);
    ctx.fill();

    // Draw initials
    ctx.fillStyle = 'white';
    ctx.font = 'bold 80px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(initials, 100, 100);

    // Convert to data URL
    const dataUrl = canvas.toDataURL('image/png');
    onSelect(dataUrl, 'generate');
  };

  const handlePresetSelect = (emoji) => {
    setSelectedPreset(emoji);
    // Convert emoji to data URL using canvas
    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 200;
    const ctx = canvas.getContext('2d');
    
    // Draw background circle
    ctx.fillStyle = '#f0f0f0';
    ctx.beginPath();
    ctx.arc(100, 100, 100, 0, 2 * Math.PI);
    ctx.fill();
    
    // Draw emoji
    ctx.font = '120px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(emoji, 100, 100);
    
    const dataUrl = canvas.toDataURL('image/png');
    onSelect(dataUrl, 'preset');
  };

  return (
    <div className="avatar-creator-modal" onClick={onClose}>
      <div className="avatar-creator-content" onClick={(e) => e.stopPropagation()}>
        <div className="avatar-creator-header">
          <h2>Create Avatar</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="avatar-creator-tabs">
          <button
            className={`tab-button ${selectedOption === 'upload' ? 'active' : ''}`}
            onClick={() => setSelectedOption('upload')}
          >
            📷 Upload
          </button>
          <button
            className={`tab-button ${selectedOption === 'preset' ? 'active' : ''}`}
            onClick={() => setSelectedOption('preset')}
          >
            😊 Presets
          </button>
          <button
            className={`tab-button ${selectedOption === 'generate' ? 'active' : ''}`}
            onClick={() => setSelectedOption('generate')}
            title="Coming Soon"
          >
            🎨 Generate <span style={{ fontSize: '10px', opacity: 0.7 }}>(Soon)</span>
          </button>
        </div>

        <div className="avatar-creator-body">
          {selectedOption === 'upload' && (
            <div className="avatar-option">
              <p>Upload your own image</p>
              <button
                className="upload-button"
                onClick={() => fileInputRef.current?.click()}
              >
                Choose Image
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />
            </div>
          )}

          {selectedOption === 'generate' && (
            <div className="avatar-option">
              <div className="coming-soon-badge">🚀 Coming Soon</div>
              <p>Generate custom avatar from your initials with color customization</p>
              <div className="generated-avatar-preview">
                <div
                  className="preview-avatar"
                  style={{ backgroundColor: selectedColor }}
                >
                  {userName
                    ? userName
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .toUpperCase()
                        .slice(0, 2)
                    : 'U'}
                </div>
              </div>
              <div className="color-picker-grid">
                {colorOptions.map((color) => (
                  <button
                    key={color}
                    className={`color-option ${selectedColor === color ? 'selected' : ''}`}
                    style={{ backgroundColor: color }}
                    onClick={() => setSelectedColor(color)}
                    title={color}
                    disabled
                  />
                ))}
              </div>
              <button className="generate-button" onClick={generateAvatarFromInitials} disabled>
                Generate Avatar (Coming Soon)
              </button>
              <p style={{ fontSize: '12px', color: '#999', marginTop: '10px' }}>
                This feature will be available in a future update
              </p>
            </div>
          )}

          {selectedOption === 'preset' && (
            <div className="avatar-option">
              <p>Choose from preset avatars</p>
              <div className="preset-avatar-grid">
                {presetAvatars.map((emoji, index) => (
                  <button
                    key={index}
                    className={`preset-avatar ${selectedPreset === emoji ? 'selected' : ''}`}
                    onClick={() => handlePresetSelect(emoji)}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AvatarCreator;

