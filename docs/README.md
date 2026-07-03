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
| Frontend | React.js |
| Database | MongoDB |
| Scheduler | GitHub Actions / Render Cron / system cron |

---

## Order Lifecycle

```
PLACED → PROCESSING → READY_TO_SHIP → OUT_FOR_DELIVERY → COMPLETED
         (5 min)         (5 min)          (provider)         (OTP verified)
```

Automated transitions (`PLACED → PROCESSING → READY_TO_SHIP`) are handled by the scheduler. Provider actions drive the final two stages.

---

## Authentication

| Client | Header |
|--------|--------|
| Admin | `x-admin-key` |
| Provider | `x-provider-key` |
| Scheduler | `x-scheduler-secret` |
| Customer | Phone-based order lookup (no auth header) |

All secrets are configured via environment variables. See [05-database-design.md](./05-database-design.md).

---

## Postman Environment

```
baseUrl         = http://localhost:5000/api/v1
schedulerSecret = <SCHEDULER_SECRET_KEY>
adminSecret     = <ADMIN_SECRET_KEY>
providerSecret  = <PROVIDER_SECRET_KEY>
```

---

## End-to-End Integration Test

```bash
# 1. Customer places an order
curl -X POST http://localhost:5000/api/v1/user/orders \
  -H "Content-Type: application/json" \
  -d '{"customerName":"Satyam Dubey","phone":"7643869052","productName":"T-Shirt","amount":999,"paymentStatus":"PAID"}'

# 2. Scheduler processes eligible orders
curl -X POST http://localhost:5000/api/v1/scheduler/run \
  -H "x-scheduler-secret: <SCHEDULER_SECRET_KEY>"

# 3. Admin reviews orders
curl -X GET "http://localhost:5000/api/v1/admin/orders?status=PROCESSING" \
  -H "x-admin-key: <ADMIN_SECRET_KEY>"

# 4. Provider accepts the order
curl -X POST http://localhost:5000/api/v1/provider/orders/ORD-XXX/accept \
  -H "Content-Type: application/json" \
  -H "x-provider-key: <PROVIDER_SECRET_KEY>" \
  -d '{"providerId":"PROV-001","providerName":"Partner 1"}'

# 5. Provider generates delivery OTP
curl -X POST http://localhost:5000/api/v1/provider/orders/ORD-XXX/send-otp \
  -H "Content-Type: application/json" \
  -H "x-provider-key: <PROVIDER_SECRET_KEY>" \
  -d '{"providerId":"PROV-001"}'

# 6. Customer retrieves OTP from order detail
curl -X GET "http://localhost:5000/api/v1/user/orders/ORD-XXX?phone=7643869052"

# 7. Provider verifies OTP — order marked COMPLETED
curl -X POST http://localhost:5000/api/v1/provider/orders/ORD-XXX/verify-otp \
  -H "Content-Type: application/json" \
  -H "x-provider-key: <PROVIDER_SECRET_KEY>" \
  -d '{"providerId":"PROV-001","otp":"482931"}'
```
