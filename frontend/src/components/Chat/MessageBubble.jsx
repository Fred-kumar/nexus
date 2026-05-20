import React, { useState, useRef } from 'react';
import { format } from 'date-fns';

const QUICK_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🔥'];

export default function MessageBubble({
  message, isOwn, onReply, onEdit, onDelete, onReact, onForward, showAvatar,
}) {
  const [showActions, setShowActions] = useState(false);
  const [showEmojis, setShowEmojis] = useState(false);
  const [showDeleteMenu, setShowDeleteMenu] = useState(false);
  const longPressTimer = useRef(null);

  const handleLongPress = () => {
    setShowActions(true);
  };
  const startLongPress = () => {
    longPressTimer.current = setTimeout(handleLongPress, 500);
  };
  const cancelLongPress = () => clearTimeout(longPressTimer.current);

  if (message.deleted) {
    return (
      <div className={`msg-wrapper ${isOwn ? 'own' : 'other'}`}>
        <div className="msg-bubble deleted">
          <span>🚫 This message was deleted</span>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    switch (message.type) {
      case 'image':
        return (
          <div className="msg-media">
            <img
              src={message.media?.url}
              alt="Image"
              className="msg-image"
              onClick={() => window.open(message.media?.url, '_blank')}
              loading="lazy"
            />
            {message.content && <p className="msg-caption">{message.content}</p>}
          </div>
        );
      case 'video':
        return (
          <div className="msg-media">
            <video src={message.media?.url} controls className="msg-video" preload="metadata" />
            {message.content && <p className="msg-caption">{message.content}</p>}
          </div>
        );
      case 'audio':
      case 'voice':
        return (
          <div className="msg-audio">
            <span>{message.type === 'voice' ? '🎙️' : '🎵'}</span>
            <audio src={message.media?.url} controls className="msg-audio-player" />
          </div>
        );
      case 'file':
        return (
          <div className="msg-file" onClick={() => window.open(message.media?.url, '_blank')}>
            <span className="msg-file-icon">📄</span>
            <div>
              <div className="msg-file-name">{message.media?.name || 'File'}</div>
              <div className="msg-file-size">
                {message.media?.size ? `${(message.media.size / 1024).toFixed(1)} KB` : ''}
              </div>
            </div>
            <span>⬇️</span>
          </div>
        );
      case 'location':
        return (
          <div className="msg-location">
            <span>📍</span>
            <span>{message.content || 'Location shared'}</span>
          </div>
        );
      case 'poll':
        return <PollMessage message={message} />;
      case 'system':
        return <div className="msg-system">{message.content}</div>;
      default:
        return (
          <p
            className="msg-text"
            dangerouslySetInnerHTML={{
              __html: formatText(message.content || ''),
            }}
          />
        );
    }
  };

  const formatText = (text) => {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code>$1</code>')
      .replace(/\n/g, '<br/>')
      .replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
  };

  const timeStr = format(new Date(message.createdAt || Date.now()), 'HH:mm');

  const totalReactions = {};
  (message.reactions || []).forEach((r) => {
    totalReactions[r.emoji] = (r.users || []).length;
  });

  return (
    <div
      className={`msg-wrapper ${isOwn ? 'own' : 'other'} ${message.temp ? 'temp' : ''}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => { setShowActions(false); setShowEmojis(false); }}
      onTouchStart={startLongPress}
      onTouchEnd={cancelLongPress}
    >
      {/* Avatar for group chats */}
      {!isOwn && showAvatar && (
        <div className="msg-avatar">
          {message.sender?.avatar?.url
            ? <img src={message.sender.avatar.url} alt="" />
            : <div className="msg-avatar-fallback">{message.sender?.name?.[0] || '?'}</div>}
        </div>
      )}
      {!isOwn && !showAvatar && <div className="msg-avatar-spacer" />}

      <div className="msg-content-col">
        {/* Sender name for group */}
        {!isOwn && showAvatar && (
          <div className="msg-sender-name">{message.sender?.name}</div>
        )}

        {/* Reply preview */}
        {message.replyTo && (
          <div className={`reply-preview ${isOwn ? 'own' : ''}`}>
            <div className="reply-preview-from">{message.replyTo.sender?.name}</div>
            <div className="reply-preview-text">
              {message.replyTo.content?.slice(0, 60) || `📎 ${message.replyTo.type}`}
            </div>
          </div>
        )}

        {/* Forwarded label */}
        {message.forwardedFrom && (
          <div className="forwarded-label">↪ Forwarded</div>
        )}

        {/* Bubble */}
        <div className={`msg-bubble ${isOwn ? 'own' : 'other'} type-${message.type}`}>
          {renderContent()}
          <div className="msg-meta">
            <span className="msg-time">{timeStr}</span>
            {message.edited && <span className="msg-edited">edited</span>}
            {isOwn && (
              <span className="msg-ticks">
                {message.readBy?.length > 0 ? '✓✓' : message.deliveredTo?.length > 0 ? '✓✓' : '✓'}
              </span>
            )}
          </div>
        </div>

        {/* Reactions */}
        {Object.keys(totalReactions).length > 0 && (
          <div className={`msg-reactions ${isOwn ? 'own' : ''}`}>
            {Object.entries(totalReactions).map(([emoji, count]) => (
              <button
                key={emoji}
                className="reaction-pill"
                onClick={() => onReact(emoji)}
              >
                {emoji} <span>{count}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Action buttons */}
      {showActions && (
        <div className={`msg-actions ${isOwn ? 'own' : 'other'}`}>
          <button className="msg-action-btn" onClick={() => setShowEmojis(!showEmojis)} title="React">😊</button>
          <button className="msg-action-btn" onClick={onReply} title="Reply">↩</button>
          <button className="msg-action-btn" onClick={onForward} title="Forward">→</button>
          {isOwn && message.type === 'text' && (
            <button className="msg-action-btn" onClick={onEdit} title="Edit">✏️</button>
          )}
          {isOwn && (
            <button className="msg-action-btn danger" onClick={() => setShowDeleteMenu(!showDeleteMenu)} title="Delete">🗑️</button>
          )}
        </div>
      )}

      {/* Emoji picker */}
      {showEmojis && (
        <div className={`quick-emoji-row ${isOwn ? 'own' : 'other'}`}>
          {QUICK_EMOJIS.map((e) => (
            <button key={e} className="quick-emoji" onClick={() => { onReact(e); setShowEmojis(false); }}>
              {e}
            </button>
          ))}
        </div>
      )}

      {/* Delete options */}
      {showDeleteMenu && (
        <div className={`delete-menu ${isOwn ? 'own' : 'other'}`}>
          <button onClick={() => { onDelete(false); setShowDeleteMenu(false); }}>Delete for me</button>
          <button onClick={() => { onDelete(true); setShowDeleteMenu(false); }}>Delete for everyone</button>
          <button onClick={() => setShowDeleteMenu(false)}>Cancel</button>
        </div>
      )}
    </div>
  );
}

function PollMessage({ message }) {
  const { poll } = message;
  if (!poll) return null;
  const totalVotes = poll.options.reduce((s, o) => s + (o.votes?.length || 0), 0);
  return (
    <div className="msg-poll">
      <div className="poll-question">📊 {poll.question}</div>
      {poll.options.map((opt, i) => {
        const pct = totalVotes ? Math.round((opt.votes?.length || 0) / totalVotes * 100) : 0;
        return (
          <div key={i} className="poll-option">
            <div className="poll-option-bar" style={{ width: `${pct}%` }} />
            <div className="poll-option-content">
              <span>{opt.text}</span>
              <span>{pct}%</span>
            </div>
          </div>
        );
      })}
      <div className="poll-total">{totalVotes} votes</div>
    </div>
  );
}
