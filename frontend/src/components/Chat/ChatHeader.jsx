import React, { useState } from 'react';
import { useChatStore, useAuthStore } from '../../context/store';
import { getSocket } from '../../hooks/useSocket';
import { messageAPI } from '../../services/api';
import toast from 'react-hot-toast';

export default function ChatHeader({ chat, onInfoClick }) {
  const { typingUsers } = useChatStore();
  const { user } = useAuthStore();
  const [searching, setSearching] = useState(false);
  const [searchQ, setSearchQ]     = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [activeCall, setActiveCall] = useState(null); // 'voice' | 'video' | null

  if (!chat) return null;

  const typingList = typingUsers[chat._id] || [];
  const isAI      = chat.type === 'ai';
  const isGroup   = chat.type === 'group' || chat.type === 'channel';

  const other = !isGroup && !isAI
    ? chat.participants?.find((p) => p.user?._id !== user?._id)?.user
    : null;
  const displayName = isAI ? 'Nova AI' : chat.type === 'dm' ? (other?.name || chat.name) : chat.name;
  const avatarUrl   = chat.type === 'dm' ? other?.avatar?.url : chat.avatar?.url;
  const COLORS = ['#534AB7','#BA7517','#185FA5','#0F6E56','#993556'];
  const getColor = (n) => COLORS[(n?.charCodeAt(0)||0) % COLORS.length];

  const getSubtitle = () => {
    if (typingList.length > 0) return <span style={{ color:'var(--brand-light)' }}>typing...</span>;
    if (isAI) return <span style={{ color:'var(--brand-light)' }}>Knot AI · Always online</span>;
    if (isGroup) return `${chat.participants?.length || 0} members`;
    if (other?.status === 'online') return <span style={{ color:'#4ade80' }}>● Online</span>;
    if (other?.lastSeen) return `Last seen ${new Date(other.lastSeen).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}`;
    return 'Offline';
  };

  const handleCall = (type) => {
    const socket = getSocket();
    if (!other) return toast.error('Cannot call in groups yet');
    if (!socket) return toast.error('Not connected');
    setActiveCall(type);
    socket.emit('call_offer', { targetUserId: other._id, callType: type, chatId: chat._id });
    toast(`📞 Calling ${other.name}...`, { duration: 5000 });
  };

  const doSearch = async () => {
    if (!searchQ.trim()) return;
    try {
      const { messages } = await messageAPI.search(chat._id, searchQ);
      setSearchResults(messages);
      if (!messages.length) toast('No messages found');
    } catch (e) { toast.error('Search failed'); }
  };

  return (
    <>
      <div className="chat-header">
        <div className="chat-header-info">
          <div className="chat-header-avatar">
            {avatarUrl
              ? <img src={avatarUrl} alt="" />
              : <div className={`avatar-fallback ${isAI ? 'ai-avatar' : ''}`}
                     style={{ background: isAI ? '#534AB7' : getColor(displayName) }}>
                  {isAI ? '🤖' : displayName?.[0]?.toUpperCase()}
                </div>}
          </div>
          <div className="chat-header-text">
            <div className="chat-header-name">
              {displayName}
              {isAI && <span className="ai-badge">AI</span>}
              {chat.type === 'channel' && <span className="channel-badge">Channel</span>}
            </div>
            <div className="chat-header-sub">{getSubtitle()}</div>
          </div>
        </div>

        <div className="chat-header-actions">
          {searching ? (
            <div className="header-search">
              <input autoFocus value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && doSearch()}
                placeholder="Search messages..." className="header-search-input" />
              <button className="icon-btn" onClick={() => { setSearching(false); setSearchQ(''); setSearchResults([]); }}>✕</button>
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

      {/* Search results dropdown */}
      {searchResults.length > 0 && (
        <div className="search-results-dropdown">
          <div style={{ padding:'8px 14px', fontSize:12, color:'var(--text-tertiary)', borderBottom:'1px solid var(--border)' }}>
            {searchResults.length} results for "{searchQ}"
            <button style={{ float:'right', background:'none', border:'none', cursor:'pointer', color:'var(--text-tertiary)' }}
              onClick={() => setSearchResults([])}>✕</button>
          </div>
          {searchResults.map((m) => (
            <div key={m._id} className="search-result-item">
              <div style={{ fontSize:12, color:'var(--brand-light)', marginBottom:2 }}>{m.sender?.name}</div>
              <div style={{ fontSize:13 }}>{m.content?.slice(0, 80)}</div>
              <div style={{ fontSize:11, color:'var(--text-tertiary)', marginTop:2 }}>
                {new Date(m.createdAt).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
