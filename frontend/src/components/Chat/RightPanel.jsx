import React, { useState } from 'react';
import { useChatStore, useUIStore, useAuthStore } from '../../context/store';
import { chatAPI } from '../../services/api';
import toast from 'react-hot-toast';

export default function RightPanel() {
  const { activeChat, updateChat } = useChatStore();
  const { setRightPanel } = useUIStore();
  const { user } = useAuthStore();
  const [tab, setTab] = useState('info'); // info | media | members

  if (!activeChat) return null;
  const isGroup = activeChat.type === 'group' || activeChat.type === 'channel';
  const isAI = activeChat.type === 'ai';
  const me = activeChat.participants?.find((p) => p.user?._id === user?._id);
  const isAdmin = ['owner', 'admin'].includes(me?.role);

  const handleMute = () => toast('Notifications muted for 8 hours');
  const handleLeave = async () => {
    if (!window.confirm('Leave this group?')) return;
    try {
      await chatAPI.removeMember(activeChat._id, user._id);
      toast.success('Left group');
      setRightPanel(false);
    } catch (e) { toast.error('Could not leave'); }
  };

  return (
    <aside className="right-panel">
      <div className="rp-header">
        <h3>{isAI ? 'About Nova AI' : isGroup ? 'Group Info' : 'Contact Info'}</h3>
        <button className="icon-btn" onClick={() => setRightPanel(false)}>✕</button>
      </div>

      {/* Avatar + name */}
      <div className="rp-profile">
        <div className="rp-avatar">
          {activeChat.avatar?.url
            ? <img src={activeChat.avatar.url} alt="" />
            : <div className="rp-avatar-fallback">
                {isAI ? '🤖' : activeChat.name?.[0]}
              </div>}
        </div>
        <div className="rp-name">{activeChat.name}</div>
        <div className="rp-sub">
          {isAI ? 'Powered by Claude · Built into Nexus'
            : isGroup ? `${activeChat.participants?.length} members`
            : activeChat.participants?.find((p) => p.user?._id !== user?._id)?.user?.bio || 'No bio'}
        </div>
        {isAI && (
          <div className="rp-ai-note">
            Nova can help you write messages, answer questions, translate text, summarise chats, and more.
          </div>
        )}
      </div>

      {/* Tabs */}
      {!isAI && (
        <div className="rp-tabs">
          {['info', 'media', isGroup && 'members'].filter(Boolean).map((t) => (
            <button key={t} className={`rp-tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      )}

      <div className="rp-body">
        {tab === 'info' && (
          <div className="rp-info-list">
            {isGroup && activeChat.description && (
              <div className="rp-info-row">
                <span className="rp-info-label">Description</span>
                <span className="rp-info-val">{activeChat.description}</span>
              </div>
            )}
            {activeChat.settings?.inviteLink && isAdmin && (
              <div className="rp-info-row">
                <span className="rp-info-label">Invite Link</span>
                <button
                  className="rp-link-btn"
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/join/${activeChat.settings.inviteLink}`);
                    toast.success('Link copied!');
                  }}
                >
                  📋 Copy invite link
                </button>
              </div>
            )}
            <div className="rp-actions">
              <button className="rp-action-btn" onClick={handleMute}>🔕 Mute</button>
              {!isAI && <button className="rp-action-btn danger" onClick={isGroup ? handleLeave : () => toast('Contact blocked')}>
                {isGroup ? '🚪 Leave Group' : '🚫 Block'}
              </button>}
            </div>
          </div>
        )}

        {tab === 'media' && (
          <div className="rp-media-grid">
            <p className="rp-empty">No shared media yet</p>
          </div>
        )}

        {tab === 'members' && (
          <div className="rp-members">
            {activeChat.participants?.map((p) => (
              <div key={p.user?._id} className="rp-member">
                <div className="rp-member-avatar">
                  {p.user?.avatar?.url
                    ? <img src={p.user.avatar.url} alt="" />
                    : <div className="rp-member-fallback">{p.user?.name?.[0]}</div>}
                </div>
                <div className="rp-member-info">
                  <div className="rp-member-name">{p.user?.name}</div>
                  <div className="rp-member-sub">@{p.user?.username}</div>
                </div>
                <div className={`rp-member-role ${p.role}`}>{p.role}</div>
              </div>
            ))}
            {isAdmin && (
              <button className="rp-add-member-btn" onClick={() => toast('Add member dialog')}>
                + Add Members
              </button>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
