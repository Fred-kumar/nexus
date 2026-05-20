import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

export const useAuthStore = create(
  devtools(
    persist(
      (set) => ({
        user: null,
        accessToken: null,
        refreshToken: null,
        isAuthenticated: false,
        setAuth: (user, accessToken, refreshToken) =>
          set({ user, accessToken, refreshToken, isAuthenticated: true }),
        updateUser: (updates) =>
          set((state) => ({ user: { ...state.user, ...updates } })),
        logout: () =>
          set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false }),
      }),
      { name: 'knot-auth', partialize: (s) => ({ user: s.user, accessToken: s.accessToken, refreshToken: s.refreshToken }) }
    )
  )
);

export const useChatStore = create(
  devtools((set, get) => ({
    chats: [],            // ← NO dummy data, always from API
    activeChat: null,
    messages: {},
    typingUsers: {},
    unreadCounts: {},
    searchQuery: '',
    filter: 'All',
    stories: [],          // ← from API only

    setChats: (chats) => set({ chats }),
    addChat: (chat) =>
      set((state) => ({ chats: [chat, ...state.chats.filter((c) => c._id !== chat._id)] })),
    updateChat: (chatId, updates) =>
      set((state) => ({ chats: state.chats.map((c) => c._id === chatId ? { ...c, ...updates } : c) })),
    setActiveChat: (chat) => set({ activeChat: chat }),

    setMessages: (chatId, msgs) =>
      set((state) => ({ messages: { ...state.messages, [chatId]: msgs } })),
    addMessage: (chatId, msg) =>
      set((state) => ({
        messages: { ...state.messages, [chatId]: [...(state.messages[chatId] || []), msg] },
        chats: state.chats.map((c) => c._id === chatId ? { ...c, lastMessage: msg, lastActivity: new Date() } : c),
      })),
    updateMessage: (chatId, msgId, updates) =>
      set((state) => ({
        messages: {
          ...state.messages,
          [chatId]: (state.messages[chatId] || []).map((m) => m._id === msgId ? { ...m, ...updates } : m),
        },
      })),
    removeMessage: (chatId, msgId) =>
      set((state) => ({
        messages: { ...state.messages, [chatId]: (state.messages[chatId] || []).filter((m) => m._id !== msgId) },
      })),
    prependMessages: (chatId, msgs) =>
      set((state) => ({
        messages: { ...state.messages, [chatId]: [...msgs, ...(state.messages[chatId] || [])] },
      })),

    setTyping: (chatId, userId, isTyping) =>
      set((state) => {
        const cur = new Set(state.typingUsers[chatId] || []);
        isTyping ? cur.add(userId) : cur.delete(userId);
        return { typingUsers: { ...state.typingUsers, [chatId]: [...cur] } };
      }),
    setUnread: (chatId, count) =>
      set((state) => ({ unreadCounts: { ...state.unreadCounts, [chatId]: count } })),
    setFilter: (filter) => set({ filter }),
    setSearch: (searchQuery) => set({ searchQuery }),
    setStories: (stories) => set({ stories }),
  }))
);

export const useCallStore = create((set) => ({
  activeCall: null,
  incomingCall: null,
  setActiveCall: (call) => set({ activeCall: call }),
  setIncomingCall: (call) => set({ incomingCall: call }),
  endCall: () => set({ activeCall: null }),
}));

export const useUIStore = create(
  persist(
    (set) => ({
      theme: 'dark',
      sidebarOpen: true,
      rightPanelOpen: false,
      toggleTheme: () => set((s) => {
        const next = s.theme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        document.body.setAttribute('data-theme', next);
        return { theme: next };
      }),
      setRightPanel: (open) => set({ rightPanelOpen: open }),
    }),
    { name: 'knot-ui' }
  )
);
