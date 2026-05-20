import React, { useEffect, useRef } from 'react';
import { useCallStore } from '../../context/store';
import { getSocket } from '../../hooks/useSocket';

export default function IncomingCallModal() {
  const { incomingCall, setIncomingCall, setActiveCall } = useCallStore();
  const ringtoneRef = useRef(null);

  useEffect(() => {
    if (incomingCall) {
      // Play ringtone (create oscillator for demo)
      try {
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        osc.connect(ctx.destination);
        osc.frequency.value = 440;
        osc.start();
        setTimeout(() => { try { osc.stop(); ctx.close(); } catch (e) {} }, 3000);
        ringtoneRef.current = { stop: () => { try { osc.stop(); ctx.close(); } catch (e) {} } };
      } catch (e) {}

      // Auto-reject after 30s
      const timer = setTimeout(() => {
        handleReject();
      }, 30000);
      return () => clearTimeout(timer);
    }
  }, [incomingCall]);

  if (!incomingCall) return null;

  const handleAccept = () => {
    ringtoneRef.current?.stop();
    setActiveCall({ ...incomingCall, status: 'connected' });
    setIncomingCall(null);
    const socket = getSocket();
    socket?.emit('call_answer', { targetUserId: incomingCall.from.id, answer: null });
  };

  const handleReject = () => {
    ringtoneRef.current?.stop();
    const socket = getSocket();
    socket?.emit('call_reject', { targetUserId: incomingCall.from.id });
    setIncomingCall(null);
  };

  return (
    <div className="incoming-call-overlay">
      <div className="incoming-call-modal">
        <div className="call-avatar">
          {incomingCall.from?.avatar?.url
            ? <img src={incomingCall.from.avatar.url} alt="" />
            : <div className="call-avatar-fallback">{incomingCall.from?.name?.[0] || '?'}</div>}
        </div>
        <div className="call-info">
          <div className="call-name">{incomingCall.from?.name || 'Someone'}</div>
          <div className="call-type">
            {incomingCall.callType === 'video' ? '📹 Incoming video call' : '📞 Incoming voice call'}
          </div>
        </div>
        <div className="call-pulse-ring" />
        <div className="call-actions">
          <button className="call-btn reject" onClick={handleReject}>
            📵 Decline
          </button>
          <button className="call-btn accept" onClick={handleAccept}>
            {incomingCall.callType === 'video' ? '📹' : '📞'} Accept
          </button>
        </div>
      </div>
    </div>
  );
}
