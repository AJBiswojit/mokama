# MoKama — Digital Employment Platform

> *Kaam ko Mukam tak* — Connecting India's workforce with dignity and trust.

MoKama is a full-stack MERN application that connects daily wage workers and employers in rural and semi-urban India through a transparent, OTP-verified, trust-scored platform.

---

## 🗂️ Project Structure

```
mokama/
├── mokama-backend/         # Node.js + Express API
│   ├── controllers/        # Route handlers
│   ├── models/             # Mongoose schemas
│   ├── routes/             # Express routers
│   ├── middlewares/        # Auth + rate limit
│   ├── utils/              # JWT, OTP, Honour score
│   ├── services/           # Notification service
│   ├── cron/               # Automated timers
│   └── server.js           # Entry point
│
└── mokama-frontend/        # React + Vite
    └── src/
        ├── api/            # Axios + AuthContext
        ├── components/     # DashboardLayout, shared components
        ├── pages/
        │   ├── auth/       # Login & Register pages
        │   └── dashboard/  # Worker, Employer, Admin dashboards
        └── utils/          # Honour score helpers
```

---

## ⚙️ Prerequisites

- Node.js v18+
- MongoDB (local or Atlas)
- npm or yarn

---

## 🚀 Quick Start

### 1. Backend Setup

```bash
cd mokama-backend
npm install

# Copy env file
cp .env.example .env
# Edit .env with your MongoDB URI and secrets

npm run dev
# API runs on http://localhost:5000
```

### 2. Frontend Setup

```bash
cd mokama-frontend
npm install
npm run dev
# Frontend runs on http://localhost:5173
```

---

## 🔑 Environment Variables (Backend)

| Variable                  | Description                            | Default                    |
|---------------------------|----------------------------------------|----------------------------|
| `PORT`                    | Server port                            | `5000`                     |
| `MONGO_URI`               | MongoDB connection string              | `mongodb://localhost/mokama` |
| `JWT_SECRET`              | Secret for JWT signing                 | *(set a strong key)*        |
| `JWT_EXPIRE`              | Token expiry                           | `7d`                        |
| `OTP_EXPIRY_MINUTES`      | OTP validity window                    | `10`                        |
| `JOB_REQUEST_EXPIRY_MINUTES` | Job request timeout                 | `10`                        |
| `ADMIN_EMAIL`             | Admin login email                      | `admin@mokama.in`           |
| `ADMIN_PASSWORD`          | Admin login password                   | `admin123`                  |
| `NODE_ENV`                | `development` or `production`          | `development`               |
| `FRONTEND_URL`            | Allowed CORS origin                    | `http://localhost:5173`     |

> ⚠️ **OTP Note:** In development mode, the OTP is returned in the API response (`devOtp` field) and logged to console. In production, integrate Twilio / MSG91 in `utils/otp.js`.

---

## 👤 User Roles & Access

| Role     | Auth Method   | Dashboard Route             |
|----------|---------------|-----------------------------|
| Worker   | Mobile OTP    | `/worker/dashboard`         |
| Employer | Mobile OTP    | `/employer/dashboard`       |
| Admin    | Email+Password| `/admin/dashboard`          |

### Default Admin Credentials
```
Email:    admin@mokama.in
Password: admin123
```
*(Auto-created on first server start. Change in .env for production.)*

---

## 🔄 Job Workflow

```
OPEN → REQUEST_SENT → ACCEPTED → WORKING → PAYMENT_PENDING → COMPLETED
```

| Stage             | Action By       | Description                            |
|-------------------|-----------------|----------------------------------------|
| `OPEN`            | Employer        | Job created, visible to workers        |
| `REQUEST_SENT`    | Employer        | Request sent to a specific worker      |
| `ACCEPTED`        | Worker          | Worker accepts within 10 minutes       |
| `WORKING`         | Employer        | Employer confirms work has started     |
| `PAYMENT_PENDING` | Worker          | Worker marks work complete             |
| `COMPLETED`       | Both            | Employer pays → Worker confirms receipt|

---

## ⭐ Honour Score System

Each user starts with a score of **50/100**.

| Event                  | Worker | Employer |
|------------------------|--------|----------|
| Job completed          | +5     | +5       |
| Quick response         | +2     | —        |
| Timely payment         | —      | +3       |
| Request ignored/expired| -3     | —        |
| No response            | -5     | —        |
| Payment delayed >24hrs | —      | -4       |

Score labels: **Excellent** (85+) · **Good** (70+) · **Average** (50+) · **Below Average** (30+) · **Poor** (<30)

---

## 📡 API Reference

### Auth Endpoints
```
POST /api/auth/worker/register       Register worker (returns devOtp in dev)
POST /api/auth/worker/verify-otp     Verify OTP → get JWT
POST /api/auth/worker/login          Request login OTP
POST /api/auth/employer/register     Register employer
POST /api/auth/employer/verify-otp   Verify OTP → get JWT
POST /api/auth/employer/login        Request login OTP
POST /api/auth/admin/login           Email+password login
GET  /api/auth/categories            Get worker types & employer categories
GET  /api/auth/me                    Get current user (requires token)
```

### Job Endpoints
```
POST   /api/jobs/create                          Employer: post job
POST   /api/jobs/send-request                    Employer: send to worker
PATCH  /api/jobs/request/:id/accept              Worker: accept
PATCH  /api/jobs/request/:id/reject              Worker: reject
PATCH  /api/jobs/:id/start                       Employer: confirm work started
PATCH  /api/jobs/:id/complete                    Worker: mark complete
PATCH  /api/jobs/:id/confirm-payment             Employer: confirm payment
PATCH  /api/jobs/:id/confirm-payment-received    Worker: confirm received
GET    /api/jobs/worker                          Worker: get my jobs
GET    /api/jobs/worker/requests                 Worker: pending requests
GET    /api/jobs/employer                        Employer: get my jobs
GET    /api/jobs/search-workers                  Employer: find workers
```

### Admin Endpoints (requires admin token)
```
GET    /api/admin/stats
GET    /api/admin/workers
GET    /api/admin/employers
GET    /api/admin/jobs
PATCH  /api/admin/jobs/:id/force-close
POST   /api/admin/penalize
PATCH  /api/admin/users/:type/:id/toggle
```

---

## 🕐 Automated Timers (Cron Jobs)

| Schedule      | Action                                                   |
|---------------|----------------------------------------------------------|
| Every 2 min   | Expire pending job requests older than 10 minutes        |
| Every hour    | Penalise employers with payment pending > 24 hours       |

---

## 🏗️ Production Deployment

### Backend (Render / Railway / EC2)
1. Set all env variables
2. Set `NODE_ENV=production`
3. Set `MONGO_URI` to MongoDB Atlas URI
4. Integrate real SMS provider in `utils/otp.js`
5. `npm start`

### Frontend (Vercel / Netlify)
1. Set `VITE_API_URL=https://your-api-domain.com/api`
2. `npm run build`
3. Deploy `dist/` folder

---

## 🛡️ Security Notes

- All routes (except auth) require `Bearer <token>` in `Authorization` header
- Rate limiting: 100 req/15min globally, 3 OTP requests/min
- OTPs expire in 10 minutes
- Admin account auto-created on first boot — **change default password in production**
- Passwords (admin) hashed with bcrypt (12 rounds)
- JWT tokens expire in 7 days

---

## 📱 SMS Integration (Production)

Replace the stub in `utils/otp.js`:

```js
// Example: Twilio
const twilio = require('twilio')
const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_TOKEN)

const sendOTP = async (mobile, otp) => {
  await client.messages.create({
    body: `Your MoKama OTP is: ${otp}. Valid for 10 minutes.`,
    from: process.env.TWILIO_FROM,
    to: `+91${mobile}`
  })
  return { success: true, message: `OTP sent to ${mobile}` }
}
```

---

## 📄 License

MIT — Built for Maa Kali Cricket Club (MKCC) / MoKama platform initiative.
