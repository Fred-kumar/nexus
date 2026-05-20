import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';
import { useAuthStore } from '../context/store';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const [form, setForm]       = useState({ identifier: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const { setAuth }   = useAuthStore();
  const navigate      = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.identifier.trim() || !form.password) return toast.error('Fill all fields');
    setLoading(true);
    try {
      const { user, accessToken, refreshToken } = await authAPI.login(form);
      setAuth(user, accessToken, refreshToken);
      toast.success(`Welcome back, ${user.name}! 👋`);
      navigate('/');
    } catch (err) {
      const msg = err?.error || err?.errors?.[0]?.msg || 'Invalid credentials';
      toast.error(msg);
    }
    setLoading(false);
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">🪢</div>
        <h1 className="auth-title">Knot</h1>
        <p className="auth-sub">Sign in to continue</p>
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-field">
            <label>Email / Username / Phone</label>
            <input
              type="text"
              placeholder="Enter email, username or phone"
              value={form.identifier}
              onChange={(e) => setForm({ ...form, identifier: e.target.value.trim() })}
              required autoFocus autoComplete="username"
            />
          </div>
          <div className="auth-field">
            <label>Password</label>
            <div style={{ position:'relative' }}>
              <input
                type={showPass ? 'text' : 'password'}
                placeholder="Enter your password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required autoComplete="current-password"
                style={{ width:'100%', paddingRight:44 }}
              />
              <button type="button"
                onClick={() => setShowPass(!showPass)}
                style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', fontSize:16 }}>
                {showPass ? '🙈' : '👁️'}
              </button>
            </div>
          </div>
          <div className="auth-forgot">
            <Link to="/forgot-password">Forgot password?</Link>
          </div>
          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? '⏳ Signing in...' : 'Sign In'}
          </button>
        </form>
        <p className="auth-switch">
          Don't have an account? <Link to="/register">Sign up</Link>
        </p>
      </div>
    </div>
  );
}
