import React from 'react';
import { Link } from 'react-router-dom';

export default function LandingPage() {
  const features = [
    { icon:'💬', title:'Real-time Messaging',    desc:'Instant delivery. Text, images, videos, voice notes, files — all supported.' },
    { icon:'🤖', title:'Nova AI Built-in',       desc:'Ask Nova anything. Draft messages, translate, summarise chats, get answers.' },
    { icon:'🔔', title:'Push Notifications',     desc:'Get notified even when the browser is closed. Never miss a message.' },
    { icon:'📞', title:'Voice & Video Calls',    desc:'Crystal-clear WebRTC calls. One tap to connect.' },
    { icon:'👥', title:'Groups & Channels',      desc:'Create groups up to 200 members or broadcast channels to thousands.' },
    { icon:'🔒', title:'Private & Secure',       desc:'JWT auth, encrypted connections, privacy controls.' },
    { icon:'🌐', title:'Works Everywhere',       desc:'Web, Android, iOS — one account, all your devices.' },
    { icon:'⚡', title:'Lightning Fast',         desc:'Optimistic UI, Redis caching, WebSocket for zero-latency.' },
  ];

  return (
    <div className="landing">
      <nav className="landing-nav">
        <div className="landing-brand">🪢 Knot</div>
        <div className="landing-nav-links">
          <Link to="/login">Sign In</Link>
          <Link to="/register" className="landing-cta-btn">Get Started Free</Link>
        </div>
      </nav>

      <section className="landing-hero">
        <div className="hero-badge">✨ Now with Nova AI built-in</div>
        <h1 className="hero-title">
          Stay Connected,<br />
          <span className="hero-gradient">Stay Knotted</span>
        </h1>
        <p className="hero-desc">
          Fast, secure, AI-powered messaging for everyone. Chat, call, collaborate — all in one place.
        </p>
        <div className="hero-actions">
          <Link to="/register" className="hero-btn primary">Start for Free →</Link>
          <Link to="/login"    className="hero-btn secondary">Sign In</Link>
        </div>
      </section>

      <section className="landing-features">
        <h2>Everything you need</h2>
        <div className="features-grid">
          {features.map((f) => (
            <div key={f.title} className="feature-card">
              <div className="feature-icon">{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="landing-ai">
        <div className="ai-card">
          <div className="ai-icon">🤖</div>
          <h2>Meet Nova AI</h2>
          <p>Your intelligent assistant, built right into every chat. Ask Nova anything — draft messages, get answers, translate in real time, or summarise long conversations instantly.</p>
          <Link to="/register" className="hero-btn primary" style={{ marginTop:24, display:'inline-block' }}>
            Try Nova AI Free →
          </Link>
        </div>
      </section>

      <footer className="landing-footer">
        <div>🪢 Knot — Built with React, Node.js, MongoDB, Socket.io &amp; Claude AI</div>
        <div style={{ marginTop:6, fontSize:12, opacity:0.4 }}>© 2026 Knot. All rights reserved.</div>
      </footer>
    </div>
  );
}
