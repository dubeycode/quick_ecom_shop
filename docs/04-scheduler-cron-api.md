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
| `PLACED` | > 10 minutes since last update | `PROCESSING` |
| `PROCESSING` | > 20 minutes since last update | `READY_TO_SHIP` |

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

## Deployment Options

### GitHub Actions

File: `.github/workflows/scheduler.yml`

```yaml
name: Order Status Scheduler

on:
  schedule:
    - cron: '*/5 * * * *'
  workflow_dispatch:

jobs:
  run-scheduler:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Scheduler API
        run: |
          curl -X POST ${{ secrets.API_URL }}/api/v1/scheduler/run \
            -H "x-scheduler-secret: ${{ secrets.SCHEDULER_SECRET }}"
```

Required secrets: `API_URL`, `SCHEDULER_SECRET`

---

### Render Cron Job

```
Schedule: */5 * * * *
Command: curl -X POST https://api.example.com/api/v1/scheduler/run -H "x-scheduler-secret: $SCHEDULER_SECRET"
```

---

### Local / Development

Linux crontab or Windows Task Scheduler:

```bash
*/5 * * * * curl -X POST http://localhost:5000/api/v1/scheduler/run -H "x-scheduler-secret: <SCHEDULER_SECRET_KEY>"
```

For local development, the endpoint can also be triggered manually via cURL or Postman.

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
PLACED_TO_PROCESSING_MINUTES=10
PROCESSING_TO_READY_MINUTES=20
SCHEDULER_ENABLED=true
```
