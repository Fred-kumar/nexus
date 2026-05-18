import { useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useAuthStore, useChatStore, useCallStore } from '../context/store';
import toast from 'react-hot-toast';

let socketInstance = null;

export const useSocket = () => {
  const { accessToken, isAuthenticated } = useAuthStore();
  const { addMessage, updateMessage, removeMessage, setTyping, updateChat } = useChatStore();
  const { setIncomingCall } = useCallStore();
  const socketRef = useRef(null);

  useEffect(() => {
    if (!isAuthenticated || !accessToken) return;

    const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';

    const socket = io(SOCKET_URL, {
      auth: { token: accessToken },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;
    socketInstance = socket;

    socket.on('connect', () => {
      console.log('✅ Socket connected:', socket.id);
    });

    socket.on('connect_error', (err) => {
      console.error('Socket error:', err.message);
    });

    // ─── Message events ──────────────────────────────────────────
    socket.on('new_message', (message) => {
      const chatId = message.chat?._id || message.chat;
      addMessage(chatId, message);

      // Show in-app notification if chat is not active
      const activeChat = useChatStore.getState().activeChat;
      if (activeChat?._id !== chatId && !message.isAI) {
        const senderName = message.sender?.name || 'Someone';
        const preview = message.type === 'text' ? message.content : `📎 ${message.type}`;
        toast.custom(() => (
          <div className="toast-notification">
            <strong>{senderName}</strong>
            <p>{preview.slice(0, 60)}</p>
          </div>
        ), { duration: 3000 });
      }

      // Mark delivered
      socket.emit('message_delivered', { messageId: message._id });
    });

    socket.on('message_edited', ({ messageId, content, editedAt }) => {
      const chatId = useChatStore.getState().activeChat?._id;
      if (chatId) updateMessage(chatId, messageId, { content, edited: true, editedAt });
    });

    socket.on('message_deleted', ({ messageId, forAll }) => {
      const chatId = useChatStore.getState().activeChat?._id;
      if (chatId && forAll) updateMessage(chatId, messageId, { deleted: true, content: '' });
    });

    socket.on('reaction_update', ({ messageId, reactions }) => {
      const chatId = useChatStore.getState().activeChat?._id;
      if (chatId) updateMessage(chatId, messageId, { reactions });
    });

    socket.on('message_pinned', ({ chatId, messageId }) => {
      updateChat(chatId, { pinnedMessage: messageId });
    });

    // ─── Typing ──────────────────────────────────────────────────
    socket.on('user_typing', ({ chatId, userId }) => {
      setTyping(chatId, userId, true);
    });

    socket.on('user_stopped_typing', ({ chatId, userId }) => {
      setTyping(chatId, userId, false);
    });

    // ─── Presence ────────────────────────────────────────────────
    socket.on('user_online', ({ userId }) => {
      useChatStore.getState().chats.forEach((c) => {
        const p = c.participants?.find((p) => p.user?._id === userId);
        if (p) updateChat(c._id, {});
      });
    });

    socket.on('user_offline', ({ userId, lastSeen }) => {
      // update status in chat participants
    });

    // ─── Read receipts ───────────────────────────────────────────
    socket.on('messages_read', ({ chatId, userId }) => {
      // Could update read indicators here
    });

    // ─── Group events ────────────────────────────────────────────
    socket.on('group_updated', ({ chatId, event, newMembers }) => {
      // refetch chat
    });

    socket.on('member_joined', ({ chatId, userId }) => {
      // update participant list
    });

    socket.on('member_removed', ({ chatId, userId }) => {
      // update participant list
    });

    // ─── Call events ─────────────────────────────────────────────
    socket.on('incoming_call', (callData) => {
      setIncomingCall(callData);
    });

    socket.on('call_answered', ({ answer }) => {
      // Handle WebRTC answer
      window.dispatchEvent(new CustomEvent('call_answered', { detail: { answer } }));
    });

    socket.on('ice_candidate', ({ candidate }) => {
      window.dispatchEvent(new CustomEvent('ice_candidate', { detail: { candidate } }));
    });

    socket.on('call_rejected', () => {
      window.dispatchEvent(new CustomEvent('call_rejected'));
      toast.error('Call was rejected');
    });

    socket.on('call_ended', () => {
      window.dispatchEvent(new CustomEvent('call_ended'));
    });

    return () => {
      socket.disconnect();
      socketInstance = null;
    };
  }, [isAuthenticated, accessToken]);

  const emit = useCallback((event, data) => {
    socketRef.current?.emit(event, data);
  }, []);

  const joinChat = useCallback((chatId) => {
    socketRef.current?.emit('join_chat', chatId);
  }, []);

  const startTyping = useCallback((chatId) => {
    socketRef.current?.emit('typing_start', { chatId });
  }, []);

  const stopTyping = useCallback((chatId) => {
    socketRef.current?.emit('typing_stop', { chatId });
  }, []);

  const markRead = useCallback((chatId, messageIds) => {
    socketRef.current?.emit('mark_read', { chatId, messageIds });
  }, []);

  return { emit, joinChat, startTyping, stopTyping, markRead, socket: socketRef.current };
};

export const getSocket = () => socketInstance;
