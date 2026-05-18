import React, { useState } from 'react';
import { useChatStore, useAuthStore, useUIStore } from '../../context/store';
import { chatAPI, userAPI } from '../../services/api';
import { usePushNotifications } from '../../hooks/usePushNotifications';
import { format, isToday, isYesterday } from 'date-fns';
import toast from 'react-hot-toast';

export default function Sidebar({ onSelectChat, isLoading }) {
  const { chats, activeChat, filter, searchQuery, setFilter, setSearch, unreadCounts } = useChatStore();
  const { user, logout } = useAuthStore();
  const { toggleTheme, theme } = useUIStore();
  const { setupPush } = usePushNotifications();
  const [showMenu, setShowMenu] = useState(false);
  const [showNewChat, setShowNewChat] = useState(false);
  const [searchUser, setSearchUser] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [navTab, setNavTab] = useState('chats');

  const FILTERS = ['All', 'Unread', 'Groups', 'Channels', 'AI'];

  const filteredChats = chats.filter((c) => {
    const q = searchQuery.toLowerCase();
    const matchName = c.name?.toLowerCase().includes(q);
    const f = filter.toLowerCase();
    if (q && !matchName) return false;
    if (f === 'unread' && !(c.unreadCount > 0)) return false;
    if (f === 'groups' && c.type !== 'group') return false;
    if (f === 'channels' && c.type !== 'channel') return false;
    if (f === 'ai' && c.type !== 'ai') return false;
    return true;
  });

  const handleUserSearch = async (q) => {
    setSearchUser(q);
    if (q.length < 2) { setSearchResults([]); return; }
    try {
      const { users } = await userAPI.search(q);
      setSearchResults(users);
    } catch (e) {}
  };

  const openDM = async (targetUser) => {
    try {
      const { chat } = await chatAPI.createDM(targetUser._id);
      onSelectChat(chat);
      setShowNewChat(false);
      setSearchUser('');
      setSearchResults([]);
    } catch (e) { toast.error('Could not open chat'); }
  };

  const getChatTime = (chat) => {
    const d = chat.lastActivity || chat.updatedAt;
    if (!d) return '';
    const date = new Date(d);
    if (isToday(date)) return format(date, 'HH:mm');
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'dd/MM/yy');
  };

  const getLastMsgPreview = (chat) => {
    if (!chat.lastMessage) return 'No messages yet';
    const m = chat.lastMessage;
    if (m.deleted) return '🚫 Message deleted';
    if (m.type === 'image') return '🖼️ Image';
    if (m.type === 'video') return '🎥 Video';
    if (m.type === 'audio') return '🎵 Audio';
    if (m.type === 'voice') return '🎙️ Voice message';
    if (m.type === 'file') return `📄 ${m.media?.name || 'File'}`;
    if (m.type === 'location') return '📍 Location';
    return m.content?.slice(0, 45) || '';
  };

  const getAvatar = (chat) => {
    if (chat.avatar?.url) return { type: 'img', src: chat.avatar.url };
    const colors = ['#534AB7', '#BA7517', '#185FA5', '#0F6E56', '#993556', '#533489', '#854F0B'];
    const color = colors[(chat.name?.charCodeAt(0) || 0) % colors.length];
    return { type: 'initials', color, text: chat.type === 'ai' ? '🤖' : chat.name?.[0] || '?' };
  };

  return (
    <aside className="sidebar">
      {/* Header */}
      <div className="sidebar-header">
        <div className="sidebar-brand" onClick={() => setShowMenu(!showMenu)}>
          <div className="brand-icon">🌐</div>
          <span className="brand-name">Nexus</span>
          <span className="brand-chevron">{showMenu ? '▲' : '▼'}</span>
        </div>
        <div className="sidebar-header-actions">
          <button className="icon-btn" onClick={() => setShowNewChat(true)} title="New chat">✏️</button>
          <button className="icon-btn" onClick={setupPush} title="Enable notifications">🔔</button>
        </div>

        {showMenu && (
          <div className="sidebar-dropdown">
            <button onClick={() => toast('Profile settings')}>👤 My Profile</button>
            <button onClick={() => toast('Settings')}>⚙️ Settings</button>
            <button onClick={toggleTheme}>🌙 {theme === 'dark' ? 'Light' : 'Dark'} Mode</button>
            <button onClick={setupPush}>🔔 Enable Notifications</button>
            <button onClick={() => { logout(); window.location.href = '/login'; }} className="danger">
              🚪 Logout
            </button>
          </div>
        )}
      </div>

      {/* Search */}
      <div className="sidebar-search">
        <span>🔍</span>
        <input
          placeholder="Search..."
          value={searchQuery}
          onChange={(e) => setSearch(e.target.value)}
        />
        {searchQuery && <button onClick={() => setSearch('')}>✕</button>}
      </div>

      {/* Filters */}
      <div className="sidebar-filters">
        {FILTERS.map((f) => (
          <button
            key={f}
            className={`filter-pill ${filter === f ? 'active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Stories row */}
      <div className="stories-row">
        <div className="story-item my-story">
          <div className="story-avatar add">+</div>
          <span>My Story</span>
        </div>
        {['Aryan', 'Priya', 'Ravi', 'Meera'].map((name, i) => (
          <div key={i} className={`story-item ${i % 2 === 0 ? 'new' : 'seen'}`}
            onClick={() => toast(`Viewing ${name}'s story`)}>
            <div className="story-avatar" style={{ background: ['#BA7517', '#993556', '#533489', '#854F0B'][i] }}>
              {name[0]}
            </div>
            <span>{name}</span>
          </div>
        ))}
      </div>

      {/* Chat list */}
      <div className="chat-list">
        {isLoading && <div className="chat-list-loading">Loading chats...</div>}
        {!isLoading && filteredChats.length === 0 && (
          <div className="chat-list-empty">
            {searchQuery ? 'No chats found' : 'No chats yet. Start a new conversation!'}
          </div>
        )}
        {filteredChats.map((chat) => {
          const av = getAvatar(chat);
          const unread = unreadCounts[chat._id] || chat.unreadCount || 0;
          const isActive = activeChat?._id === chat._id;
          return (
            <div key={chat._id} className={`chat-item ${isActive ? 'active' : ''}`} onClick={() => onSelectChat(chat)}>
              <div className="chat-item-avatar">
                {av.type === 'img'
                  ? <img src={av.src} alt="" />
                  : <div className="avatar-circle" style={{ background: av.color }}>{av.text}</div>}
                {chat.type === 'dm' &&
                  chat.participants?.find((p) => p.user?._id !== user?._id)?.user?.status === 'online' && (
                  <div className="online-dot" />
                )}
              </div>
              <div className="chat-item-info">
                <div className="chat-item-top">
                  <span className="chat-item-name">
                    {chat.name}
                    {chat.type === 'ai' && <span className="ai-badge-sm">AI</span>}
                    {chat.type === 'channel' && <span className="channel-icon">📢</span>}
                  </span>
                  <span className="chat-item-time">{getChatTime(chat)}</span>
                </div>
                <div className="chat-item-bottom">
                  <span className="chat-item-preview">{getLastMsgPreview(chat)}</span>
                  {unread > 0 && <span className="unread-badge">{unread > 99 ? '99+' : unread}</span>}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom navigation */}
      <nav className="bottom-nav">
        {[
          { id: 'chats', icon: '💬', label: 'Chats' },
          { id: 'calls', icon: '📞', label: 'Calls' },
          { id: 'people', icon: '👥', label: 'People' },
          { id: 'settings', icon: '⚙️', label: 'Settings' },
        ].map((item) => (
          <button
            key={item.id}
            className={`bottom-nav-btn ${navTab === item.id ? 'active' : ''}`}
            onClick={() => { setNavTab(item.id); if (item.id !== 'chats') toast(`${item.label} tab`); }}
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      {/* New Chat Modal */}
      {showNewChat && (
        <div className="modal-overlay" onClick={() => setShowNewChat(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>New Conversation</h3>
              <button onClick={() => setShowNewChat(false)}>✕</button>
            </div>
            <div className="modal-options">
              {[
                { icon: '👤', label: 'New Direct Message' },
                { icon: '👥', label: 'New Group', action: async () => {
                  const name = prompt('Group name:');
                  if (!name) return;
                  const { chat } = await chatAPI.createGroup({ name });
                  onSelectChat(chat);
                  setShowNewChat(false);
                }},
                { icon: '📢', label: 'New Channel', action: async () => {
                  const name = prompt('Channel name:');
                  if (!name) return;
                  const { chat } = await chatAPI.createChannel({ name });
                  onSelectChat(chat);
                  setShowNewChat(false);
                }},
              ].map((opt) => (
                <button key={opt.label} className="modal-option" onClick={opt.action || undefined}>
                  <span>{opt.icon}</span>
                  <span>{opt.label}</span>
                </button>
              ))}
            </div>
            <div className="modal-search">
              <input
                placeholder="Search people by name or username..."
                value={searchUser}
                onChange={(e) => handleUserSearch(e.target.value)}
                autoFocus
              />
            </div>
            <div className="modal-results">
              {searchResults.map((u) => (
                <div key={u._id} className="modal-user" onClick={() => openDM(u)}>
                  <div className="modal-user-avatar">
                    {u.avatar?.url ? <img src={u.avatar.url} alt="" /> : <div>{u.name[0]}</div>}
                  </div>
                  <div>
                    <div className="modal-user-name">{u.name}</div>
                    <div className="modal-user-sub">@{u.username}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
