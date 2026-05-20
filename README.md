# 🌐 Nexus — Full Stack Messenger

A production-ready, scalable messaging application built with **React**, **Node.js**, **MongoDB**, **Socket.io**, and **Nova AI** (powered by Claude).

---

## ✨ Features

| Feature | Details |
|---|---|
| 💬 Real-time messaging | WebSocket via Socket.io |
| 🤖 Nova AI | Claude-powered assistant built-in |
| 🔔 Push Notifications | Web Push API + Service Worker |
| 📞 Voice & Video Calls | WebRTC signaling via sockets |
| 👥 Groups & Channels | Up to 200 members, broadcast channels |
| 📁 File sharing | Images, video, audio, documents (Cloudinary) |
| 🎙️ Voice messages | Record & send voice notes |
| 😊 Reactions | Emoji reactions on any message |
| ↩️ Replies | Thread-style message replies |
| ✏️ Edit & Delete | Edit history, delete for everyone |
| 📌 Pin messages | Pin important messages |
| 🔍 Search | Full-text message search |
| 📖 Stories | 24-hour disappearing stories |
| 🌙 Dark/Light mode | Auto theme switching |
| 📱 PWA | Installable, works offline |
| 🔒 JWT Auth | Access + refresh token rotation |
| 🚦 Rate limiting | API protection |
| 📊 Typing indicators | Real-time presence |
| ✅ Read receipts | Delivered + read ticks |
| 🌐 Smart replies | AI-generated reply suggestions |
| 🌍 Translation | Translate any message via Nova |
| 📊 Polls | Create polls in group chats |

---

## 🏗️ Architecture

```
nexus/
├── backend/                # Node.js + Express + Socket.io
│   └── src/
│       ├── server.js       # Entry point
│       ├── config/         # DB, Redis
│       ├── controllers/    # Auth, Messages
│       ├── middleware/     # JWT auth
│       ├── models/         # User, Chat, Message, Notification
│       ├── routes/         # REST API routes
│       ├── services/       # Socket, Push Notifications, Email, Nova AI
│       └── utils/          # Logger, Seeder
├── frontend/               # React + Zustand + Socket.io client
│   └── src/
│       ├── App.jsx         # Router
│       ├── context/        # Zustand stores
│       ├── hooks/          # useSocket, usePushNotifications
│       ├── services/       # Axios API client
│       ├── pages/          # ChatApp, Login, Register, Landing...
│       └── components/     # Chat, Sidebar, Shared
├── docker-compose.yml      # Full stack Docker setup
└── nginx.conf              # Reverse proxy
```

---

## 🚀 Quick Start (Local)

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)
- Redis (optional, app works without it)
- Cloudinary account (for media)
- Anthropic API key (for Nova AI)

### 1. Clone & install
```bash
# Backend
cd backend
npm install
cp .env.example .env
# Fill in .env values

# Frontend
cd ../frontend
npm install
```

### 2. Generate VAPID keys (for push notifications)
```bash
npx web-push generate-vapid-keys
# Copy keys to .env
```

### 3. Start
```bash
# Backend (port 5000)
cd backend
npm run dev

# Frontend (port 3000)
cd frontend
npm start
```

Open `http://localhost:3000`

---

## 🐳 Docker (Production)

```bash
# Copy and fill env
cp backend/.env.example backend/.env

# Build & start everything
docker-compose up --build -d

# View logs
docker-compose logs -f backend
```

App runs at `http://localhost` (Nginx on port 80)

---

## 🔑 Environment Variables (backend/.env)

| Variable | Required | Description |
|---|---|---|
| `MONGO_URI` | ✅ | MongoDB connection string |
| `JWT_SECRET` | ✅ | JWT signing secret (change in prod!) |
| `JWT_REFRESH_SECRET` | ✅ | Refresh token secret |
| `ANTHROPIC_API_KEY` | ✅ | For Nova AI |
| `VAPID_PUBLIC_KEY` | ✅ | For push notifications |
| `VAPID_PRIVATE_KEY` | ✅ | For push notifications |
| `REDIS_URL` | ⚡ | Redis URL (optional, caching) |
| `CLOUDINARY_*` | 📁 | For file uploads |
| `SMTP_*` | 📧 | For email OTP |

---

## 📡 API Reference

### Auth
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Register user |
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/refresh` | Refresh tokens |
| POST | `/api/auth/logout` | Logout |
| GET | `/api/auth/me` | Get current user |

### Chats
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/chats` | Get all chats |
| POST | `/api/chats/dm` | Create DM |
| POST | `/api/chats/group` | Create group |
| POST | `/api/chats/channel` | Create channel |
| POST | `/api/chats/join/:link` | Join via invite |

### Messages
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/messages/:chatId` | Get messages |
| POST | `/api/messages` | Send message |
| PUT | `/api/messages/:id` | Edit message |
| DELETE | `/api/messages/:id` | Delete message |
| POST | `/api/messages/:id/react` | React to message |
| POST | `/api/messages/:id/forward` | Forward message |

### Nova AI
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/nova/chat` | Chat with Nova |
| POST | `/api/nova/smart-replies` | Get smart replies |
| POST | `/api/nova/translate` | Translate text |

---

## 🔌 Socket Events

### Client → Server
| Event | Payload |
|---|---|
| `join_chat` | `chatId` |
| `typing_start` | `{ chatId }` |
| `typing_stop` | `{ chatId }` |
| `mark_read` | `{ chatId, messageIds }` |
| `call_offer` | `{ targetUserId, offer, callType }` |
| `call_answer` | `{ targetUserId, answer }` |
| `call_reject` | `{ targetUserId }` |
| `call_end` | `{ targetUserId }` |

### Server → Client
| Event | Description |
|---|---|
| `new_message` | New message received |
| `message_edited` | Message was edited |
| `message_deleted` | Message was deleted |
| `reaction_update` | Emoji reactions updated |
| `user_typing` | Someone is typing |
| `user_stopped_typing` | Stopped typing |
| `user_online` | User came online |
| `user_offline` | User went offline |
| `incoming_call` | Incoming voice/video call |

---

## 🔔 Push Notifications Setup

1. Generate VAPID keys: `npx web-push generate-vapid-keys`
2. Add to `backend/.env`
3. Service Worker (`/public/sw.js`) handles background push
4. User clicks "Enable notifications" → Browser permission → Subscription saved to DB
5. When user is offline, push is sent via Web Push API

---

## 🚀 Deployment (Vercel + Railway + MongoDB Atlas)

**Frontend → Vercel:**
```bash
cd frontend
vercel deploy --prod
```

**Backend → Railway:**
```bash
railway init
railway add mongodb redis
railway deploy
```

**Or deploy everything on a VPS with Docker:**
```bash
docker-compose up -d
```

---

## 🛠️ Tech Stack

**Frontend:** React 18, React Router 6, Zustand, Socket.io client, React Query, Framer Motion, Emoji Picker React, React Hot Toast, Tailwind CSS

**Backend:** Node.js, Express, Socket.io, MongoDB + Mongoose, Redis, JWT, bcryptjs, Web Push, Multer + Cloudinary, Nodemailer, Winston, Helmet, Morgan

**AI:** Anthropic Claude (Nova AI, smart replies, translation)

**Infrastructure:** Docker, Nginx, Redis (caching/sessions)

---

## 📄 License

MIT — use freely, build great things! 🚀
