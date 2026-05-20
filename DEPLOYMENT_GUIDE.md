# 🚀 NEXUS — Complete Mobile Deployment Guide
## Phone se Live Website banao — Step by Step

---

# PHASE 1: ACCOUNTS BANAO (Free)
## Sabse pehle yeh 5 accounts chahiye

### 1. GitHub — Code store karne ke liye
- github.com pe jao → Sign up
- Email verify karo
- Done ✅

### 2. MongoDB Atlas — Free Database
- mongodb.com/atlas → Sign up with Google
- Free tier (M0) — 512MB free forever
- Done ✅

### 3. Render.com — Backend host karne ke liye (Free)
- render.com → Sign up with GitHub
- Done ✅

### 4. Vercel — Frontend host karne ke liye (Free)
- vercel.com → Sign up with GitHub
- Done ✅

### 5. Cloudinary — Media/Photos ke liye (Free)
- cloudinary.com → Sign up
- Free: 25GB storage
- Done ✅

---

# PHASE 2: CODE GITHUB PE DAALO

## Phone se GitHub pe upload karne ke 2 tarike:

### Option A: GitHub Website se (Easiest on Mobile)

1. github.com → Login
2. "+" → "New repository"
3. Name: `nexus-messenger`
4. Public → Create repository
5. "Upload files" pe click karo
6. Apne downloaded ZIP ko unzip karo (file manager app se)
7. Saare files drag/select karo → Commit changes
8. Done ✅

### Option B: Termux App se (Android — Recommended)

```bash
# Termux install karo Play Store se, phir:

pkg update && pkg upgrade
pkg install git nodejs npm

# GitHub se clone ya push
git config --global user.name "Your Name"
git config --global user.email "your@email.com"

git init
git add .
git commit -m "Initial commit — Nexus Messenger"
git branch -M main
git remote add origin https://github.com/YOURUSERNAME/nexus-messenger.git
git push -u origin main
```

---

# PHASE 3: MONGODB ATLAS SETUP

## Database banao:

1. **mongodb.com/atlas** → Login
2. **"Build a Database"** → Choose **M0 Free**
3. Provider: **AWS**, Region: **Mumbai (ap-south-1)**
4. Cluster name: `nexus-cluster` → **Create**

## Admin user banao:
5. Username: `nexusadmin`
6. Password: Strong password likho — **SAVE KARO!**
7. **"Create User"**

## Network Access:
8. Left menu → **Network Access**
9. **"Add IP Address"**
10. **"Allow Access from Anywhere"** (0.0.0.0/0)
11. **Confirm**

## Connection String lo:
12. **"Connect"** → **"Connect your application"**
13. Driver: **Node.js**
14. String copy karo — kuch aisa dikhega:
```
mongodb+srv://nexusadmin:PASSWORD@nexus-cluster.xxxxx.mongodb.net/
```
15. `/nexus` add karo end mein:
```
mongodb+srv://nexusadmin:PASSWORD@nexus-cluster.xxxxx.mongodb.net/nexus
```
16. **SAVE KARO** ✅

---

# PHASE 4: CLOUDINARY SETUP

1. **cloudinary.com** → Login
2. Dashboard pe jao
3. Yeh teen cheezein note karo:
   - **Cloud Name** (e.g., `dxyz123abc`)
   - **API Key** (e.g., `123456789012345`)
   - **API Secret** (e.g., `AbCdEfGhIjKlMnOpQrSt`)
4. **SAVE KARO** ✅

---

# PHASE 5: VAPID KEYS BANAO (Push Notifications ke liye)

## Online VAPID key generator use karo:

1. Browser mein jao: **vapidkeys.com**
2. **"Generate VAPID Keys"** pe click karo
3. Do keys milegi:
   ```
   Public Key:  BNxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   Private Key: xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```
4. **SAVE KARO** ✅

### Ya Termux se:
```bash
npx web-push generate-vapid-keys
```

---

# PHASE 6: ANTHROPIC API KEY (Nova AI ke liye)

1. **console.anthropic.com** → Login/Sign up
2. Left menu → **API Keys**
3. **"Create Key"**
4. Name: `nexus-nova`
5. Key copy karo: `sk-ant-xxxxxxxxxxxxx`
6. **SAVE KARO** ✅

---

# PHASE 7: BACKEND — RENDER.COM PE DEPLOY

## Backend code mein ek change karna hai:
GitHub pe `backend/package.json` open karo, scripts mein check karo:
```json
"start": "node src/server.js"
```
Yeh already hai ✅

## Render pe deploy:

1. **render.com** → Login
2. **"New +"** → **"Web Service"**
3. **"Connect GitHub"** → nexus-messenger repo select karo
4. Settings fill karo:
   ```
   Name:           nexus-backend
   Region:         Singapore (Asia ke liye fast)
   Branch:         main
   Root Directory: backend
   Runtime:        Node
   Build Command:  npm install
   Start Command:  npm start
   Instance Type:  Free
   ```
5. **"Advanced"** → **"Add Environment Variables"**

## Environment Variables daalo (yeh sab ek ek daalo):

```
PORT                    = 5000
NODE_ENV                = production
CLIENT_URL              = https://nexus-frontend.vercel.app   ← baad mein update karenge
MONGO_URI               = mongodb+srv://nexusadmin:PASSWORD@nexus-cluster.xxxxx.mongodb.net/nexus
JWT_SECRET              = MyS3cur3JWTSecr3tKey2026NexusApp!
JWT_EXPIRE              = 30d
JWT_REFRESH_SECRET      = MyR3freshSecr3tKey2026NexusRefresh!
JWT_REFRESH_EXPIRE      = 90d
CLOUDINARY_CLOUD_NAME   = dxyz123abc
CLOUDINARY_API_KEY      = 123456789012345
CLOUDINARY_API_SECRET   = AbCdEfGhIjKlMnOpQrSt
VAPID_EMAIL             = mailto:admin@nexus.app
VAPID_PUBLIC_KEY        = BNxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
VAPID_PRIVATE_KEY       = xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
ANTHROPIC_API_KEY       = sk-ant-xxxxxxxxxxxxx
REDIS_URL               = (khali chhod do — optional hai)
SMTP_HOST               = smtp.gmail.com
SMTP_PORT               = 587
SMTP_USER               = yourgmail@gmail.com
SMTP_PASS               = (Gmail App Password — next step mein)
```

6. **"Create Web Service"** → Deploy shuru hoga
7. 5-10 minute wait karo
8. Top pe URL milega: `https://nexus-backend.onrender.com`
9. **SAVE KARO** ✅

## Gmail App Password kaise banayein:
1. myaccount.google.com → Security
2. 2-Step Verification ON karo
3. "App passwords" → Select app: Mail → Generate
4. 16-char password milega → SMTP_PASS mein daalo

---

# PHASE 8: FRONTEND — VERCEL PE DEPLOY

## pehle frontend code update karo:

GitHub pe `frontend/src/services/api.js` open karo → Edit:
```javascript
// Line 3 pe change karo:
const API_URL = process.env.REACT_APP_API_URL || 'https://nexus-backend.onrender.com/api';
```
Commit karo.

## Vercel pe deploy:

1. **vercel.com** → Login
2. **"Add New Project"**
3. GitHub se `nexus-messenger` import karo
4. Settings:
   ```
   Project Name:     nexus-frontend
   Framework:        Create React App
   Root Directory:   frontend
   Build Command:    npm run build
   Output Directory: build
   ```
5. **"Environment Variables"** section mein:
   ```
   REACT_APP_API_URL     = https://nexus-backend.onrender.com/api
   REACT_APP_SOCKET_URL  = https://nexus-backend.onrender.com
   ```
6. **"Deploy"** → 3-5 minute wait karo
7. URL milega: `https://nexus-frontend.vercel.app`
8. **SAVE KARO** ✅

---

# PHASE 9: BACKEND MEIN FRONTEND URL UPDATE KARO

1. **render.com** → nexus-backend → Environment
2. `CLIENT_URL` update karo:
   ```
   CLIENT_URL = https://nexus-frontend.vercel.app
   ```
3. **Save** → Service restart hogi automatically

---

# PHASE 10: TEST KARO

## Health check:
Browser mein open karo:
```
https://nexus-backend.onrender.com/health
```
Aisa dikhe:
```json
{
  "status": "OK",
  "mongodb": "connected"
}
```

## App open karo:
```
https://nexus-frontend.vercel.app
```

## Test karo:
1. ✅ Register karo
2. ✅ Login karo
3. ✅ Nova AI se baat karo
4. ✅ Dusra account banao, message bhejo
5. ✅ Push notification allow karo
6. ✅ Dono tabs mein open karo → real-time test

---

# PHASE 11: CUSTOM DOMAIN (Optional — Free .is-a.dev domain)

## Free domain lo (is-a.dev):
1. github.com/is-a-dev/register → Fork repo
2. `domains/nexus.json` file banao:
```json
{
  "owner": { "username": "YOURGITHUBUSERNAME" },
  "record": { "CNAME": "nexus-frontend.vercel.app" }
}
```
3. Pull request bhejo → 24h mein approve hoga
4. Domain milega: `nexus.is-a.dev`

## Vercel mein domain add karo:
1. Vercel → Project → Domains
2. `nexus.is-a.dev` add karo
3. Verify karo → Done ✅

---

# TROUBLESHOOTING

## Backend start nahi ho raha?
- Render logs dekho → Environment variables check karo
- MONGO_URI sahi hai? Password mein special char (@, #) hain toh URL encode karo

## Frontend API call fail?
- REACT_APP_API_URL mein `/api` end mein add hai?
- CORS error? CLIENT_URL backend mein sahi set hai?

## Push notifications kaam nahi kar rahi?
- VAPID keys sahi hain? Public aur Private match karte hain?
- HTTPS pe ho? Push sirf HTTPS pe kaam karta hai ✅

## Free tier limitations:
- Render free tier: 15 min inactivity mein sleep ho jaata hai
- Pehli request slow hogi (cold start ~30 sec)
- Fix: UptimeRobot se ping karo har 10 min

---

# PHASE 12: UPTIME ROBOT (Free — Backend Jagaye rakho)

1. **uptimerobot.com** → Sign up (Free)
2. **"Add New Monitor"**
3. Type: **HTTP(s)**
4. URL: `https://nexus-backend.onrender.com/health`
5. Interval: **Every 5 minutes**
6. Create → Backend kabhi sleep nahi karega ✅

---

# SUMMARY — Sab kuch Free!

| Service | Kya karta hai | Cost |
|---|---|---|
| GitHub | Code storage | FREE |
| MongoDB Atlas | Database | FREE (512MB) |
| Render.com | Backend hosting | FREE |
| Vercel | Frontend hosting | FREE |
| Cloudinary | Media/Images | FREE (25GB) |
| UptimeRobot | Keep alive | FREE |
| is-a.dev | Custom domain | FREE |

**Total Monthly Cost: ₹0** 🎉

---

# UPGRADE KARNA HAI? (Paid — Production Ready)

| Service | Plan | Cost |
|---|---|---|
| Render | Starter | $7/mo |
| MongoDB Atlas | M10 | $57/mo |
| Cloudinary | Plus | $89/mo |
| Vercel | Pro | $20/mo |

Ya ek **VPS** lo:
- DigitalOcean Droplet: **$6/mo** (sab kuch ek jagah)
- Hostinger VPS: **₹299/mo**

---

# VPS DEPLOYMENT (Optional — Production Grade)

```bash
# SSH karo (Termux se bhi kar sakte ho!)
ssh root@YOUR_VPS_IP

# Docker install karo
curl -fsSL https://get.docker.com | sh
apt install docker-compose -y

# Code clone karo
git clone https://github.com/YOURUSERNAME/nexus-messenger.git
cd nexus-messenger

# .env banao
cp backend/.env.example backend/.env
nano backend/.env  # Fill all values

# SSL certificate (Free — Let's Encrypt)
apt install certbot -y
certbot certonly --standalone -d yourdomain.com

# Start karo!
docker-compose up -d

# Logs dekho
docker-compose logs -f backend
```

**App: https://yourdomain.com** 🚀
