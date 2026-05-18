import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

export const useAuthStore = create(
  devtools(
    persist(
      (set, get) => ({
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
      { name: 'nexus-auth', partialize: (state) => ({ user: state.user, accessToken: state.accessToken, refreshToken: state.refreshToken }) }
    )
  )
);

export const useChatStore = create(
  devtools((set, get) => ({
    chats: [],
    activeChat: null,
    messages: {}, // chatId -> Message[]
    typingUsers: {}, // chatId -> [userId]
    unreadCounts: {},
    searchQuery: '',
    filter: 'all',

    setChats: (chats) => set({ chats }),

    addChat: (chat) =>
      set((state) => ({ chats: [chat, ...state.chats.filter((c) => c._id !== chat._id)] })),

    updateChat: (chatId, updates) =>
      set((state) => ({
        chats: state.chats.map((c) => (c._id === chatId ? { ...c, ...updates } : c)),
      })),

    setActiveChat: (chat) => set({ activeChat: chat }),

    setMessages: (chatId, messages) =>
      set((state) => ({ messages: { ...state.messages, [chatId]: messages } })),

    addMessage: (chatId, message) =>
      set((state) => ({
        messages: {
          ...state.messages,
          [chatId]: [...(state.messages[chatId] || []), message],
        },
        chats: state.chats.map((c) =>
          c._id === chatId ? { ...c, lastMessage: message, lastActivity: new Date() } : c
        ),
      })),

    updateMessage: (chatId, messageId, updates) =>
      set((state) => ({
        messages: {
          ...state.messages,
          [chatId]: (state.messages[chatId] || []).map((m) =>
            m._id === messageId ? { ...m, ...updates } : m
          ),
        },
      })),

    removeMessage: (chatId, messageId) =>
      set((state) => ({
        messages: {
          ...state.messages,
          [chatId]: (state.messages[chatId] || []).filter((m) => m._id !== messageId),
        },
      })),

    prependMessages: (chatId, messages) =>
      set((state) => ({
        messages: {
          ...state.messages,
          [chatId]: [...messages, ...(state.messages[chatId] || [])],
        },
      })),

    setTyping: (chatId, userId, isTyping) =>
      set((state) => {
        const current = new Set(state.typingUsers[chatId] || []);
        isTyping ? current.add(userId) : current.delete(userId);
        return { typingUsers: { ...state.typingUsers, [chatId]: [...current] } };
      }),

    setUnread: (chatId, count) =>
      set((state) => ({ unreadCounts: { ...state.unreadCounts, [chatId]: count } })),

    setFilter: (filter) => set({ filter }),
    setSearch: (searchQuery) => set({ searchQuery }),
  }))
);

export const useCallStore = create((set) => ({
  activeCall: null,
  incomingCall: null,
  setActiveCall: (call) => set({ activeCall: call }),
  setIncomingCall: (call) => set({ incomingCall: call }),
  endCall: () => set({ activeCall: null }),
}));

export const useUIStore = create((set) => ({
  theme: 'dark',
  sidebarOpen: true,
  rightPanelOpen: false,
  notificationsOpen: false,
  toggleTheme: () => set((s) => ({ theme: s.theme === 'dark' ? 'light' : 'dark' })),
  setRightPanel: (open) => set({ rightPanelOpen: open }),
  setNotifications: (open) => set({ notificationsOpen: open }),
}));
