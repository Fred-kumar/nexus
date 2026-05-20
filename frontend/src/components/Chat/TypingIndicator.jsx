// ─── TypingIndicator.jsx ──────────────────────────────────────────
import React from 'react';

export default function TypingIndicator({ users }) {
  if (!users?.length) return null;
  return (
    <div className="typing-indicator-wrap">
      <div className="typing-bubble">
        <span className="typing-dot" />
        <span className="typing-dot" />
        <span className="typing-dot" />
      </div>
      <span className="typing-label">
        {users.length === 1 ? 'Someone is typing...' : `${users.length} people are typing...`}
      </span>
    </div>
  );
}
