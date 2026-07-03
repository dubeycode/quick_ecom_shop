# Database Design

**Engine:** MongoDB  
**ODM:** Mongoose

---

## Design Rationale

MongoDB was chosen for this platform because:

- The order document model maps naturally to a flexible schema with embedded and referenced data
- Status history and OTP fields can evolve without rigid migrations
- Compound indexes on `orderStatus` + timestamps support efficient scheduler queries
- Native Node.js integration via Mongoose reduces boilerplate

---

## Collections

### `orders`

Primary collection. One document per order.

```js
{
  _id: ObjectId,
  orderId: "ORD-20250702-A1B2",       // unique
  customerName: "Satyam Dubey",
  phone: "7643869052",
  productName: "Wireless Earbuds",
  amount: 2499,
  paymentStatus: "PAID",               // PENDING | PAID | FAILED
  orderStatus: "PLACED",               // indexed

  providerId: null,
  providerName: null,
  assignedAt: null,

  otpHash: null,                        // bcrypt — never store plain OTP
  otpExpiresAt: null,
  otpAttempts: 0,
  otpSentAt: null,

  createdAt: ISODate,
  updatedAt: ISODate
}
```

**Indexes**

```js
{ orderId: 1 }                          // unique
{ orderStatus: 1, createdAt: -1 }
{ phone: 1, createdAt: -1 }
{ orderStatus: 1, updatedAt: 1 }        // scheduler queries
```

---

### `status_history`

Append-only audit log for every status transition.

```js
{
  _id: ObjectId,
  orderId: "ORD-20250702-A1B2",
  fromStatus: "PLACED",
  toStatus: "PROCESSING",
  changedBy: "SCHEDULER",              // SYSTEM | SCHEDULER | PROVIDER | ADMIN
  changedById: null,
  note: "Auto-updated after 10 minutes",
  createdAt: ISODate
}
```

**Index:** `{ orderId: 1, createdAt: -1 }`

---

### `scheduler_logs`

One document per scheduler execution.

```js
{
  _id: ObjectId,
  runId: "SCH-20250702-120000",         // unique
  startedAt: ISODate,
  completedAt: ISODate,
  status: "SUCCESS",                    // SUCCESS | PARTIAL | FAILED
  ordersScanned: 50,
  ordersUpdated: 4,
  updates: [
    { orderId, fromStatus, toStatus, reason }
  ],
  errors: [
    { orderId, message }
  ],
  triggeredBy: "CRON"                   // CRON | MANUAL
}
```

**Index:** `{ startedAt: -1 }`

---

### `scheduler_locks`

Prevents overlapping scheduler runs in multi-instance deployments.

```js
{
  _id: "order_scheduler",
  lockedAt: ISODate,
  lockedBy: "SCH-20250702-120000",
  expiresAt: ISODate                    // TTL index for auto-release
}
```

---

## Data Integrity

### Duplicate Order Prevention

- Unique index on `orderId`
- Optional client-supplied idempotency key on create requests
- Provider accept uses conditional update (`providerId` must be `null`)

### OTP Security

- OTP stored as bcrypt hash only
- Plain OTP returned exclusively through the customer-facing order detail endpoint
- Provider API never exposes the OTP value
- OTP cleared from the order document after successful verification

### Race Condition Mitigation

| Scenario | Strategy |
|----------|----------|
| Two providers accept same order | Atomic `findOneAndUpdate` with `providerId: null` guard → `409 Conflict` |
| Overlapping scheduler runs | `scheduler_locks` document + conditional status update |
| Duplicate scheduler logs | Unique `runId` per execution |

---

## Scaling Considerations

| Bottleneck | Approach |
|------------|----------|
| Large order volume | Compound indexes, paginated queries, field projection |
| Slow scheduler | Batch processing with configurable per-run limit |
| Multiple API instances | Scheduler lock prevents duplicate transitions |
| Dashboard latency | Server-side pagination, cached stats aggregation |
| High read traffic | MongoDB replica set, read preference on list endpoints |

---

## Environment Variables

```env
# Server
PORT=5000
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/orderflow

# Authentication
SCHEDULER_SECRET_KEY=
ADMIN_SECRET_KEY=
PROVIDER_SECRET_KEY=

# Scheduler
PLACED_TO_PROCESSING_MINUTES=5
PROCESSING_TO_READY_MINUTES=5
SCHEDULER_ENABLED=true

# OTP
OTP_EXPIRY_MINUTES=30
OTP_LENGTH=6
OTP_MAX_ATTEMPTS=3

# Frontend
VITE_API_URL=http://localhost:5000/api/v1
```

---

## Application Routes

| Application | Route | Primary APIs |
|-------------|-------|--------------|
| Customer | `/` | Create order, list orders, track order |
| Admin | `/admin` | List orders, analytics, scheduler logs |
| Provider | `/provider` | Accept order, send OTP, verify OTP |

---

## Postman Environment

```
baseUrl         = http://localhost:5000/api/v1
schedulerSecret = <SCHEDULER_SECRET_KEY>
adminSecret     = <ADMIN_SECRET_KEY>
providerSecret  = <PROVIDER_SECRET_KEY>
```
