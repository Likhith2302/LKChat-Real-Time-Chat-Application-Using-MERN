import { useState } from 'react';
import axios from 'axios';
import './BackgroundPicker.css';

const BackgroundPicker = ({ currentBackground, onBackgroundChange, onClose }) => {
  const [uploading, setUploading] = useState(false);

  const presetBackgrounds = [
    { type: 'none', label: 'None', value: null },
    { type: 'gradient', label: 'Blue Gradient', value: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
    { type: 'gradient', label: 'Sunset', value: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' },
    { type: 'gradient', label: 'Ocean', value: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' },
    { type: 'gradient', label: 'Forest', value: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)' },
    { type: 'gradient', label: 'Warm', value: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)' },
    { type: 'gradient', label: 'Cool', value: 'linear-gradient(135deg, #30cfd0 0%, #330867 100%)' },
    { type: 'gradient', label: 'Purple', value: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)' },
    { type: 'gradient', label: 'Dark', value: 'linear-gradient(135deg, #2c3e50 0%, #34495e 100%)' },
    { type: 'gradient', label: 'Light', value: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)' },
  ];

  const handlePresetSelect = (background) => {
    onBackgroundChange(background);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image size should be less than 5MB');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await axios.post('/api/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      // Use the uploaded image URL as background
      const imageUrl = `${axios.defaults.baseURL || ''}${response.data.mediaUrl}`;
      onBackgroundChange(`url(${imageUrl})`);
    } catch (error) {
      console.error('Error uploading background:', error);
      alert('Failed to upload background image');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="background-picker-overlay" onClick={onClose}>
      <div className="background-picker" onClick={(e) => e.stopPropagation()}>
        <div className="background-picker-header">
          <h3>Choose Background</h3>
          <button className="close-background-picker" onClick={onClose}>
            ×
          </button>
        </div>
        
        <div className="background-picker-section">
          <label className="background-picker-label">Preset Backgrounds</label>
          <div className="background-picker-grid">
            {presetBackgrounds.map((bg, index) => (
              <button
                key={index}
                className={`background-option ${currentBackground === bg.value ? 'selected' : ''}`}
                style={{
                  background: bg.value || 'var(--bg-primary)',
                  border: bg.type === 'none' ? '2px dashed var(--border-color)' : 'none',
                }}
                onClick={() => handlePresetSelect(bg.value)}
                title={bg.label}
              >
                {bg.type === 'none' && <span className="none-label">None</span>}
                {currentBackground === bg.value && <span className="checkmark">✓</span>}
              </button>
            ))}
          </div>
        </div>

        <div className="background-picker-section">
          <label className="background-picker-label">Custom Image</label>
          <div className="background-upload-area">
            <input
              type="file"
              id="background-upload"
              accept="image/*"
              onChange={handleImageUpload}
              style={{ display: 'none' }}
              disabled={uploading}
            />
            <label
              htmlFor="background-upload"
              className={`background-upload-button ${uploading ? 'uploading' : ''}`}
            >
              {uploading ? 'Uploading...' : '📷 Upload Image'}
            </label>
            {currentBackground && currentBackground.startsWith('url(') && (
              <button
                className="remove-background-button"
                onClick={() => handlePresetSelect(null)}
                title="Remove custom background"
              >
                Remove
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BackgroundPicker;

