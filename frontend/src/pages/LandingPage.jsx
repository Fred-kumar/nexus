import React from 'react';
import { Link } from 'react-router-dom';

export default function LandingPage() {
  const features = [
    { icon: '💬', title: 'Real-time Messaging', desc: 'Instant delivery with WebSocket. Text, images, videos, voice, files.' },
    { icon: '🤖', title: 'Nova AI Built-in', desc: 'Claude-powered AI assistant for smart replies, translation, summaries.' },
    { icon: '🔔', title: 'Push Notifications', desc: 'Get notified even when the app is closed. Never miss a message.' },
    { icon: '📞', title: 'Voice & Video Calls', desc: 'Crystal-clear WebRTC calls directly in the app.' },
    { icon: '👥', title: 'Groups & Channels', desc: 'Create groups up to 200 members or broadcast channels.' },
    { icon: '🔒', title: 'End-to-End Encryption', desc: 'Your messages are private and secure.' },
    { icon: '🌐', title: 'Cross-platform', desc: 'Web, iOS, Android — your chats sync everywhere.' },
    { icon: '⚡', title: 'Lightning Fast', desc: 'Redis caching, optimistic UI, and infinite scroll.' },
  ];

  return (
    <div className="landing">
      <nav className="landing-nav">
        <div className="landing-brand">🌐 Nexus</div>
        <div className="landing-nav-links">
          <Link to="/login">Sign In</Link>
          <Link to="/register" className="landing-cta-btn">Get Started Free</Link>
        </div>
      </nav>

      <section className="landing-hero">
        <div className="hero-badge">✨ Now with Nova AI built-in</div>
        <h1 className="hero-title">
          The Messenger<br />
          <span className="hero-gradient">Built for the Future</span>
        </h1>
        <p className="hero-desc">
          Fast, secure, AI-powered messaging. Chat, call, collaborate — all in one place.
          With Nova AI, your messages get smarter.
        </p>
        <div className="hero-actions">
          <Link to="/register" className="hero-btn primary">Start for Free →</Link>
          <Link to="/login" className="hero-btn secondary">Sign In</Link>
        </div>
      </section>

      <section className="landing-features">
        <h2>Everything you need, and more</h2>
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
          <p>Your intelligent assistant, built right into every chat. Ask Nova anything — draft messages, get answers, translate in real time, or summarise long conversations.</p>
          <Link to="/register" className="hero-btn primary" style={{ marginTop: 24, display: 'inline-block' }}>
            Try Nova AI Free
          </Link>
        </div>
      </section>

      <footer className="landing-footer">
        <div>🌐 Nexus — Built with ❤️ using React, Node.js, MongoDB, Socket.io, and Claude AI</div>
        <div style={{ marginTop: 8, fontSize: 12, opacity: 0.5 }}>© 2026 Nexus. All rights reserved.</div>
      </footer>
    </div>
  );
}
