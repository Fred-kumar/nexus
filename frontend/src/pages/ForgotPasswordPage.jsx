// ─── ForgotPasswordPage.jsx ──────────────────────────────────────
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { authAPI } from '../services/api';
import toast from 'react-hot-toast';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await authAPI.forgotPassword(email);
      setSent(true);
      toast.success('Reset link sent if the email exists!');
    } catch (e) { toast.error('Something went wrong'); }
    setLoading(false);
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">🔐</div>
        <h1 className="auth-title">Forgot Password?</h1>
        {sent ? (
          <div className="auth-success">
            <p>✅ Check your email for a password reset link.</p>
            <Link to="/login" className="auth-btn" style={{ display: 'inline-block', marginTop: 16 }}>Back to Login</Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="auth-form">
            <div className="auth-field">
              <label>Email Address</label>
              <input type="email" placeholder="you@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <button type="submit" className="auth-btn" disabled={loading}>
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>
            <p className="auth-switch"><Link to="/login">← Back to Login</Link></p>
          </form>
        )}
      </div>
    </div>
  );
}
