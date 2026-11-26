# SkillSpring – Learning Management System (MERN)

SkillSpring is a full-stack learning platform with realtime support tickets, online course delivery, secure payments, and certificate generation. Built with a Next.js frontend and an Express + Socket.io backend on MongoDB.

## Tech Stack

**Client** (`client/`)
- Next.js 16 (App Router) + React 19 + TypeScript
- Tailwind CSS 4 + shadcn/ui
- TanStack Query, Redux Toolkit, React Hook Form + Zod
- Socket.io Client (realtime chat)
- Razorpay Standard Checkout, jspdf + html2canvas (certificates), Recharts (analytics)
- NextAuth.js (OAuth), next-themes

**Server** (`server/`)
- Node.js + Express 5 + TypeScript
- MongoDB + Mongoose
- Socket.io (realtime ticket chat)
- Redis (Upstash) for caching
- Cloudinary (file/media uploads), Multer
- Razorpay (payments), VdoCipher (video streaming), Nodemailer (email)
- JWT auth + role-based authorization, express-rate-limit, node-cron

## Features

- **Roles**: student, instructor, and admin dashboards with distinct UIs.
- **Realtime support tickets**: users create tickets with attachments; admins accept/close them; the ticket page becomes a live chat (user ↔ admin) with optimistic UI, file uploads over Socket.io, and instant status updates (`ticket:accepted`, `ticket:closed`).
- **Ticket management**: user "My Tickets" page (card list, filters, pagination); admin support queue; admin "My Tickets" page listing tickets assigned to the current admin.
- **Courses**: course catalog, browse/filter, course details, video lessons (VdoCipher), course content, Q&A and reviews, enrollment.
- **Payments**: Razorpay checkout in INR, server-side verification, signed webhooks, orders, invoices, purchase history.
- **Certificates**: generated/downloadable PDF certificates per course.
- **Organizations**: admin manages organizations, instructors, students and organization courses/analytics.
- **Notifications**: realtime + persisted notifications for admins/instructors.
- **Analytics**: courses, orders, users, and organization analytics dashboards with charts.
- **Auth**: email/password (JWT + refresh tokens) and Google/GitHub OAuth, email verification, password reset.
- **Admin customization**: hero, FAQ, categories, layout sections.

## Project Structure

```
lms-v2/
├── client/          # Next.js frontend (port 3000)
│   ├── app/         # Pages (user, instructor, admin, support, public)
│   ├── components/  # UI components (shared, admin, instructor, support)
│   ├── hooks/       # TanStack Query hooks
│   ├── lib/         # API clients, utils
│   ├── redux/       # Redux store
│   └── types/       # Shared TypeScript types
├── server/          # Express + Socket.io backend (port 8000)
│   ├── src/
│   │   ├── controllers/
│   │   ├── middlewares/
│   │   ├── models/
│   │   ├── repositories/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── socket/      # Realtime ticket handlers
│   │   └── scripts/     # Seed and maintenance scripts
│   └── package.json
└── README.md
```

## Prerequisites

- Node.js 20+ and npm
- MongoDB (local or Atlas)
- Redis (local or Upstash URL)
- Accounts / keys for: Cloudinary, Razorpay, VdoCipher, Nodemailer/Gmail SMTP, and Google/GitHub OAuth (optional)

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/Nikhil0723/skillspring-lms.git
cd skillspring-lms
```

### 2. Run the backend

```bash
cd server
npm install
cp .env.example .env   # then fill in your values
npm run dev            # starts on http://localhost:8000
```

### 3. Run the frontend

```bash
cd client
npm install
cp .env.example .env.local   # then fill in your values
npm run dev            # starts on http://localhost:3000
```

Open http://localhost:3000 in your browser.

The backend reads `server/.env` by default. Set `DB_URL` to your MongoDB database and `REDIS_URL` to your Redis service, then run `npm run dev` from the `server` directory.

For checkout, add Razorpay **test mode** keys to `server/.env`. Create a Razorpay webhook for both `payment.captured` and `payment.failed`, then set its signing secret as `RAZORPAY_WEBHOOK_SECRET`. The webhook endpoint is `POST /api/v1/payment/webhook`; it must be publicly reachable when testing Razorpay webhooks. Course prices are INR and the API sends paise to Razorpay. Local browsing and the seeded demo accounts work without payment credentials, but checkout requires the keys.

### Environment variables

Server (`.env`):

| Variable | Description |
| --- | --- |
| `PORT` | API port (default `8000`) |
| `ORIGIN` | Allowed CORS origins (e.g. `http://localhost:3000`) |
| `CLIENT_URL` | Frontend URL (`http://localhost:3000`) |
| `DB_URL` | MongoDB connection string |
| `REDIS_URL` | Redis connection string (Upstash or local) |
| `ACCESS_TOKEN_SECRET` / `REFRESH_TOKEN_SECRET` | JWT signing secrets |
| `SOCIAL_AUTH_BRIDGE_SECRET` | Shared random secret for trusted NextAuth-to-API social sign-in; set the same value on client and server |
| `DEMO_MODE` | Enable demo account sign-in in production only with an isolated demo database |
| `ACCESS_TOKEN_EXPIRE` / `REFRESH_TOKEN_EXPIRE` | Token TTLs |
| `JWT_SECRET` | JWT secret for auth flows |
| `CLOUD_NAME` / `CLOUD_API_KEY` / `CLOUD_API_SECRET` | Cloudinary credentials |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` / `RAZORPAY_WEBHOOK_SECRET` | Razorpay test keys and webhook signing secret |
| `VIDEO_CIPHER_API_SECRET` | VdoCipher API secret |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_SERVICE` / `SMTP_MAIL` / `SMTP_PASSWORD` | Email configuration |
| `POSTHOG_PROJECT_TOKEN` / `POSTHOG_HOST` | Server-side PostHog event capture token and regional ingestion host |
| `POSTHOG_API_HOST` / `POSTHOG_PROJECT_ID` / `POSTHOG_PERSONAL_API_KEY` | Read-only PostHog query access for the admin Product Analytics page; keep the personal key server-side |

Client (`.env.local`):

| Variable | Description |
| --- | --- |
| `NEXT_PUBLIC_SERVER_URI` | API base URL (`http://localhost:8000/api/v1`) |
| `SERVER_URI` | Server URI used by the Next.js API routes |
| `NEXT_PUBLIC_SOCKET_SERVER_URI` | Socket.io server URL (`http://localhost:8000`) |
| `ACCESS_TOKEN_EXPIRE` / `REFRESH_TOKEN_EXPIRE` | Refresh/access token TTLs (client refresh logic) |
| `AUTH_SECRET` | NextAuth secret |
| `SOCIAL_AUTH_BRIDGE_SECRET` | Same value as the server; never prefix with `NEXT_PUBLIC_` |
| `NEXT_PUBLIC_ENABLE_DEMO_LOGIN` | Show one-click demo login only for an isolated demo deployment |
| `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN` / `NEXT_PUBLIC_POSTHOG_HOST` | Browser analytics project token and matching regional ingestion host |

One-click demo buttons call `POST /api/v1/auth/demo-login` and do not include account passwords in the client bundle. Enable both demo flags only with a separate database containing disposable demo accounts. Production deployments using real data should leave both flags disabled.
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth credentials (optional) |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | GitHub OAuth credentials (optional) |

> **Never commit real secret values.** Keep your `.env` files out of version control and use the `.env.example` placeholders.

### Product analytics

PostHog is optional: the LMS continues to work when its variables are empty. When enabled, the browser records page views and page leaves, masked link/button clicks, plus explicit course, search, checkout, lecture, and completion events. The server records canonical signup, payment, progress, course-completion, and certificate events. Session replay and form/input autocapture are disabled; click text and element attributes are masked.

The admin page at `/admin/analytics/product` shows daily visitors, pageviews, sessions, PostHog bounce rate, feature usage, top pages, channels, payments, enrollments, and revenue. Daily dates use UTC. Event counts and distinct people are independent activity measures, not a sequential purchase funnel. Revenue and orders come from MongoDB; traffic and behavior come from PostHog. The API is `GET /api/v1/analytics/product?days=30`; it is admin-only and caches successful results for five minutes. Use `7`, `30`, or `90` days. Create a PostHog personal API key with `query:read` access, and never expose it through a `NEXT_PUBLIC_` variable. Use the US hosts shown in `.env.example`, or replace both ingestion and API hosts with the matching EU hosts for an EU project.

## Server scripts

The backend includes database seed and maintenance scripts:

```bash
npm run seed:users          # seed users
npm run seed:catalog        # seed course catalog
npm run seed:enrollments    # seed enrollments
npm run seed:certificates   # seed certificates
npm run seed:applications   # seed instructor applications
npm run seed:approve        # approve instructor applications
npm run db:clear            # clear the database
npm run db:repair           # repair relations
npm run db:status           # backfill course status
npm run db:counts           # backfill course review counts
npm run db:progress         # backfill course progress
npm run db:fix:progress     # fix certificate progress
```

## Production build

```bash
cd server && npm run build && npm run start     # serves the API from dist/
cd client && npm run build && npm run start     # serves the Next.js app
```
