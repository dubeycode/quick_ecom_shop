# OrderFlow — API Documentation

OrderFlow is a full-stack order management platform with three client applications — **Customer**, **Admin**, and **Provider** — backed by a Node.js/Express API and MongoDB.

## Documentation

| Document | Description |
|----------|-------------|
| [01-user-api.md](./01-user-api.md) | Customer order placement, tracking, and delivery OTP |
| [02-admin-api.md](./02-admin-api.md) | Operations dashboard — orders, analytics, scheduler logs |
| [03-provider-api.md](./03-provider-api.md) | Delivery partner — order pickup, OTP generation, verification |
| [04-scheduler-cron-api.md](./04-scheduler-cron-api.md) | Background job for automated status transitions |
| [05-database-design.md](./05-database-design.md) | MongoDB schema, indexes, and environment configuration |

---

## Setup Guide

Follow these steps to run OrderFlow locally.

### Prerequisites

- **Node.js** 18 or later
- **npm** (comes with Node.js)
- **MongoDB** — local install or a free [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) cluster
- Git (to clone the repo)

### 1. Clone the repository

```bash
git clone https://github.com/dubeycode/quick_ecom_shop.git
cd quick_ecom_shop
```

### 2. Backend setup

```bash
cd backend
npm install
cp .env.example .env
```

Open `backend/.env` and set your values:

```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/<db>
ADMIN_SECRET_KEY=admin_dev@123
SCHEDULER_SECRET_KEY=dev_test@123
CRON_SECRET=dev_test@123
PLACED_TO_PROCESSING_MINUTES=1
PROCESSING_TO_READY_MINUTES=1
SCHEDULER_ENABLED=true
PROVIDER_JWT_SECRET=your_provider_jwt_secret
OTP_EXPIRY_MINUTES=30
OTP_LENGTH=6
OTP_MAX_ATTEMPTS=3
```

| Variable | Purpose |
|----------|---------|
| `MONGODB_URI` | MongoDB connection string (required) |
| `ADMIN_SECRET_KEY` | Admin dashboard / admin API header `x-admin-key` |
| `SCHEDULER_SECRET_KEY` | Scheduler API header `x-scheduler-secret` |
| `CRON_SECRET` | Cloud cron auth (same value as scheduler secret is fine) |
| `PLACED_TO_PROCESSING_MINUTES` | Minutes before `PLACED` → `PROCESSING` |
| `PROCESSING_TO_READY_MINUTES` | Minutes before `PROCESSING` → `READY_TO_SHIP` |
| `SCHEDULER_ENABLED` | `true` to run local cron every 5 minutes |
| `PROVIDER_JWT_SECRET` | Signs provider login tokens |

Start the API:

```bash
npm run dev
```

You should see:

```
Server running on http://localhost:5000
```

Health check:

```bash
curl http://localhost:5000/health
```

Expected response:

```json
{ "success": true, "message": "OrderFlow API is running" }
```

### 3. Frontend setup

Open a **second** terminal:

```bash
cd frontend
npm install
cp .env.example .env
```

`frontend/.env` should point at the backend:

```env
VITE_API_URL=http://localhost:5000/api/v1
```

Start the React app:

```bash
npm run dev
```

Vite prints a local URL (usually `http://localhost:5173`). Open it in the browser.

### 4. App routes (browser)

| App | URL | How to use |
|-----|-----|------------|
| Customer | `http://localhost:5173/` | Place an order |
| My Orders | `http://localhost:5173/orders` | Track orders by phone |
| Admin | `http://localhost:5173/admin` | Enter `ADMIN_SECRET_KEY` when prompted |
| Provider | `http://localhost:5173/provider` | Login with provider phone + password |

### 5. First-time walkthrough

1. **Customer** — place an order on `/` (status starts as `PLACED`).
2. **Wait** for the scheduler (local cron every 5 min), or trigger it manually:
   ```bash
   curl -X POST http://localhost:5000/api/v1/scheduler/run \
     -H "Content-Type: application/json" \
     -H "x-scheduler-secret: dev_test@123" \
     -d "{\"dryRun\":false}"
   ```
   Status moves: `PLACED` → `PROCESSING` → `READY_TO_SHIP` (after the minutes set in `.env`).
3. **Admin** — open `/admin`, enter admin key, create a provider (name, phone, password).
4. **Admin** — assign a `READY_TO_SHIP` order to that provider.
5. **Provider** — open `/provider`, login with the provider phone/password.
6. **Provider** — send OTP on the assigned order (status → `OUT_FOR_DELIVERY`).
7. **Customer** — open order detail; OTP is shown there.
8. **Provider** — enter OTP to mark the order `COMPLETED`.

### 6. Postman (optional)

Base URL for APIs: `http://localhost:5000`

| Header | Value (from `backend/.env`) |
|--------|-----------------------------|
| `x-admin-key` | `ADMIN_SECRET_KEY` |
| `x-scheduler-secret` | `SCHEDULER_SECRET_KEY` |
| `Authorization` | `Bearer <token>` after provider login |

Full endpoint list: [01-user-api.md](./01-user-api.md), [02-admin-api.md](./02-admin-api.md), [03-provider-api.md](./03-provider-api.md), [04-scheduler-cron-api.md](./04-scheduler-cron-api.md).

### 7. Scheduler options

| Mode | How |
|------|-----|
| Local (default) | `SCHEDULER_ENABLED=true` — runs every 5 minutes inside the backend process |
| Manual | `POST /api/v1/scheduler/run` with `x-scheduler-secret` |
| Admin UI | Admin dashboard → trigger scheduler |
| Cloud cron | Call the same scheduler URL every 5 minutes (Render / GitHub Actions / etc.) — see [04-scheduler-cron-api.md](./04-scheduler-cron-api.md) |

For faster local testing, set minutes to `1` in `.env` and restart the backend.

### Troubleshooting

| Problem | Fix |
|---------|-----|
| `Failed to connect to MongoDB` | Check `MONGODB_URI`, network access, and Atlas IP allowlist (`0.0.0.0/0` for dev) |
| Scheduler returns `401` | Header must match `SCHEDULER_SECRET_KEY` exactly; restart backend after changing `.env` |
| Admin returns `401` | Use the same value as `ADMIN_SECRET_KEY` |
| Frontend cannot reach API | Confirm backend is on port `5000` and `VITE_API_URL` is correct; restart Vite after editing `.env` |
| Assign provider fails with `400` | Order must be `READY_TO_SHIP` first (run scheduler or update status in admin) |
| Provider login fails | Create the provider from admin first, then use that phone/password |

---

## Architecture

```
Customer App  ──┐
Admin App     ──┼──►  Express API  ──►  MongoDB
Provider App  ──┘         ▲
                          │
                    Cron Service (every 5 min)
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | Node.js, Express.js |
| Frontend | React.js (Vite) |
| Database | MongoDB |
| Scheduler | Local cron / GitHub Actions / Render Cron |

---

## Order Lifecycle

```
PLACED → PROCESSING → READY_TO_SHIP → OUT_FOR_DELIVERY → COMPLETED
         (scheduler)     (scheduler)      (provider OTP)    (OTP verified)
```

Automated transitions (`PLACED → PROCESSING → READY_TO_SHIP`) are handled by the scheduler. Provider actions drive the final two stages after admin assignment.

---

## Authentication

| Client | Auth |
|--------|------|
| Admin | Header `x-admin-key: <ADMIN_SECRET_KEY>` |
| Provider | Header `Authorization: Bearer <token>` (from `POST /api/v1/provider/login`) |
| Scheduler | Header `x-scheduler-secret: <SCHEDULER_SECRET_KEY>` |
| Customer | Phone-based order lookup (no auth header) |

All secrets are configured via environment variables. See [05-database-design.md](./05-database-design.md).

---

## Postman Environment

```
baseUrl         = http://localhost:5000
schedulerSecret = <SCHEDULER_SECRET_KEY>
adminSecret     = <ADMIN_SECRET_KEY>
providerToken   = <token from provider login>
```

---

## End-to-End Integration Test

```bash
# 1. Customer places an order
curl -X POST http://localhost:5000/api/v1/user/orders \
  -H "Content-Type: application/json" \
  -d '{"customerName":"Satyam Dubey","phone":"7643869052","productName":"T-Shirt","amount":999,"paymentStatus":"PAID"}'

# 2. Scheduler processes eligible orders (after wait minutes in .env)
curl -X POST http://localhost:5000/api/v1/scheduler/run \
  -H "Content-Type: application/json" \
  -H "x-scheduler-secret: <SCHEDULER_SECRET_KEY>" \
  -d '{"dryRun":false}'

# 3. Admin reviews orders
curl -X GET "http://localhost:5000/api/v1/admin/orders?status=READY_TO_SHIP" \
  -H "x-admin-key: <ADMIN_SECRET_KEY>"

# 4. Admin creates a provider
curl -X POST http://localhost:5000/api/v1/admin/providers \
  -H "Content-Type: application/json" \
  -H "x-admin-key: <ADMIN_SECRET_KEY>" \
  -d '{"name":"Partner 1","phone":"9123456780","password":"pass1234"}'

# 5. Admin assigns order to provider
curl -X POST http://localhost:5000/api/v1/admin/orders/ORD-XXX/assign \
  -H "Content-Type: application/json" \
  -H "x-admin-key: <ADMIN_SECRET_KEY>" \
  -d '{"providerId":"PRV-XXX"}'

# 6. Provider login
curl -X POST http://localhost:5000/api/v1/provider/login \
  -H "Content-Type: application/json" \
  -d '{"phone":"9123456780","password":"pass1234"}'
# Save data.token from the response

# 7. Provider generates delivery OTP
curl -X POST http://localhost:5000/api/v1/provider/orders/ORD-XXX/send-otp \
  -H "Authorization: Bearer <token>"

# 8. Customer retrieves OTP from order detail
curl -X GET "http://localhost:5000/api/v1/user/orders/ORD-XXX?phone=7643869052"

# 9. Provider verifies OTP — order marked COMPLETED
curl -X POST http://localhost:5000/api/v1/provider/orders/ORD-XXX/verify-otp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"otp":"482931"}'
```
