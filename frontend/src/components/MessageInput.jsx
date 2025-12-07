import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import EmojiPicker from 'emoji-picker-react';
import { useTheme } from '../contexts/ThemeContext';
import './MessageInput.css';

const MessageInput = ({ 
  onSend, 
  chatId, 
  socket, 
  accentColor,
  replyingTo,
  editingMessage,
  onCancelReply,
  onCancelEdit,
}) => {
  const [message, setMessage] = useState('');
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const fileInputRef = useRef(null);
  const emojiPickerRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingIntervalRef = useRef(null);
  const { theme } = useTheme();

  // Set message content when editing
  useEffect(() => {
    if (editingMessage) {
      setMessage(editingMessage.content || '');
    } else {
      setMessage('');
    }
  }, [editingMessage]);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      if (socket && chatId) {
        socket.emit('stop_typing', { chatId });
      }
    };
  }, [socket, chatId]);

  // Close emoji picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target)) {
        setShowEmojiPicker(false);
      }
    };

    if (showEmojiPicker) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showEmojiPicker]);

  const onEmojiClick = (emojiData) => {
    setMessage((prev) => prev + emojiData.emoji);
    setShowEmojiPicker(false);
  };

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  const handleUpload = async (sendText = false) => {
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post('/api/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const mediaUrl = response.data.mediaUrl;
      const messageType = file.type.startsWith('image/') ? 'image' : 'file';

      if (onSend) {
        // Send media with optional text (WhatsApp style)
        const textContent = sendText ? message.trim() : '';
        await onSend(textContent, mediaUrl, messageType);
      }

      setFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      // Clear message if it was sent with media
      if (sendText) {
        setMessage('');
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  const handleSend = async () => {
    if (!message.trim() && !file && !editingMessage) return;

    // If file is selected, upload it (with optional text - WhatsApp style)
    if (file) {
      await handleUpload(message.trim().length > 0);
      if (onCancelReply) onCancelReply();
      if (onCancelEdit) onCancelEdit();
      return;
    }

    // Send text message
    if (message.trim() || editingMessage) {
      if (onSend) {
        if (editingMessage) {
          await onSend(message, '', 'text', undefined, undefined, editingMessage._id);
        } else if (replyingTo) {
          await onSend(message, '', 'text', undefined, replyingTo._id);
        } else {
          await onSend(message, '', 'text');
        }
      }
      setMessage('');
      if (onCancelReply) onCancelReply();
      if (onCancelEdit) onCancelEdit();

      // Stop typing indicator
      if (socket && chatId) {
        socket.emit('stop_typing', { chatId });
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTyping = () => {
    if (socket && chatId) {
      socket.emit('typing', { chatId });

      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Set timeout to stop typing after 3 seconds
      typingTimeoutRef.current = setTimeout(() => {
        if (socket && chatId) {
          socket.emit('stop_typing', { chatId });
        }
      }, 3000);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Try to use a more compatible format
      let mimeType = 'audio/webm';
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        mimeType = 'audio/webm;codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        mimeType = 'audio/mp4';
      } else if (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) {
        mimeType = 'audio/ogg;codecs=opus';
      }
      
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        await sendVoiceMessage(audioBlob, mimeType);
        
        // Stop all tracks
        stream.getTracks().forEach((track) => track.stop());
      };

      // Record in chunks for better compatibility
      mediaRecorder.start(100);
      setIsRecording(true);
      setRecordingTime(0);

      // Start timer
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      alert('Could not access microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }
  };

  const sendVoiceMessage = async (audioBlob, mimeType = 'audio/webm') => {
    setUploading(true);
    const formData = new FormData();
    
    // Determine file extension based on mime type
    let extension = 'webm';
    if (mimeType.includes('mp4')) extension = 'm4a';
    else if (mimeType.includes('ogg')) extension = 'ogg';
    else if (mimeType.includes('wav')) extension = 'wav';
    
    const audioFile = new File([audioBlob], `voice-message.${extension}`, { type: mimeType });
    formData.append('file', audioFile);

    try {
      const response = await axios.post('/api/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const mediaUrl = response.data.mediaUrl;
      const duration = recordingTime;

      if (onSend) {
        await onSend('', mediaUrl, 'voice', duration);
      }

      setRecordingTime(0);
    } catch (error) {
      console.error('Error uploading voice message:', error);
      alert('Failed to send voice message');
    } finally {
      setUploading(false);
    }
  };

  const handleMicMouseDown = () => {
    if (!isRecording) {
      startRecording();
    }
  };

  const handleMicMouseUp = () => {
    if (isRecording) {
      stopRecording();
    }
  };

  const handleMicTouchStart = (e) => {
    e.preventDefault();
    handleMicMouseDown();
  };

  const handleMicTouchEnd = (e) => {
    e.preventDefault();
    handleMicMouseUp();
  };

  return (
    <div className="message-input-container">
      {replyingTo && (
        <div className="reply-preview">
          <div className="reply-preview-content">
            <div className="reply-preview-line" style={{ backgroundColor: accentColor }}></div>
            <div className="reply-preview-info">
              <span className="reply-preview-sender">
                {replyingTo.senderId?.name || 'Unknown'}
              </span>
              <span className="reply-preview-text">
                {replyingTo.content || (replyingTo.mediaUrl ? 'Media' : 'Message')}
              </span>
            </div>
          </div>
          <button className="reply-preview-close" onClick={onCancelReply}>
            ×
          </button>
        </div>
      )}
      {editingMessage && (
        <div className="edit-preview">
          <div className="edit-preview-content">
            <span className="edit-preview-label">Editing message:</span>
            <span className="edit-preview-text">
              {editingMessage.content || 'Media'}
            </span>
          </div>
          <button className="edit-preview-close" onClick={onCancelEdit}>
            ×
          </button>
        </div>
      )}
      {file && (
        <div className="file-preview">
          <span>{file.name}</span>
          <button onClick={() => setFile(null)}>×</button>
        </div>
      )}
      <div className="message-input-wrapper">
        {!isRecording ? (
          <>
            <button
              className="attach-button"
              onClick={() => fileInputRef.current?.click()}
              title="Attach file"
            >
              📎
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              style={{ display: 'none' }}
              accept="image/*,application/pdf,.doc,.docx,.txt,.zip"
            />
            <div className="emoji-picker-container" ref={emojiPickerRef}>
              <button
                className="emoji-button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                title="Add emoji"
                type="button"
              >
                😊
              </button>
              {showEmojiPicker && (
                <div className="emoji-picker-wrapper">
                  <EmojiPicker
                    onEmojiClick={onEmojiClick}
                    autoFocusSearch={false}
                    theme={theme === 'dark' ? 'dark' : 'light'}
                  />
                </div>
              )}
            </div>
            <textarea
              className="message-input"
              placeholder={editingMessage ? "Edit your message..." : "Type a message..."}
              value={message}
              onChange={(e) => {
                setMessage(e.target.value);
                if (!editingMessage) {
                  handleTyping();
                }
              }}
              onKeyPress={handleKeyPress}
              rows={1}
            />
            <button
              className={`mic-button ${isRecording ? 'recording' : ''}`}
              onMouseDown={handleMicMouseDown}
              onMouseUp={handleMicMouseUp}
              onMouseLeave={handleMicMouseUp}
              onTouchStart={handleMicTouchStart}
              onTouchEnd={handleMicTouchEnd}
              title="Hold to record voice message"
            >
              🎤
            </button>
            {(message.trim() || file || editingMessage) ? (
              <button
                className="send-button"
                onClick={handleSend}
                disabled={uploading}
                style={{ backgroundColor: accentColor }}
                title={editingMessage ? 'Save changes' : 'Send'}
              >
                {uploading ? '⏳' : editingMessage ? '✓' : '➤'}
              </button>
            ) : null}
          </>
        ) : (
          <div className="recording-container">
            <div className="recording-indicator">
              <span className="recording-dot"></span>
              <span className="recording-text">
                Recording... {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}
              </span>
            </div>
            <button
              className="stop-recording-button"
              onClick={stopRecording}
              title="Stop recording"
            >
              ⏹
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageInput;

