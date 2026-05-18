import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useChatStore, useAuthStore } from '../../context/store';
import { messageAPI, novaAPI } from '../../services/api';
import { useSocket } from '../../hooks/useSocket';
import { useUIStore } from '../../context/store';
import MessageBubble from './MessageBubble';
import MessageInput from './MessageInput';
import ChatHeader from './ChatHeader';
import TypingIndicator from './TypingIndicator';
import toast from 'react-hot-toast';
import { format, isToday, isYesterday } from 'date-fns';

const DATE_DIVIDER_THRESHOLD = 5 * 60 * 1000; // 5 min

function getDateLabel(date) {
  const d = new Date(date);
  if (isToday(d)) return 'Today';
  if (isYesterday(d)) return 'Yesterday';
  return format(d, 'MMMM d, yyyy');
}

export default function ChatWindow() {
  const { activeChat, messages, typingUsers, addMessage, updateMessage, removeMessage, prependMessages } = useChatStore();
  const { user } = useAuthStore();
  const { startTyping, stopTyping, markRead } = useSocket();
  const { setRightPanel } = useUIStore();

  const [replyTo, setReplyTo] = useState(null);
  const [editingMsg, setEditingMsg] = useState(null);
  const [smartReplies, setSmartReplies] = useState([]);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);

  const bottomRef = useRef(null);
  const listRef = useRef(null);
  const typingTimer = useRef(null);

  const chatId = activeChat?._id;
  const chatMessages = messages[chatId] || [];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages.length]);

  useEffect(() => {
    // Mark visible messages as read
    const unread = chatMessages
      .filter((m) => m.sender?._id !== user?._id && !m.readBy?.find((r) => r.user === user?._id))
      .map((m) => m._id);
    if (unread.length) markRead(chatId, unread);
  }, [chatMessages, user?._id, chatId]);

  // Load older messages (infinite scroll)
  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const { messages: older, pages } = await messageAPI.getMessages(chatId, {
        page: page + 1, limit: 50,
      });
      if (older.length < 50 || page + 1 >= pages) setHasMore(false);
      prependMessages(chatId, older);
      setPage((p) => p + 1);
    } catch (e) {}
    setLoadingMore(false);
  }, [chatId, page, loadingMore, hasMore]);

  const handleScroll = useCallback(() => {
    if (listRef.current?.scrollTop < 100) loadMore();
  }, [loadMore]);

  // Send message
  const handleSend = useCallback(async (content, type = 'text', media = null) => {
    if (activeChat?.type === 'ai') {
      // Use Nova AI
      const history = chatMessages.slice(-10).map((m) => ({
        role: m.sender?._id === user?._id || m.isAI === false ? 'user' : 'assistant',
        content: m.content,
      }));
      try {
        const tempId = `temp-${Date.now()}`;
        addMessage(chatId, {
          _id: tempId,
          sender: { _id: user._id, name: user.name, username: user.username },
          content,
          type: 'text',
          createdAt: new Date(),
          temp: true,
        });
        await novaAPI.chat(chatId, content, history);
        // Nova response comes via socket
        if (chatMessages.length > 3) {
          const last = chatMessages[chatMessages.length - 1];
          const { suggestions } = await novaAPI.smartReplies(last.content, 'assistant response');
          setSmartReplies(suggestions || []);
        }
      } catch (e) {
        toast.error('Nova AI unavailable');
      }
      return;
    }

    try {
      const payload = { chatId, content, type, replyTo: replyTo?._id };
      if (media) payload.media = media;
      await messageAPI.send(payload);
      setReplyTo(null);
      setEditingMsg(null);
    } catch (e) {
      toast.error('Failed to send message');
    }
  }, [chatId, activeChat, user, replyTo, chatMessages]);

  const handleEdit = useCallback(async (msgId, newContent) => {
    try {
      await messageAPI.edit(msgId, newContent);
      setEditingMsg(null);
    } catch (e) { toast.error('Edit failed'); }
  }, []);

  const handleDelete = useCallback(async (msgId, forAll) => {
    try {
      await messageAPI.delete(msgId, forAll);
      if (forAll) updateMessage(chatId, msgId, { deleted: true, content: 'This message was deleted' });
      else removeMessage(chatId, msgId);
    } catch (e) { toast.error('Delete failed'); }
  }, [chatId]);

  const handleReact = useCallback(async (msgId, emoji) => {
    try {
      await messageAPI.react(msgId, emoji);
    } catch (e) {}
  }, []);

  const handleTyping = useCallback(() => {
    startTyping(chatId);
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => stopTyping(chatId), 2000);
  }, [chatId, startTyping, stopTyping]);

  // Group messages with date dividers
  const renderMessages = () => {
    const items = [];
    let lastDate = null;

    chatMessages.forEach((msg, i) => {
      const msgDate = format(new Date(msg.createdAt), 'yyyy-MM-dd');
      if (msgDate !== lastDate) {
        items.push(
          <div key={`date-${msgDate}`} className="date-divider">
            <span>{getDateLabel(msg.createdAt)}</span>
          </div>
        );
        lastDate = msgDate;
      }
      items.push(
        <MessageBubble
          key={msg._id}
          message={msg}
          isOwn={msg.sender?._id === user?._id}
          onReply={() => setReplyTo(msg)}
          onEdit={() => setEditingMsg(msg)}
          onDelete={(forAll) => handleDelete(msg._id, forAll)}
          onReact={(emoji) => handleReact(msg._id, emoji)}
          onForward={() => {/* open forward dialog */}}
          showAvatar={
            i === 0 ||
            chatMessages[i - 1]?.sender?._id !== msg.sender?._id ||
            new Date(msg.createdAt) - new Date(chatMessages[i - 1]?.createdAt) > DATE_DIVIDER_THRESHOLD
          }
        />
      );
    });

    return items;
  };

  const typingList = typingUsers[chatId] || [];

  return (
    <div className="chat-window">
      <ChatHeader chat={activeChat} onInfoClick={() => setRightPanel(true)} />

      <div className="messages-container" ref={listRef} onScroll={handleScroll}>
        {loadingMore && <div className="loading-more">Loading...</div>}
        {renderMessages()}
        {typingList.length > 0 && <TypingIndicator users={typingList} />}
        <div ref={bottomRef} />
      </div>

      {smartReplies.length > 0 && (
        <div className="smart-replies">
          {smartReplies.map((r, i) => (
            <button key={i} className="smart-reply-btn" onClick={() => { handleSend(r); setSmartReplies([]); }}>
              {r}
            </button>
          ))}
        </div>
      )}

      <MessageInput
        onSend={handleSend}
        onTyping={handleTyping}
        replyTo={replyTo}
        onClearReply={() => setReplyTo(null)}
        editingMsg={editingMsg}
        onEditSubmit={handleEdit}
        onCancelEdit={() => setEditingMsg(null)}
        chat={activeChat}
      />
    </div>
  );
}
