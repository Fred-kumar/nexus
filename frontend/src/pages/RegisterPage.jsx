import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';
import { useAuthStore } from '../context/store';
import toast from 'react-hot-toast';

export default function RegisterPage() {
  const [form, setForm]       = useState({ name:'', username:'', email:'', password:'', phone:'' });
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const { setAuth } = useAuthStore();
  const navigate    = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim())     return toast.error('Enter your name');
    if (form.username.length < 3) return toast.error('Username must be at least 3 characters');
    if (!/^[a-zA-Z0-9_]+$/.test(form.username)) return toast.error('Username: letters, numbers, _ only');
    if (!/\S+@\S+\.\S+/.test(form.email)) return toast.error('Enter a valid email');
    if (form.password.length < 6) return toast.error('Password must be at least 6 characters');

    setLoading(true);
    try {
      const data = { ...form, username: form.username.toLowerCase().trim() };
      if (!data.phone) delete data.phone;
      const { user, accessToken, refreshToken } = await authAPI.register(data);
      setAuth(user, accessToken, refreshToken);
      toast.success('Welcome to Knot! 🎉');
      navigate('/');
    } catch (err) {
      const msg = err?.errors?.[0]?.msg || err?.error || 'Registration failed';
      toast.error(msg);
    }
    setLoading(false);
  };

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">🪢</div>
        <h1 className="auth-title">Join Knot</h1>
        <p className="auth-sub">Create your free account</p>
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-row">
            <div className="auth-field">
              <label>Full Name *</label>
              <input type="text" placeholder="Your name" value={form.name} onChange={set('name')} required autoFocus />
            </div>
            <div className="auth-field">
              <label>Username *</label>
              <input type="text" placeholder="username" value={form.username} onChange={set('username')} required />
            </div>
          </div>
          <div className="auth-field">
            <label>Email *</label>
            <input type="email" placeholder="you@email.com" value={form.email} onChange={set('email')} required />
          </div>
          <div className="auth-field">
            <label>Phone (optional)</label>
            <input type="tel" placeholder="+91 9999999999" value={form.phone} onChange={set('phone')} />
          </div>
          <div className="auth-field">
            <label>Password *</label>
            <div style={{ position:'relative' }}>
              <input type={showPass ? 'text' : 'password'} placeholder="Min 6 characters"
                value={form.password} onChange={set('password')} required minLength={6}
                style={{ width:'100%', paddingRight:44 }} />
              <button type="button" onClick={() => setShowPass(!showPass)}
                style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', fontSize:16 }}>
                {showPass ? '🙈' : '👁️'}
              </button>
            </div>
            {form.password && (
              <div style={{ height:3, borderRadius:2, marginTop:6, background: form.password.length < 6 ? '#ef4444' : form.password.length < 10 ? '#f59e0b' : '#22c55e', transition:'all 0.3s', width: `${Math.min(form.password.length*10, 100)}%` }} />
            )}
          </div>
          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? '⏳ Creating account...' : 'Create Account'}
          </button>
        </form>
        <p className="auth-switch">Already have an account? <Link to="/login">Sign in</Link></p>
      </div>
    </div>
  );
}
