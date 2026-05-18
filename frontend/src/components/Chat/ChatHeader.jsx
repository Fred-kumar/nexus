import React, { useState } from 'react';
import { useChatStore } from '../../context/store';
import { getSocket } from '../../hooks/useSocket';

export default function ChatHeader({ chat, onInfoClick }) {
  const { typingUsers } = useChatStore();
  const [searching, setSearching] = useState(false);
  const [searchQ, setSearchQ] = useState('');

  if (!chat) return null;

  const typingList = typingUsers[chat._id] || [];
  const isGroup = chat.type === 'group' || chat.type === 'channel';
  const isAI = chat.type === 'ai';

  const getSubtitle = () => {
    if (typingList.length > 0) {
      return <span className="typing-status">typing...</span>;
    }
    if (isAI) return <span style={{ color: '#7F77DD' }}>Nova AI · Always online</span>;
    if (isGroup) return `${chat.participants?.length || 0} members`;
    const other = chat.participants?.find((p) => p.user?._id !== chat._currentUserId);
    const status = other?.user?.status;
    if (status === 'online') return <span style={{ color: '#4ade80' }}>● Online</span>;
    return chat.participants?.find((p) => p.user)?.user?.lastSeen
      ? `Last seen ${new Date(chat.participants[0]?.user?.lastSeen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
      : 'Offline';
  };

  const handleCall = (type) => {
    const socket = getSocket();
    const other = chat.participants?.find((p) => p.user);
    if (other && socket) {
      socket.emit('call_offer', {
        targetUserId: other.user._id,
        callType: type,
        chatId: chat._id,
        offer: null,
      });
    }
  };

  return (
    <div className="chat-header">
      <div className="chat-header-info">
        <div className="chat-header-avatar">
          {chat.avatar?.url
            ? <img src={chat.avatar.url} alt="" />
            : <div className={`avatar-fallback ${isAI ? 'ai-avatar' : ''}`}>
                {isAI ? '🤖' : chat.name?.[0] || '?'}
              </div>}
        </div>
        <div className="chat-header-text">
          <div className="chat-header-name">
            {chat.name}
            {isAI && <span className="ai-badge">AI</span>}
            {chat.type === 'channel' && <span className="channel-badge">Channel</span>}
          </div>
          <div className="chat-header-sub">{getSubtitle()}</div>
        </div>
      </div>

      <div className="chat-header-actions">
        {searching ? (
          <div className="header-search">
            <input
              autoFocus
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              placeholder="Search messages..."
              className="header-search-input"
            />
            <button className="icon-btn" onClick={() => { setSearching(false); setSearchQ(''); }}>✕</button>
          </div>
        ) : (
          <>
            <button className="icon-btn" onClick={() => setSearching(true)} title="Search">🔍</button>
            {!isAI && (
              <>
                <button className="icon-btn" onClick={() => handleCall('voice')} title="Voice call">📞</button>
                <button className="icon-btn" onClick={() => handleCall('video')} title="Video call">📹</button>
              </>
            )}
            <button className="icon-btn" onClick={onInfoClick} title="Info">ℹ️</button>
          </>
        )}
      </div>
    </div>
  );
}
