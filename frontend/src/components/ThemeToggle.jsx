import { useTheme } from '../contexts/ThemeContext';
import './ThemeToggle.css';

const ThemeToggle = () => {
  const { theme, setTheme } = useTheme();

  return (
    <div className="theme-toggle">
      <button
        className={`theme-option ${theme === 'light' ? 'active' : ''}`}
        onClick={() => setTheme('light')}
        title="Light Theme"
      >
        ☀️
      </button>
      <button
        className={`theme-option ${theme === 'dark' ? 'active' : ''}`}
        onClick={() => setTheme('dark')}
        title="Dark Theme"
      >
        🌙
      </button>
      <button
        className={`theme-option ${theme === 'system' ? 'active' : ''}`}
        onClick={() => setTheme('system')}
        title="System Default"
      >
        💻
      </button>
    </div>
  );
};

export default ThemeToggle;

