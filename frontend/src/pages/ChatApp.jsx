import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from 'react-query';
import { chatAPI, messageAPI } from '../services/api';
import { useChatStore, useAuthStore, useUIStore } from '../context/store';
import { useSocket } from '../hooks/useSocket';
import Sidebar from '../components/Sidebar/Sidebar';
import ChatWindow from '../components/Chat/ChatWindow';
import RightPanel from '../components/Chat/RightPanel';
import IncomingCallModal from '../components/Shared/IncomingCallModal';
import './ChatApp.css';

export default function ChatApp() {
  const { activeChat, setActiveChat, setChats, setMessages, chats } = useChatStore();
  const { rightPanelOpen } = useUIStore();
  const { user } = useAuthStore();
  const { joinChat } = useSocket();
  const [searchParams] = useSearchParams();

  // Load all chats on mount
  const { isLoading } = useQuery('chats', chatAPI.getAll, {
    onSuccess: ({ chats }) => setChats(chats),
    refetchInterval: 60000,
  });

  // Open chat from URL param or push notification
  useEffect(() => {
    const chatId = searchParams.get('chat');
    if (chatId && chats.length) {
      const chat = chats.find((c) => c._id === chatId);
      if (chat) openChat(chat);
    }
  }, [searchParams, chats]);

  // Listen for SW open_chat events
  useEffect(() => {
    const handler = (e) => {
      const chat = chats.find((c) => c._id === e.detail.chatId);
      if (chat) openChat(chat);
    };
    window.addEventListener('open_chat', handler);
    return () => window.removeEventListener('open_chat', handler);
  }, [chats]);

  const openChat = useCallback(async (chat) => {
    setActiveChat(chat);
    joinChat(chat._id);
    // Load messages
    try {
      const { messages } = await messageAPI.getMessages(chat._id, { limit: 50 });
      setMessages(chat._id, messages);
    } catch (e) {}
  }, [setActiveChat, joinChat, setMessages]);

  return (
    <div className="chat-app" data-theme="dark">
      <Sidebar onSelectChat={openChat} isLoading={isLoading} />
      <main className="chat-main">
        {activeChat ? (
          <ChatWindow />
        ) : (
          <div className="chat-empty">
            <div className="chat-empty-icon">🌐</div>
            <h2>Welcome to Nexus, {user?.name?.split(' ')[0]}!</h2>
            <p>Select a conversation or start a new one</p>
            <div className="chat-empty-hint">
              <span>💡 Try chatting with <strong>Nova AI</strong> — your built-in assistant</span>
            </div>
          </div>
        )}
      </main>
      {rightPanelOpen && activeChat && <RightPanel />}
      <IncomingCallModal />
    </div>
  );
}
