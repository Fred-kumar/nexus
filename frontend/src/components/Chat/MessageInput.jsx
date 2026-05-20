import React, { useState, useRef, useEffect } from 'react';
import { mediaAPI } from '../../services/api';
import toast from 'react-hot-toast';
import EmojiPicker from 'emoji-picker-react';

export default function MessageInput({
  onSend, onTyping, replyTo, onClearReply, editingMsg, onEditSubmit, onCancelEdit, chat,
}) {
  const [text, setText] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [showAttach, setShowAttach] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);

  const inputRef = useRef(null);
  const fileRef = useRef(null);

  useEffect(() => {
    if (editingMsg) setText(editingMsg.content);
    else setText('');
    inputRef.current?.focus();
  }, [editingMsg]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === 'Escape') {
      if (editingMsg) onCancelEdit();
      if (replyTo) onClearReply();
    }
  };

  const handleSubmit = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    if (editingMsg) {
      onEditSubmit(editingMsg._id, trimmed);
    } else {
      onSend(trimmed, 'text');
    }
    setText('');
    setShowEmoji(false);
  };

  const handleEmojiSelect = (emojiData) => {
    setText((prev) => prev + emojiData.emoji);
    inputRef.current?.focus();
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setShowAttach(false);
    setUploading(true);
    try {
      const { media } = await mediaAPI.upload(file, (p) => setUploadProgress(p));
      const type = file.type.startsWith('image/') ? 'image'
        : file.type.startsWith('video/') ? 'video'
        : file.type.startsWith('audio/') ? 'audio' : 'file';
      await onSend(file.name, type, media);
      toast.success(`${type} sent!`);
    } catch (e) {
      toast.error('Upload failed');
    }
    setUploading(false);
    setUploadProgress(0);
    e.target.value = '';
  };

  const startVoiceRecord = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks = [];
      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = async () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const file = new File([blob], 'voice-message.webm', { type: 'audio/webm' });
        stream.getTracks().forEach((t) => t.stop());
        setUploading(true);
        try {
          const { media } = await mediaAPI.upload(file);
          await onSend('Voice message', 'voice', media);
        } catch (e) { toast.error('Voice send failed'); }
        setUploading(false);
      };
      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
    } catch (e) {
      toast.error('Microphone access denied');
    }
  };

  const stopVoiceRecord = () => {
    mediaRecorder?.stop();
    setIsRecording(false);
    setMediaRecorder(null);
  };

  const ATTACH_OPTIONS = [
    { icon: '🖼️', label: 'Image/Video', accept: 'image/*,video/*' },
    { icon: '📄', label: 'Document', accept: '.pdf,.doc,.docx,.xls,.xlsx,.txt' },
    { icon: '🎵', label: 'Audio', accept: 'audio/*' },
    { icon: '📍', label: 'Location', accept: null, action: 'location' },
    { icon: '📊', label: 'Poll', accept: null, action: 'poll' },
  ];

  return (
    <div className="message-input-area">
      {replyTo && (
        <div className="reply-bar">
          <div className="reply-bar-content">
            <div className="reply-bar-from">{replyTo.sender?.name || 'You'}</div>
            <div className="reply-bar-text">{replyTo.content?.slice(0, 80)}</div>
          </div>
          <button className="icon-btn" onClick={onClearReply}>✕</button>
        </div>
      )}

      {editingMsg && (
        <div className="reply-bar editing">
          <div className="reply-bar-content">
            <div className="reply-bar-from">✏️ Editing message</div>
            <div className="reply-bar-text">{editingMsg.content?.slice(0, 80)}</div>
          </div>
          <button className="icon-btn" onClick={onCancelEdit}>✕</button>
        </div>
      )}

      {uploading && (
        <div className="upload-progress-bar">
          <div style={{ width: `${uploadProgress}%` }} />
        </div>
      )}

      {showAttach && (
        <div className="attach-menu">
          {ATTACH_OPTIONS.map((opt) => (
            <button
              key={opt.label}
              className="attach-option"
              onClick={() => {
                if (opt.accept) { fileRef.current.accept = opt.accept; fileRef.current.click(); }
                else if (opt.action === 'location') {
                  navigator.geolocation?.getCurrentPosition(
                    (pos) => onSend(`📍 Location shared`, 'location', null),
                    () => toast.error('Location access denied')
                  );
                }
                setShowAttach(false);
              }}
            >
              <span className="attach-icon">{opt.icon}</span>
              <span>{opt.label}</span>
            </button>
          ))}
        </div>
      )}

      {showEmoji && (
        <div className="emoji-picker-wrapper">
          <EmojiPicker onEmojiClick={handleEmojiSelect} theme="dark" lazyLoadEmojis />
        </div>
      )}

      <div className="input-row">
        <button className="icon-btn" onClick={() => { setShowAttach(!showAttach); setShowEmoji(false); }}>
          📎
        </button>

        <div className="input-wrapper">
          <textarea
            ref={inputRef}
            className="message-textarea"
            value={text}
            onChange={(e) => { setText(e.target.value); onTyping(); }}
            onKeyDown={handleKeyDown}
            placeholder={isRecording ? '🎙️ Recording...' : `Message ${chat?.name || ''}...`}
            rows={1}
            style={{ opacity: isRecording ? 0.5 : 1 }}
            disabled={isRecording}
          />
          <button
            className="emoji-toggle"
            onClick={() => { setShowEmoji(!showEmoji); setShowAttach(false); }}
          >
            😊
          </button>
        </div>

        {text.trim() ? (
          <button className="send-btn" onClick={handleSubmit}>
            {editingMsg ? '✓' : '➤'}
          </button>
        ) : (
          <button
            className={`icon-btn mic-btn ${isRecording ? 'recording' : ''}`}
            onMouseDown={startVoiceRecord}
            onMouseUp={stopVoiceRecord}
            onTouchStart={startVoiceRecord}
            onTouchEnd={stopVoiceRecord}
            title="Hold to record voice message"
          >
            🎙️
          </button>
        )}
      </div>

      <input ref={fileRef} type="file" style={{ display: 'none' }} onChange={handleFileSelect} />
    </div>
  );
}
