import React, { useState, useRef } from 'react';
import { useChatStore, useAuthStore, useUIStore } from '../../context/store';
import { chatAPI, userAPI } from '../../services/api';
import { usePushNotifications } from '../../hooks/usePushNotifications';
import { format, isToday, isYesterday } from 'date-fns';
import toast from 'react-hot-toast';
import SettingsModal from '../Shared/SettingsModal';
import ProfileModal from '../Shared/ProfileModal';

export default function Sidebar({ onSelectChat, isLoading }) {
  const { chats, activeChat, filter, searchQuery, setFilter, setSearch, unreadCounts, stories } = useChatStore();
  const { user, logout } = useAuthStore();
  const { toggleTheme, theme } = useUIStore();
  const { setupPush } = usePushNotifications();

  const [showMenu, setShowMenu]         = useState(false);
  const [showNewChat, setShowNewChat]   = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showProfile, setShowProfile]   = useState(false);
  const [searchUser, setSearchUser]     = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching]       = useState(false);
  const [navTab, setNavTab]             = useState('chats');
  const [showCalls, setShowCalls]       = useState(false);
  const [groupName, setGroupName]       = useState('');
  const [channelName, setChannelName]   = useState('');
  const searchTimer = useRef(null);

  const FILTERS = ['All', 'Unread', 'Groups', 'Channels', 'AI'];

  const filteredChats = chats.filter((c) => {
    const q = searchQuery.toLowerCase();
    if (q && !c.name?.toLowerCase().includes(q)) return false;
    const f = filter.toLowerCase();
    if (f === 'unread'   && !(c.unreadCount > 0)) return false;
    if (f === 'groups'   && c.type !== 'group')   return false;
    if (f === 'channels' && c.type !== 'channel') return false;
    if (f === 'ai'       && c.type !== 'ai')      return false;
    return true;
  });

  const handleUserSearch = (q) => {
    setSearchUser(q);
    clearTimeout(searchTimer.current);
    if (q.length < 2) { setSearchResults([]); return; }
    searchTimer.current = setTimeout(async () => {
      setSearching(true);
      try {
        const { users } = await userAPI.search(q);
        setSearchResults(users);
      } catch (e) { setSearchResults([]); }
      setSearching(false);
    }, 400);
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

  const createGroup = async () => {
    if (!groupName.trim()) return toast.error('Enter group name');
    try {
      const { chat } = await chatAPI.createGroup({ name: groupName.trim() });
      onSelectChat(chat);
      setShowNewChat(false);
      setGroupName('');
      toast.success('Group created!');
    } catch (e) { toast.error('Could not create group'); }
  };

  const createChannel = async () => {
    if (!channelName.trim()) return toast.error('Enter channel name');
    try {
      const { chat } = await chatAPI.createChannel({ name: channelName.trim() });
      onSelectChat(chat);
      setShowNewChat(false);
      setChannelName('');
      toast.success('Channel created!');
    } catch (e) { toast.error('Could not create channel'); }
  };

  const getChatTime = (chat) => {
    const d = chat.lastActivity || chat.updatedAt;
    if (!d) return '';
    const date = new Date(d);
    if (isToday(date))     return format(date, 'HH:mm');
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'dd/MM/yy');
  };

  const getLastMsgPreview = (chat) => {
    if (!chat.lastMessage) return 'No messages yet';
    const m = chat.lastMessage;
    if (m.deleted)         return '🚫 Message deleted';
    if (m.type === 'image') return '🖼️ Image';
    if (m.type === 'video') return '🎥 Video';
    if (m.type === 'audio' || m.type === 'voice') return '🎙️ Voice message';
    if (m.type === 'file') return `📄 ${m.media?.name || 'File'}`;
    if (m.type === 'location') return '📍 Location';
    return m.content?.slice(0, 45) || '';
  };

  const COLORS = ['#534AB7','#BA7517','#185FA5','#0F6E56','#993556','#533489','#854F0B','#3B6D11'];
  const getColor = (name) => COLORS[(name?.charCodeAt(0) || 0) % COLORS.length];

  const handleLogout = async () => {
    try {
      logout();
      window.location.href = '/login';
    } catch (e) { window.location.href = '/login'; }
  };

  return (
    <aside className="sidebar">
      {/* ── Header ── */}
      <div className="sidebar-header">
        <div className="sidebar-brand" onClick={() => setShowMenu(!showMenu)}>
          <span className="brand-icon">🪢</span>
          <span className="brand-name">Knot</span>
          <span className="brand-chevron">{showMenu ? '▲' : '▼'}</span>
        </div>
        <div className="sidebar-header-actions">
          <button className="icon-btn" onClick={() => setShowNewChat(true)} title="New chat">✏️</button>
          <button className="icon-btn" onClick={toggleTheme} title="Toggle theme">
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
        </div>

        {showMenu && (
          <div className="sidebar-dropdown" onClick={() => setShowMenu(false)}>
            <button onClick={() => setShowProfile(true)}>👤 My Profile</button>
            <button onClick={() => setShowSettings(true)}>⚙️ Settings</button>
            <button onClick={toggleTheme}>{theme === 'dark' ? '☀️ Light Mode' : '🌙 Dark Mode'}</button>
            <button onClick={setupPush}>🔔 Enable Notifications</button>
            <button className="danger" onClick={handleLogout}>🚪 Logout</button>
          </div>
        )}
      </div>

      {/* ── Search ── */}
      <div className="sidebar-search">
        <span>🔍</span>
        <input
          placeholder="Search chats..."
          value={searchQuery}
          onChange={(e) => setSearch(e.target.value)}
        />
        {searchQuery && <button onClick={() => setSearch('')} style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-tertiary)'}}>✕</button>}
      </div>

      {/* ── Filters ── */}
      <div className="sidebar-filters">
        {FILTERS.map((f) => (
          <button key={f} className={`filter-pill ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
            {f}
          </button>
        ))}
      </div>

      {/* ── Stories — only real users' stories ── */}
      {stories.length > 0 && (
        <div className="stories-row">
          <div className="story-item my-story" onClick={() => toast('Add your story')}>
            <div className="story-avatar add" style={{ background: getColor(user?.name) }}>+</div>
            <span>My Story</span>
          </div>
          {stories.map((s, i) => (
            <div key={i} className={`story-item ${s.viewed ? 'seen' : 'new'}`}
              onClick={() => toast(`${s.name}'s story`)}>
              <div className="story-avatar" style={{ background: getColor(s.name) }}>{s.name?.[0]}</div>
              <span>{s.name}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Chat List ── */}
      <div className="chat-list">
        {isLoading && (
          <div className="chat-list-loading">
            {[1,2,3,4,5].map(i => (
              <div key={i} className="chat-skeleton">
                <div className="skeleton-av" />
                <div className="skeleton-lines">
                  <div className="skeleton-line long" />
                  <div className="skeleton-line short" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!isLoading && filteredChats.length === 0 && (
          <div className="chat-list-empty">
            {searchQuery ? `No results for "${searchQuery}"` : 'No chats yet.\nStart a new conversation!'}
          </div>
        )}

        {filteredChats.map((chat) => {
          const unread = unreadCounts[chat._id] || chat.unreadCount || 0;
          const isActive = activeChat?._id === chat._id;
          const other = chat.type === 'dm'
            ? chat.participants?.find((p) => p.user?._id !== user?._id)?.user
            : null;
          const displayName = chat.type === 'dm' ? (other?.name || chat.name) : chat.name;
          const isOnline = other?.status === 'online';
          const avatarUrl = chat.type === 'dm' ? other?.avatar?.url : chat.avatar?.url;

          return (
            <div key={chat._id} className={`chat-item ${isActive ? 'active' : ''}`} onClick={() => onSelectChat(chat)}>
              <div className="chat-item-avatar">
                {avatarUrl
                  ? <img src={avatarUrl} alt="" />
                  : <div className="avatar-circle" style={{ background: getColor(displayName) }}>
                      {chat.type === 'ai' ? '🤖' : displayName?.[0]?.toUpperCase()}
                    </div>}
                {isOnline && <div className="online-dot" />}
              </div>
              <div className="chat-item-info">
                <div className="chat-item-top">
                  <span className="chat-item-name">
                    {displayName}
                    {chat.type === 'ai'      && <span className="ai-badge-sm">AI</span>}
                    {chat.type === 'channel' && <span className="channel-icon"> 📢</span>}
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

      {/* ── Bottom Nav ── */}
      <nav className="bottom-nav">
        {[
          { id:'chats',    icon:'💬', label:'Chats' },
          { id:'calls',    icon:'📞', label:'Calls' },
          { id:'people',   icon:'👥', label:'People' },
          { id:'settings', icon:'⚙️', label:'Settings' },
        ].map((item) => (
          <button key={item.id}
            className={`bottom-nav-btn ${navTab === item.id ? 'active' : ''}`}
            onClick={() => {
              setNavTab(item.id);
              if (item.id === 'settings') setShowSettings(true);
              else if (item.id === 'calls') setShowCalls(true);
              else if (item.id === 'people') setShowNewChat(true);
            }}>
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      {/* ── Modals ── */}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
      {showProfile  && <ProfileModal  onClose={() => setShowProfile(false)}  />}

      {/* ── Calls Modal ── */}
      {showCalls && (
        <div className="modal-overlay" onClick={() => setShowCalls(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>📞 Recent Calls</h3>
              <button onClick={() => setShowCalls(false)}>✕</button>
            </div>
            <div style={{ padding:'20px', textAlign:'center', color:'var(--text-tertiary)' }}>
              <div style={{ fontSize:40, marginBottom:10 }}>📭</div>
              No recent calls
            </div>
          </div>
        </div>
      )}

      {/* ── New Chat Modal ── */}
      {showNewChat && (
        <div className="modal-overlay" onClick={() => { setShowNewChat(false); setSearchUser(''); setSearchResults([]); }}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>New Conversation</h3>
              <button onClick={() => { setShowNewChat(false); setSearchUser(''); setSearchResults([]); }}>✕</button>
            </div>

            {/* Search people */}
            <div style={{ padding:'10px 14px 4px' }}>
              <div className="sidebar-search" style={{ margin:0 }}>
                <span>🔍</span>
                <input
                  autoFocus
                  placeholder="Search by name, username or phone..."
                  value={searchUser}
                  onChange={(e) => handleUserSearch(e.target.value)}
                />
              </div>
            </div>

            {searching && <div style={{ padding:'10px 16px', color:'var(--text-tertiary)', fontSize:13 }}>Searching...</div>}

            {searchResults.length > 0 && (
              <div className="modal-results">
                {searchResults.map((u) => (
                  <div key={u._id} className="modal-user" onClick={() => openDM(u)}>
                    <div className="modal-user-avatar">
                      {u.avatar?.url
                        ? <img src={u.avatar.url} alt="" />
                        : <div style={{ background: getColor(u.name) }}>{u.name?.[0]}</div>}
                    </div>
                    <div>
                      <div className="modal-user-name">{u.name}</div>
                      <div className="modal-user-sub">@{u.username}{u.phone ? ` · ${u.phone}` : ''}</div>
                    </div>
                    {u.status === 'online' && <span style={{ color:'#4ade80', fontSize:11, marginLeft:'auto' }}>● Online</span>}
                  </div>
                ))}
              </div>
            )}

            {!searching && searchUser.length > 1 && searchResults.length === 0 && (
              <div style={{ padding:'14px 16px', color:'var(--text-tertiary)', fontSize:13, textAlign:'center' }}>
                No users found for "{searchUser}"
              </div>
            )}

            <div style={{ padding:'8px 14px 4px', borderTop:'1px solid var(--border)', marginTop:8 }}>
              <div style={{ fontSize:11, color:'var(--text-tertiary)', marginBottom:8, textTransform:'uppercase', letterSpacing:1 }}>Or create</div>
            </div>

            {/* Create Group */}
            <div style={{ padding:'0 14px 8px', display:'flex', gap:8 }}>
              <input
                className="modal-create-input"
                placeholder="👥 New group name..."
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && createGroup()}
              />
              <button className="modal-create-btn" onClick={createGroup}>Create</button>
            </div>

            {/* Create Channel */}
            <div style={{ padding:'0 14px 14px', display:'flex', gap:8 }}>
              <input
                className="modal-create-input"
                placeholder="📢 New channel name..."
                value={channelName}
                onChange={(e) => setChannelName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && createChannel()}
              />
              <button className="modal-create-btn" onClick={createChannel}>Create</button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
