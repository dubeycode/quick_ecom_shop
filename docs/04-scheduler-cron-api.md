# Scheduler API

**Base URL:** `http://localhost:5000/api/v1`

## Overview

The Scheduler is a background service that automatically advances orders through early lifecycle stages. An external cron job invokes the scheduler endpoint every 5 minutes.

---

## Authentication

```
x-scheduler-secret: <SCHEDULER_SECRET_KEY>
```

Requests without a valid secret receive `401 Unauthorized`.

---

## Transition Rules

| Current Status | Elapsed Time | New Status |
|----------------|--------------|------------|
| `PLACED` | > 5 minutes since created | `PROCESSING` |
| `PROCESSING` | > 5 minutes since last update | `READY_TO_SHIP` |

Thresholds are configurable via environment variables.

### Processing Guarantees

- Only eligible orders are updated in each run
- Each status change is recorded in `status_history`
- Each run is logged in `scheduler_logs`
- Concurrent runs are handled safely (atomic updates + optional lock)
- An order advances at most one status step per run

---

## Run Scheduler

Executes one scheduler cycle — scans eligible orders and applies transitions.

### `POST /scheduler/run`

**Headers**

```
Content-Type: application/json
x-scheduler-secret: <SCHEDULER_SECRET_KEY>
```

**Request Body (optional)**

```json
{
  "dryRun": false
}
```

When `dryRun` is `true`, the scheduler reports what would change without writing updates. Useful for staging and debugging.

**Response `200 OK`**

```json
{
  "success": true,
  "message": "Scheduler executed successfully",
  "data": {
    "runId": "SCH-20250702-120000",
    "startedAt": "2025-07-02T12:00:00.000Z",
    "completedAt": "2025-07-02T12:00:02.000Z",
    "ordersScanned": 50,
    "ordersUpdated": 4,
    "updates": [
      {
        "orderId": "ORD-001",
        "fromStatus": "PLACED",
        "toStatus": "PROCESSING",
        "reason": "Order older than 10 minutes"
      },
      {
        "orderId": "ORD-002",
        "fromStatus": "PROCESSING",
        "toStatus": "READY_TO_SHIP",
        "reason": "Order in PROCESSING for more than 20 minutes"
      }
    ],
    "errors": []
  }
}
```

**Response `401 Unauthorized`**

```json
{
  "success": false,
  "message": "Invalid or missing scheduler secret"
}
```

**cURL**

```bash
curl -X POST http://localhost:5000/api/v1/scheduler/run \
  -H "Content-Type: application/json" \
  -H "x-scheduler-secret: <SCHEDULER_SECRET_KEY>"
```

**cURL — dry run**

```bash
curl -X POST http://localhost:5000/api/v1/scheduler/run \
  -H "Content-Type: application/json" \
  -H "x-scheduler-secret: <SCHEDULER_SECRET_KEY>" \
  -d '{"dryRun": true}'
```

**Postman**

```
POST {{baseUrl}}/scheduler/run
Content-Type: application/json
x-scheduler-secret: {{schedulerSecret}}

Body (optional):
{
  "dryRun": false
}
```

---

## Deployment — Vercel Cron

The scheduler runs automatically via **Vercel Cron** every 5 minutes.

### Setup

1. Deploy the `backend` folder to Vercel
2. Add environment variables in Vercel dashboard:
   - `MONGODB_URI`
   - `SCHEDULER_SECRET_KEY`
   - `CRON_SECRET` (same value as `SCHEDULER_SECRET_KEY` — Vercel sends this as `Authorization: Bearer`)
   - `PLACED_TO_PROCESSING_MINUTES=5`
   - `PROCESSING_TO_READY_MINUTES=5`
   - `SCHEDULER_ENABLED=true`

3. Cron is configured in `backend/vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/scheduler",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

4. Serverless handler: `backend/api/cron/scheduler.js`

Vercel automatically invokes `/api/cron/scheduler` on schedule.

---

## Manual Trigger (local / testing)

### Express endpoint (local dev)

```bash
curl -X POST http://localhost:5000/api/v1/scheduler/run \
  -H "Content-Type: application/json" \
  -H "x-scheduler-secret: <SCHEDULER_SECRET_KEY>"
```

### Vercel cron endpoint (after deploy)

```bash
curl -X GET https://your-backend.vercel.app/api/cron/scheduler \
  -H "Authorization: Bearer <CRON_SECRET>"
```

---

## Local Development

```bash
*/5 * * * * curl -X POST http://localhost:5000/api/v1/scheduler/run -H "x-scheduler-secret: <SCHEDULER_SECRET_KEY>"
```

---

## Concurrency Handling

When two scheduler runs overlap:

1. **Conditional atomic update** — MongoDB `findOneAndUpdate` with status and timestamp guards
2. **Scheduler lock** — a `scheduler_locks` document prevents parallel execution
3. **Unique run IDs** — each execution gets an idempotent `runId` for log deduplication

See [05-database-design.md](./05-database-design.md) for schema details.

---

## Configuration

```env
SCHEDULER_SECRET_KEY=<your_scheduler_secret_key>
CRON_SECRET=<same_as_scheduler_secret>
PLACED_TO_PROCESSING_MINUTES=5
PROCESSING_TO_READY_MINUTES=5
SCHEDULER_ENABLED=true
```
