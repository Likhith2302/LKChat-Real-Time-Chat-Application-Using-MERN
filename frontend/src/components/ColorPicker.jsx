import './ColorPicker.css';

const ColorPicker = ({ currentColor, onColorChange, onClose }) => {
  const colors = [
    '#0084ff',
    '#00a884',
    '#ff6b6b',
    '#4ecdc4',
    '#45b7d1',
    '#f9ca24',
    '#f0932b',
    '#eb4d4b',
    '#6c5ce7',
    '#a29bfe',
  ];

  return (
    <div className="color-picker-overlay" onClick={onClose}>
      <div className="color-picker" onClick={(e) => e.stopPropagation()}>
        <div className="color-picker-header">
          <h3>Choose Accent Color</h3>
          <button className="close-color-picker" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="color-picker-grid">
          {colors.map((color) => (
            <button
              key={color}
              className={`color-option ${currentColor === color ? 'selected' : ''}`}
              style={{ backgroundColor: color }}
              onClick={() => {
                onColorChange(color);
              }}
              title={color}
            >
              {currentColor === color && '✓'}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ColorPicker;

