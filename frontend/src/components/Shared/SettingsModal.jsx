import React, { useState, useRef } from 'react';
import { useAuthStore, useUIStore } from '../../context/store';
import { userAPI, mediaAPI } from '../../services/api';
import toast from 'react-hot-toast';

export default function SettingsModal({ onClose }) {
  const { user, updateUser } = useAuthStore();
  const { theme, toggleTheme } = useUIStore();
  const [tab, setTab] = useState('profile');
  const [name, setName]   = useState(user?.name || '');
  const [bio, setBio]     = useState(user?.bio || '');
  const [saving, setSaving] = useState(false);
  const [uploadingAv, setUploadingAv] = useState(false);
  const fileRef = useRef();

  const COLORS = ['#534AB7','#BA7517','#185FA5','#0F6E56','#993556','#533489'];
  const getColor = (n) => COLORS[(n?.charCodeAt(0)||0) % COLORS.length];

  const saveProfile = async () => {
    setSaving(true);
    try {
      const updated = await userAPI.updateProfile({ name, bio });
      updateUser({ name, bio });
      toast.success('Profile updated!');
    } catch (e) { toast.error('Failed to save'); }
    setSaving(false);
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAv(true);
    try {
      const { media } = await mediaAPI.upload(file);
      await userAPI.updateProfile({ avatar: { url: media.url, publicId: media.publicId } });
      updateUser({ avatar: { url: media.url, publicId: media.publicId } });
      toast.success('Profile photo updated!');
    } catch (e) { toast.error('Upload failed'); }
    setUploadingAv(false);
  };

  const TABS = [
    { id:'profile', label:'👤 Profile' },
    { id:'appearance', label:'🎨 Appearance' },
    { id:'notifications', label:'🔔 Notifications' },
    { id:'privacy', label:'🔒 Privacy' },
    { id:'account', label:'⚙️ Account' },
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="settings-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>⚙️ Settings</h3>
          <button onClick={onClose}>✕</button>
        </div>

        <div className="settings-layout">
          {/* Left tabs */}
          <div className="settings-tabs">
            {TABS.map((t) => (
              <button key={t.id} className={`settings-tab ${tab === t.id ? 'active' : ''}`}
                onClick={() => setTab(t.id)}>
                {t.label}
              </button>
            ))}
          </div>

          {/* Right content */}
          <div className="settings-content">

            {/* PROFILE */}
            {tab === 'profile' && (
              <div className="settings-section">
                <h4>Profile Information</h4>

                {/* Avatar */}
                <div className="avatar-upload-row">
                  <div className="settings-avatar" onClick={() => fileRef.current.click()}>
                    {user?.avatar?.url
                      ? <img src={user.avatar.url} alt="" />
                      : <div style={{ background: getColor(user?.name) }}>{user?.name?.[0]}</div>}
                    <div className="avatar-overlay">{uploadingAv ? '⏳' : '📷'}</div>
                  </div>
                  <div>
                    <div style={{ fontWeight:600, fontSize:15 }}>{user?.name}</div>
                    <div style={{ fontSize:12, color:'var(--text-tertiary)', marginTop:3 }}>@{user?.username}</div>
                    <button className="change-photo-btn" onClick={() => fileRef.current.click()}>
                      Change Photo
                    </button>
                  </div>
                  <input ref={fileRef} type="file" accept="image/*" style={{ display:'none' }} onChange={handleAvatarChange} />
                </div>

                <div className="settings-field">
                  <label>Full Name</label>
                  <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" maxLength={50} />
                </div>
                <div className="settings-field">
                  <label>Bio</label>
                  <textarea value={bio} onChange={(e) => setBio(e.target.value)}
                    placeholder="Tell people about yourself..." maxLength={150} rows={3} />
                  <div style={{ fontSize:11, color:'var(--text-tertiary)', textAlign:'right' }}>{bio.length}/150</div>
                </div>
                <div className="settings-field">
                  <label>Username</label>
                  <input value={`@${user?.username || ''}`} disabled style={{ opacity:0.6 }} />
                </div>
                <div className="settings-field">
                  <label>Email</label>
                  <input value={user?.email || ''} disabled style={{ opacity:0.6 }} />
                </div>
                <button className="settings-save-btn" onClick={saveProfile} disabled={saving}>
                  {saving ? 'Saving...' : '✅ Save Changes'}
                </button>
              </div>
            )}

            {/* APPEARANCE */}
            {tab === 'appearance' && (
              <div className="settings-section">
                <h4>Appearance</h4>
                <div className="settings-row" onClick={toggleTheme}>
                  <div>
                    <div className="settings-row-label">{theme === 'dark' ? '🌙 Dark Mode' : '☀️ Light Mode'}</div>
                    <div className="settings-row-sub">Currently {theme} theme</div>
                  </div>
                  <div className={`toggle-switch ${theme === 'dark' ? 'on' : ''}`} />
                </div>
                <div className="settings-row">
                  <div>
                    <div className="settings-row-label">🔤 Font Size</div>
                    <div className="settings-row-sub">Adjust message text size</div>
                  </div>
                  <select className="settings-select" onChange={(e) => {
                    document.documentElement.style.setProperty('--msg-font-size', e.target.value);
                  }}>
                    <option value="13px">Small</option>
                    <option value="15px" selected>Medium</option>
                    <option value="17px">Large</option>
                  </select>
                </div>
              </div>
            )}

            {/* NOTIFICATIONS */}
            {tab === 'notifications' && (
              <div className="settings-section">
                <h4>Notifications</h4>
                {[
                  { label:'💬 Message notifications', sub:'Get notified for new messages' },
                  { label:'👥 Group notifications',   sub:'Notifications from groups' },
                  { label:'📞 Call notifications',    sub:'Incoming call alerts' },
                  { label:'🔕 Do Not Disturb',        sub:'Mute all notifications' },
                ].map((item) => (
                  <div key={item.label} className="settings-row">
                    <div>
                      <div className="settings-row-label">{item.label}</div>
                      <div className="settings-row-sub">{item.sub}</div>
                    </div>
                    <ToggleSwitch />
                  </div>
                ))}
                <button className="settings-save-btn" onClick={() => {
                  if ('Notification' in window) {
                    Notification.requestPermission().then((p) => {
                      toast[p === 'granted' ? 'success' : 'error'](
                        p === 'granted' ? '🔔 Notifications enabled!' : 'Permission denied'
                      );
                    });
                  }
                }}>
                  🔔 Enable Push Notifications
                </button>
              </div>
            )}

            {/* PRIVACY */}
            {tab === 'privacy' && (
              <div className="settings-section">
                <h4>Privacy & Security</h4>
                {[
                  { label:'👁️ Last Seen',    sub:'Who can see when you were last online', opts:['Everyone','Contacts','Nobody'] },
                  { label:'📸 Profile Photo', sub:'Who can see your profile photo',       opts:['Everyone','Contacts','Nobody'] },
                  { label:'✅ Read Receipts', sub:'Show blue ticks when you read messages', opts:['On','Off'] },
                ].map((item) => (
                  <div key={item.label} className="settings-row">
                    <div>
                      <div className="settings-row-label">{item.label}</div>
                      <div className="settings-row-sub">{item.sub}</div>
                    </div>
                    <select className="settings-select">
                      {item.opts.map((o) => <option key={o}>{o}</option>)}
                    </select>
                  </div>
                ))}
                <div style={{ marginTop:16, padding:'12px', background:'var(--bg-tertiary)', borderRadius:10, fontSize:13, color:'var(--text-secondary)' }}>
                  🔒 All messages are encrypted in transit. End-to-end encryption coming soon.
                </div>
              </div>
            )}

            {/* ACCOUNT */}
            {tab === 'account' && (
              <div className="settings-section">
                <h4>Account</h4>
                <div className="settings-row">
                  <div>
                    <div className="settings-row-label">📱 Phone Number</div>
                    <div className="settings-row-sub">{user?.phone || 'Not set'}</div>
                  </div>
                  <button className="settings-text-btn">Change</button>
                </div>
                <div className="settings-row">
                  <div>
                    <div className="settings-row-label">📧 Email</div>
                    <div className="settings-row-sub">{user?.email}</div>
                  </div>
                </div>
                <div className="settings-row">
                  <div>
                    <div className="settings-row-label">🔑 Change Password</div>
                    <div className="settings-row-sub">Update your password</div>
                  </div>
                  <button className="settings-text-btn" onClick={() => window.location.href='/forgot-password'}>Change</button>
                </div>
                <div className="settings-row">
                  <div>
                    <div className="settings-row-label">🗑️ Delete Account</div>
                    <div className="settings-row-sub">Permanently delete your account</div>
                  </div>
                  <button className="settings-text-btn danger" onClick={() => {
                    if (window.confirm('Are you sure? This cannot be undone.')) toast.error('Contact support to delete account.');
                  }}>Delete</button>
                </div>
                <button className="settings-save-btn danger" style={{ marginTop:20 }} onClick={() => {
                  const { logout } = useAuthStore.getState();
                  logout();
                  window.location.href = '/login';
                }}>
                  🚪 Logout
                </button>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}

function ToggleSwitch() {
  const [on, setOn] = useState(true);
  return (
    <div className={`toggle-switch ${on ? 'on' : ''}`} onClick={() => setOn(!on)} />
  );
}
