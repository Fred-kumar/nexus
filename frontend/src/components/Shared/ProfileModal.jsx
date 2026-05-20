import React from 'react';
import { useAuthStore, useUIStore } from '../../context/store';
import { useNavigate } from 'react-router-dom';

export default function ProfileModal({ onClose }) {
  const { user, logout } = useAuthStore();
  const COLORS = ['#534AB7','#BA7517','#185FA5','#0F6E56','#993556'];
  const getColor = (n) => COLORS[(n?.charCodeAt(0)||0) % COLORS.length];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>My Profile</h3>
          <button onClick={onClose}>✕</button>
        </div>
        <div style={{ padding:'24px', textAlign:'center' }}>
          <div className="profile-avatar-lg">
            {user?.avatar?.url
              ? <img src={user.avatar.url} alt="" style={{ width:'100%', height:'100%', borderRadius:'50%', objectFit:'cover' }} />
              : <div style={{ width:80, height:80, borderRadius:'50%', background: getColor(user?.name), display:'flex', alignItems:'center', justifyContent:'center', fontSize:32, color:'#fff', margin:'0 auto' }}>
                  {user?.name?.[0]}
                </div>}
          </div>
          <div style={{ fontSize:20, fontWeight:700, marginTop:12 }}>{user?.name}</div>
          <div style={{ color:'var(--text-secondary)', fontSize:13 }}>@{user?.username}</div>
          {user?.bio && <div style={{ color:'var(--text-secondary)', fontSize:13, marginTop:8, fontStyle:'italic' }}>"{user.bio}"</div>}
          <div style={{ marginTop:20, display:'flex', flexDirection:'column', gap:8, textAlign:'left' }}>
            {[
              ['📧 Email', user?.email],
              ['📱 Phone', user?.phone || 'Not set'],
              ['✅ Verified', user?.isVerified ? 'Yes' : 'No'],
            ].map(([k,v]) => (
              <div key={k} style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid var(--border)', fontSize:14 }}>
                <span style={{ color:'var(--text-secondary)' }}>{k}</span>
                <span>{v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
