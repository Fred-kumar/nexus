import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';
import { useAuthStore } from '../context/store';
import toast from 'react-hot-toast';

export default function RegisterPage() {
  const [form, setForm] = useState({ name: '', username: '', email: '', password: '', phone: '' });
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password.length < 6) return toast.error('Password must be at least 6 characters');
    setLoading(true);
    try {
      const { user, accessToken, refreshToken } = await authAPI.register(form);
      setAuth(user, accessToken, refreshToken);
      toast.success('Account created! Welcome to Nexus 🎉');
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
        <div className="auth-logo">🌐</div>
        <h1 className="auth-title">Join Nexus</h1>
        <p className="auth-sub">Create your account</p>
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-row">
            <div className="auth-field">
              <label>Full Name</label>
              <input type="text" placeholder="Your name" value={form.name} onChange={set('name')} required />
            </div>
            <div className="auth-field">
              <label>Username</label>
              <input type="text" placeholder="@username" value={form.username} onChange={set('username')} required />
            </div>
          </div>
          <div className="auth-field">
            <label>Email</label>
            <input type="email" placeholder="you@email.com" value={form.email} onChange={set('email')} required />
          </div>
          <div className="auth-field">
            <label>Phone (optional)</label>
            <input type="tel" placeholder="+91 9999999999" value={form.phone} onChange={set('phone')} />
          </div>
          <div className="auth-field">
            <label>Password</label>
            <input type="password" placeholder="Min 6 characters" value={form.password} onChange={set('password')} required minLength={6} />
          </div>
          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>
        <p className="auth-switch">Already have an account? <Link to="/login">Sign in</Link></p>
      </div>
    </div>
  );
}
