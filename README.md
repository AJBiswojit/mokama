# MoKama — Where Work Meets Trust

> A digital employment platform connecting daily wage workers and employers in rural and semi-urban India.

![Version](https://img.shields.io/badge/version-1.0.0-orange)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-green)
![React](https://img.shields.io/badge/react-18.2.0-blue)
![MongoDB](https://img.shields.io/badge/database-MongoDB-green)
![License](https://img.shields.io/badge/license-MIT-yellow)

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Authentication Flow](#authentication-flow)
- [API Reference](#api-reference)
- [Job Lifecycle](#job-lifecycle)
- [Honour Score System](#honour-score-system)
- [Admin Panel](#admin-panel)
- [Security](#security)
- [Deployment](#deployment)
- [Environment Variables Reference](#environment-variables-reference)

---

## Overview

MoKama bridges the gap between daily wage workers (masons, carpenters, plumbers, etc.) and local employers in rural/semi-urban India. Workers register with their mobile number and trade. Employers post jobs. The platform handles the entire lifecycle — from job posting and worker discovery to hiring, work completion, and payment confirmation.

**Core philosophy:** Mobile number as unique identity, email OTP as authentication, trust through the Honour Score system.

---

## Features

### For Workers
- Register with mobile + email + trade details
- Receive job match emails when nearby jobs are posted
- Toggle availability status
- Accept or reject job requests (10-minute window)
- Track active jobs, payment status, and job history
- View honour score history and profile completeness

### For Employers
- Register and post jobs by trade type and location
- Search available workers filtered by trade, pincode, and honour score
- Send job requests to specific workers
- Confirm work started and trigger payment
- Track active and completed jobs

### For Admin
- Approve or reject new user registrations with email notification
- Manage all workers and employers (enable/disable, delete, restore)
- Adjust honour scores with full audit trail
- Hide/unhide jobs without data loss
- Force close any active job
- View complete admin activity log
- Dashboard overview with cached stats

### Platform
- Email OTP authentication (no SMS cost)
- JWT access + refresh token pair (15 min / 30 days)
- In-memory OTP cache with brute-force protection
- Honour Score system with automatic adjustments
- Job matching algorithm — notifies top 5 workers on job creation
- Email notifications for approvals, rejections, and job requests
- Soft delete for users and jobs (data preserved, restorable)
- Profile completeness scoring
- Admin activity log for accountability

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, Vite, Tailwind CSS |
| **Backend** | Node.js, Express.js |
| **Database** | MongoDB with Mongoose ODM |
| **Auth** | JWT (access + refresh), Email OTP |
| **Email** | Nodemailer (Gmail SMTP) |
| **Security** | Helmet, xss-clean, express-mongo-sanitize |
| **Rate Limiting** | express-rate-limit |
| **Scheduling** | node-cron |
| **HTTP Client** | Axios |
| **Icons** | Lucide React |
| **Toasts** | React Hot Toast |

---

## Project Structure

```
mokama/
├── mokama-backend/
│   ├── controllers/
│   │   ├── authController.js       # Registration, login, OTP, refresh token
│   │   ├── jobController.js        # Full job lifecycle + matching algorithm
│   │   └── adminController.js      # Admin CRUD, stats, honour score, logs
│   ├── cron/
│   │   └── jobExpiry.js            # Auto-expire job requests, penalise no-response
│   ├── middlewares/
│   │   ├── auth.js                 # JWT protect + requireRole
│   │   └── checkApproval.js        # Blocks pending/rejected users on protected routes
│   ├── models/
│   │   ├── Admin.js                # Admin account with bcrypt password
│   │   ├── AdminLog.js             # Audit trail for all admin actions
│   │   ├── Category.js             # WorkerType and EmployerCategory
│   │   ├── Employer.js             # Employer profile + auth fields
│   │   ├── HonourLog.js            # Every honour score change recorded
│   │   ├── Job.js                  # Job with full status lifecycle + isHidden
│   │   ├── JobRequest.js           # Employer to Worker request with expiry
│   │   ├── Notification.js         # In-app notifications
│   │   └── Worker.js               # Worker profile + auth fields
│   ├── routes/
│   │   ├── admin.js                # All admin routes
│   │   ├── auth.js                 # Register, login, verify, refresh
│   │   ├── employer.js             # Employer profile + honour log
│   │   ├── job.js                  # Job actions
│   │   ├── notification.js         # Fetch + mark read notifications
│   │   └── worker.js               # Worker profile, availability, honour log
│   ├── services/
│   │   └── notificationService.js  # In-app notification helpers
│   ├── utils/
│   │   ├── adminLog.js             # Fire-and-forget admin action logger
│   │   ├── emailOtp.js             # Nodemailer OTP email + generic sendEmail
│   │   ├── fixIndexes.js           # Auto-clean stale MongoDB indexes on startup
│   │   ├── honour.js               # Honour score update + HonourLog writer
│   │   ├── jwt.js                  # Access + refresh token generation/verification
│   │   └── otpCache.js             # In-memory OTP store with TTL + brute-force lock
│   ├── .env                        # Environment variables (never commit)
│   ├── package.json
│   └── server.js                   # App entry — middleware, routes, DB connection
│
└── mokama-frontend/
    ├── src/
    │   ├── api/
    │   │   └── AuthContext.jsx     # Axios instance, JWT interceptor, auth state
    │   ├── components/
    │   │   ├── DashboardLayout.jsx      # Sidebar + nav + HonourBadge + StatusBadge
    │   │   ├── Pagination.jsx           # Reusable paginator with page pills
    │   │   ├── ProfileCompleteness.jsx  # Circular progress + missing fields
    │   │   └── StatusBanner.jsx         # Pending/rejected account banner
    │   ├── pages/
    │   │   ├── LandingPage.jsx
    │   │   ├── auth/
    │   │   │   ├── AdminLogin.jsx
    │   │   │   ├── EmployerLogin.jsx
    │   │   │   ├── EmployerRegister.jsx
    │   │   │   ├── WorkerLogin.jsx
    │   │   │   └── WorkerRegister.jsx
    │   │   └── dashboard/
    │   │       ├── AdminDashboard.jsx     # Full admin panel with all panels
    │   │       ├── EmployerDashboard.jsx  # Job posting, worker search, job tracking
    │   │       └── WorkerDashboard.jsx    # Job requests, active work, history
    │   └── utils/
    │       ├── honour.js           # Honour label helpers (frontend)
    │       └── profileScore.js     # Profile completeness calculator
    ├── .env                        # Frontend env vars (VITE_ prefix)
    ├── index.html
    └── package.json
```

---

## Getting Started

### Prerequisites

- Node.js v18+
- MongoDB (local) or MongoDB Atlas account
- Gmail account with 2-Step Verification enabled

### Installation

**1. Clone the repository**
```bash
git clone https://github.com/your-username/mokama.git
cd mokama
```

**2. Install backend dependencies**
```bash
cd mokama-backend
npm install
```

**3. Install frontend dependencies**
```bash
cd ../mokama-frontend
npm install
```

### Environment Variables

**Backend — create `mokama-backend/.env`:**
```env
# ── Database ──
MONGO_URI=mongodb://localhost:27017/mokama

# ── JWT ──
JWT_SECRET=your_64_char_secret_here
JWT_REFRESH_SECRET=your_64_char_refresh_secret_here

# ── App ──
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
JOB_REQUEST_EXPIRY_MINUTES=10

# ── Admin ──
ADMIN_EMAIL=admin@mokama.in
ADMIN_PASSWORD=your_strong_admin_password

# ── Email (Gmail) ──
EMAIL_USER=your_gmail@gmail.com
EMAIL_PASS=your_16_char_app_password
EMAIL_FROM=MoKama <your_gmail@gmail.com>
```

> **Generate strong secrets:**
> ```bash
> node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
> ```

> **Gmail App Password:** Google Account → Security → 2-Step Verification → App Passwords → Create

**Frontend — create `mokama-frontend/.env`:**
```env
VITE_API_URL=http://localhost:5000/api
```

### Running the App

**Backend:**
```bash
cd mokama-backend
npm run dev         # development with nodemon
npm start           # production
```

**Frontend:**
```bash
cd mokama-frontend
npm run dev         # development
npm run build       # production build → dist/
```

The backend starts on `http://localhost:5000` and frontend on `http://localhost:5173`.

On first startup, the admin account is auto-created using `ADMIN_EMAIL` and `ADMIN_PASSWORD` from `.env`.

---

## Authentication Flow

MoKama uses **mobile number as identity** and **email OTP as authentication**. No SMS required.

### Registration
```
1. User fills form (mobile + email + details)
2. POST /api/auth/worker/register  → saves to DB, sends OTP to email
3. User enters 6-digit OTP from inbox
4. POST /api/auth/worker/verify-otp  → verifies OTP, returns JWT
5. Account status = "pending" until admin approves
```

### Login
```
1. User enters mobile number
2. POST /api/auth/worker/login  → finds user, sends OTP to registered email
3. User enters 6-digit OTP
4. POST /api/auth/worker/login/verify  → returns access + refresh tokens
```

### Token Refresh
```
Access token expires in 15 minutes.
Axios interceptor auto-calls POST /api/auth/refresh on 401.
New access token returned silently — user stays logged in.
Refresh token valid for 30 days.
```

### OTP Security
- Stored in in-memory cache (not DB) — faster, auto-expires
- 5-minute TTL per OTP
- Max 5 wrong attempts before invalidation
- Rate limited: 5 OTP requests per 15 minutes per mobile

---

## API Reference

All protected routes require `Authorization: Bearer <accessToken>` header.

### Auth Routes

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/auth/worker/register` | — | Register worker, send email OTP |
| `POST` | `/api/auth/worker/verify-otp` | — | Verify OTP, complete registration |
| `POST` | `/api/auth/worker/login` | — | Send login OTP to email |
| `POST` | `/api/auth/worker/login/verify` | — | Verify OTP, return tokens |
| `POST` | `/api/auth/employer/register` | — | Register employer, send email OTP |
| `POST` | `/api/auth/employer/verify-otp` | — | Verify OTP, complete registration |
| `POST` | `/api/auth/employer/login` | — | Send login OTP to email |
| `POST` | `/api/auth/employer/login/verify` | — | Verify OTP, return tokens |
| `POST` | `/api/auth/admin/login` | — | Email + password login |
| `POST` | `/api/auth/refresh` | — | Refresh access token |
| `GET`  | `/api/auth/categories` | — | Get worker types and employer categories |
| `GET`  | `/api/auth/me` | ✅ Any | Get current user profile |

### Worker Routes

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET`  | `/api/worker/profile` | ✅ Worker | Get own profile |
| `PUT`  | `/api/worker/profile` | ✅ Worker | Update name, address, pincode, experience |
| `GET`  | `/api/worker/dashboard` | ✅ Worker | Dashboard stats |
| `PATCH`| `/api/worker/availability` | ✅ Worker | Toggle availability status |
| `GET`  | `/api/worker/honour-log` | ✅ Worker | Own honour score history |

### Employer Routes

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET`  | `/api/employer/profile` | ✅ Employer | Get own profile |
| `PUT`  | `/api/employer/profile` | ✅ Employer | Update name, address, pincode |
| `GET`  | `/api/employer/dashboard` | ✅ Employer | Dashboard stats |
| `GET`  | `/api/employer/honour-log` | ✅ Employer | Own honour score history |

### Job Routes

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/jobs/create` | ✅ Employer + Approved | Post a new job |
| `POST` | `/api/jobs/send-request` | ✅ Employer + Approved | Send request to a worker |
| `GET`  | `/api/jobs/search-workers` | ✅ Employer + Approved | Search available workers |
| `GET`  | `/api/jobs/employer` | ✅ Employer | Get employer's job list |
| `PATCH`| `/api/jobs/:id/start` | ✅ Employer + Approved | Confirm work started |
| `PATCH`| `/api/jobs/:id/confirm-payment` | ✅ Employer | Confirm payment sent |
| `GET`  | `/api/jobs/worker` | ✅ Worker | Get worker's job list |
| `GET`  | `/api/jobs/worker/requests` | ✅ Worker | Get pending job requests |
| `PATCH`| `/api/jobs/request/:id/accept` | ✅ Worker + Approved | Accept a job request |
| `PATCH`| `/api/jobs/request/:id/reject` | ✅ Worker | Reject a job request |
| `PATCH`| `/api/jobs/:id/complete` | ✅ Worker | Mark job as completed |
| `PATCH`| `/api/jobs/:id/confirm-payment-received` | ✅ Worker | Confirm payment received |

### Admin Routes

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET`  | `/api/admin/stats` | Dashboard stats (60s cached) |
| `GET`  | `/api/admin/workers` | Paginated worker list |
| `GET`  | `/api/admin/employers` | Paginated employer list |
| `GET`  | `/api/admin/jobs` | Paginated job list |
| `GET`  | `/api/admin/pending-users` | Users awaiting approval |
| `GET`  | `/api/admin/deleted-users` | Soft-deleted users |
| `GET`  | `/api/admin/activity-log` | Admin action history |
| `GET`  | `/api/admin/honour-log/:type/:id` | User's honour score history |
| `PATCH`| `/api/admin/users/:type/:id/approve` | Approve user + send email |
| `PATCH`| `/api/admin/users/:type/:id/reject` | Reject user + send email |
| `PATCH`| `/api/admin/users/:type/:id/toggle` | Enable/disable account |
| `PATCH`| `/api/admin/users/:type/:id/restore` | Restore deleted user |
| `DELETE`| `/api/admin/users/:type/:id` | Soft delete user |
| `PATCH`| `/api/admin/workers/:id/availability` | Override worker availability |
| `POST` | `/api/admin/penalize` | Reduce honour score |
| `POST` | `/api/admin/increase-honour` | Increase honour score |
| `PATCH`| `/api/admin/jobs/:id/force-close` | Force cancel a job |
| `PATCH`| `/api/admin/jobs/:id/toggle-hidden` | Hide/unhide a job |

---

## Job Lifecycle

```
OPEN
  │
  ├─→ REQUEST_SENT   (employer sends request to a specific worker)
  │         │
  │         ├─→ ACCEPTED    (worker accepts within 10 minutes)
  │         │       │
  │         │       └─→ WORKING   (employer confirms work started)
  │         │                 │
  │         │                 └─→ PAYMENT_PENDING  (worker marks complete)
  │         │                              │
  │         │                              └─→ COMPLETED  (both confirm payment)
  │         │
  │         └─→ REJECTED / EXPIRED  (worker rejects or 10 min passes)
  │
  └─→ CANCELLED  (admin force close)
```

**Automatic cron events (every 2 minutes):**
- Job requests expire after 10 minutes
- Worker penalised −5 honour for no response
- Employer penalised −4 honour for payment pending over 24 hours

---

## Honour Score System

Every worker and employer starts with a score of **50/100**.

| Event | Change | Trigger |
|-------|--------|---------|
| Job completed | +5 | Both parties confirm |
| Quick response | +2 | Worker responds promptly |
| Timely payment | +3 | Payment confirmed quickly |
| Request ignored | −3 | Worker doesn't respond |
| No response | −5 | Request expires via cron |
| Payment delayed | −4 | Payment pending >24h via cron |
| Dispute raised | −3 | Dispute flag set |
| Dispute resolved | +2 | Resolved in user's favour |
| Admin penalise | −5 | Manual admin action |
| Admin increase | +5 | Manual admin action |

**Score Labels:**

| Range | Label |
|-------|-------|
| 85–100 | ⭐ Excellent |
| 70–84  | ✅ Good |
| 50–69  | 🔶 Average |
| 30–49  | ⚠️ Below Average |
| 0–29   | 🔴 Poor |

All changes are permanently logged in `HonourLog` with reason, source, and timestamp. Workers and employers can view their own history from their profile page.

---

## Admin Panel

Access at `/admin/dashboard` after logging in with admin credentials.

| Panel | Description |
|-------|-------------|
| **Overview** | Platform stats with pending approvals alert and deleted users count |
| **Approvals** | Pending registrations — approve or reject with automatic email to user |
| **Workers** | Full paginated list — approve, reject, disable, delete, restore, adjust honour |
| **Employers** | Full paginated list — same controls as workers |
| **Jobs** | All jobs with status filter, hide/unhide toggle, force close |
| **Deleted Users** | Soft-deleted profiles with restore button |
| **Activity Log** | Timestamped record of every admin action with pagination |

---

## Security

| Measure | Implementation |
|---------|---------------|
| HTTP security headers | `helmet` — XSS protection, HSTS, no-sniff, and 8 more |
| NoSQL injection | `express-mongo-sanitize` — strips `$` and `.` from all inputs |
| XSS prevention | `xss-clean` — strips HTML/script tags from all string fields |
| Request size cap | Body limited to `10kb` — prevents payload attacks |
| Rate limiting | Global: 100/15min. OTP routes: 5/15min per mobile |
| JWT pair | Short-lived access (15m) + long-lived refresh (30d) |
| OTP brute-force | Max 5 attempts per OTP before invalidation |
| Deleted user block | `isDeleted` checked on every login attempt |
| Env validation | Server exits immediately if required vars are missing |
| Password hashing | bcrypt on admin passwords |
| Token refresh queue | Concurrent 401s queued — one refresh call, all retried |

---

## Deployment

### Backend — Render

1. Push code to GitHub (make sure `.env` is in `.gitignore`)
2. Create new **Web Service** on [render.com](https://render.com)
3. Connect repo, set root to `mokama-backend`
4. Build command: `npm install`
5. Start command: `npm start`
6. Add all environment variables in the Render dashboard
7. Set `NODE_ENV=production`

### Frontend — Vercel

1. Create project on [vercel.com](https://vercel.com)
2. Connect repo, set root to `mokama-frontend`
3. Framework preset: **Vite**
4. Add environment variable: `VITE_API_URL=https://your-backend.onrender.com/api`
5. Deploy

### Database — MongoDB Atlas

1. Create free cluster at [cloud.mongodb.com](https://cloud.mongodb.com)
2. Create database user
3. Add IP `0.0.0.0/0` in Network Access (allows all IPs)
4. Copy connection string to `MONGO_URI` in backend env

---

## Environment Variables Reference

### Backend (`.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `MONGO_URI` | ✅ | MongoDB connection string |
| `JWT_SECRET` | ✅ | Access token secret — 64+ chars |
| `JWT_REFRESH_SECRET` | ✅ | Refresh token secret — 64+ chars |
| `EMAIL_USER` | ✅ | Gmail address for sending emails |
| `EMAIL_PASS` | ✅ | Gmail App Password — 16 chars, no spaces |
| `PORT` | — | Server port (default: `5000`) |
| `NODE_ENV` | — | `development` or `production` |
| `FRONTEND_URL` | — | Allowed CORS origin (default: `http://localhost:5173`) |
| `EMAIL_FROM` | — | Sender display name and email |
| `ADMIN_EMAIL` | — | Auto-created admin email (default: `admin@mokama.in`) |
| `ADMIN_PASSWORD` | — | Auto-created admin password — **change before launch** |
| `JOB_REQUEST_EXPIRY_MINUTES` | — | Job request window in minutes (default: `10`) |

### Frontend (`.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_API_URL` | ✅ | Full backend API URL including `/api` suffix |

---

## Commit Convention

```
feat:      new feature
fix:       bug fix
security:  security improvement
perf:      performance improvement
refactor:  code restructure without feature change
chore:     config, deps, cleanup
```

---

*Built with ❤️ for Odisha — MoKama, Kaam ko Mukam tak.*
