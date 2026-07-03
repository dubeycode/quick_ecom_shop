# Admin API's

**Base URL:** `http://localhost:5000/api/v1`

## Overview

The Admin API powers the operations dashboard. It provides order management, analytics, status history, and scheduler execution logs for the platform team.

---

## Authentication

All admin endpoints require the following header:

```
x-admin-key: <ADMIN_SECRET_KEY>
```

Requests without a valid key receive `401 Unauthorized`.

---

## 1. List Orders

Returns a paginated, filterable list of all orders.

### `GET /admin/orders`

**Headers**

```
x-admin-key: {{adminSecret}}
```

**Query Parameters**


| Parameter       | Required | Default     | Description                         |
| --------------- | -------- | ----------- | ----------------------------------- |
| `status`        | Yes      | —           | Filter by order status              |
| `paymentStatus` | Yes      | —           | Filter by payment status            |
| `search`        | Yes      | —           | Search by order ID or customer name |
| `page`          | Yes      | `1`         | Page number                         |
| `limit`         | Yes      | `20`        | Results per page                    |
| `sortBy`        | Yes      | `createdAt` | Sort field                          |
| `sortOrder`     | Yes      | `desc`      | `asc` or `desc`                     |


**Valid** `status` **values:** `PLACED`, `PROCESSING`, `READY_TO_SHIP`, `OUT_FOR_DELIVERY`, `COMPLETED`, `CANCELLED`

**Valid** `paymentStatus` **values:** `PENDING`, `PAID`, `FAILED`

**Response** `200 OK`

```json
{
  "success": true,
  "data": {
    "orders": [
      {
        "orderId": "ORD-20250702-A1B2",
        "customerName": "Satyam Dubey",
        "phone": "7643869052",
        "productName": "Wireless Earbuds",
        "amount": 2499,
        "paymentStatus": "PAID",
        "orderStatus": "PROCESSING",
        "providerId": null,
        "createdAt": "2025-07-02T10:00:00.000Z",
        "updatedAt": "2025-07-02T10:10:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 45,
      "totalPages": 3
    }
  }
}
```

**cURL — all orders**

```bash
curl -X GET "http://localhost:5000/api/v1/admin/orders" \
  -H "x-admin-key: <ADMIN_SECRET_KEY>"
```

**cURL — filter by status**

```bash
curl -X GET "http://localhost:5000/api/v1/admin/orders?status=PROCESSING&page=1&limit=20" \
  -H "x-admin-key: <ADMIN_SECRET_KEY>"
```

**cURL — search**

```bash
curl -X GET "http://localhost:5000/api/v1/admin/orders?search=Satyam&page=1" \
  -H "x-admin-key: <ADMIN_SECRET_KEY>"
```

**Postman**

```
GET {{baseUrl}}/admin/orders?status=PROCESSING&page=1&limit=20
x-admin-key: {{adminSecret}}
```

---

## 2. Get Order Detail

Returns a single order with full status history and provider assignment.

### `GET /admin/orders/:orderId`

**Response** `200 OK`

```json
{
  "success": true,
  "data": {
    "orderId": "ORD-20250702-A1B2",
    "customerName": "Satyam Dubey",
    "phone": "7643869052",
    "productName": "Wireless Earbuds",
    "amount": 2499,
    "paymentStatus": "PAID",
    "orderStatus": "COMPLETED",
    "providerId": "PROV-001",
    "providerName": "Delivery Partner 1",
    "statusHistory": [
      {
        "fromStatus": "PLACED",
        "toStatus": "PROCESSING",
        "changedAt": "2025-07-02T10:10:00.000Z",
        "changedBy": "SCHEDULER"
      },
      {
        "fromStatus": "OUT_FOR_DELIVERY",
        "toStatus": "COMPLETED",
        "changedAt": "2025-07-02T11:15:00.000Z",
        "changedBy": "PROVIDER",
        "note": "OTP verified"
      }
    ],
    "createdAt": "2025-07-02T10:00:00.000Z",
    "updatedAt": "2025-07-02T11:15:00.000Z"
  }
}
```

**cURL**

```bash
curl -X GET "http://localhost:5000/api/v1/admin/orders/ORD-20250702-A1B2" \
  -H "x-admin-key: <ADMIN_SECRET_KEY>"
```

**Postman**

```
GET {{baseUrl}}/admin/orders/ORD-20250702-A1B2
x-admin-key: {{adminSecret}}
```

---

## 3. Dashboard Analytics

Aggregated order and revenue metrics for the admin dashboard summary cards.

### `GET /admin/stats`

**Response** `200 OK`

```json
{
  "success": true,
  "data": {
    "totalOrders": 120,
    "totalRevenue": 245000,
    "byOrderStatus": {
      "PLACED": 10,
      "PROCESSING": 15,
      "READY_TO_SHIP": 8,
      "OUT_FOR_DELIVERY": 5,
      "COMPLETED": 80,
      "CANCELLED": 2
    },
    "byPaymentStatus": {
      "PENDING": 5,
      "PAID": 110,
      "FAILED": 5
    },
    "todayOrders": 12,
    "lastUpdatedAt": "2025-07-02T12:00:00.000Z"
  }
}
```

**cURL**

```bash
curl -X GET "http://localhost:5000/api/v1/admin/stats" \
  -H "x-admin-key: <ADMIN_SECRET_KEY>"
```

**Postman**

```
GET {{baseUrl}}/admin/stats
x-admin-key: {{adminSecret}}
```

---

## 4. Scheduler Execution Logs

Returns a paginated history of background scheduler runs.

### `GET /admin/scheduler-logs`

**Query Parameters**


| Parameter | Default | Description      |
| --------- | ------- | ---------------- |
| `page`    | `1`     | Page number      |
| `limit`   | `20`    | Results per page |


**Response** `200 OK`

```json
{
  "success": true,
  "data": {
    "logs": [
      {
        "_id": "665abc123",
        "runId": "SCH-20250702-001",
        "startedAt": "2025-07-02T12:00:00.000Z",
        "completedAt": "2025-07-02T12:00:02.000Z",
        "status": "SUCCESS",
        "ordersScanned": 50,
        "ordersUpdated": 3,
        "updates": [
          {
            "orderId": "ORD-001",
            "fromStatus": "PLACED",
            "toStatus": "PROCESSING"
          }
        ],
        "errors": []
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100
    }
  }
}
```

**cURL**

```bash
curl -X GET "http://localhost:5000/api/v1/admin/scheduler-logs?page=1&limit=20" \
  -H "x-admin-key: <ADMIN_SECRET_KEY>"
```

**Postman**

```
GET {{baseUrl}}/admin/scheduler-logs?page=1&limit=20
x-admin-key: {{adminSecret}}
```

---

## 5. Order Status History

Returns the complete status transition log for a specific order.

### `GET /admin/orders/:orderId/history`

**cURL**

```bash
curl -X GET "http://localhost:5000/api/v1/admin/orders/ORD-20250702-A1B2/history" \
  -H "x-admin-key: <ADMIN_SECRET_KEY>"
```

**Postman**

```
GET {{baseUrl}}/admin/orders/ORD-20250702-A1B2/history
x-admin-key: {{adminSecret}}
```

---

## 6. Update Order Status

Allows an admin to manually override an order's status (e.g. cancellation).

### `PATCH /admin/orders/:orderId/status`

**Request Body**

```json
{
  "orderStatus": "CANCELLED",
  "note": "Customer requested cancellation"
}
```

**cURL**

```bash
curl -X PATCH "http://localhost:5000/api/v1/admin/orders/ORD-20250702-A1B2/status" \
  -H "Content-Type: application/json" \
  -H "x-admin-key: <ADMIN_SECRET_KEY>" \
  -d '{"orderStatus": "CANCELLED", "note": "Customer requested cancellation"}'
```

**Postman**

```
PATCH {{baseUrl}}/admin/orders/ORD-20250702-A1B2/status
Content-Type: application/json
x-admin-key: {{adminSecret}}

Body:
{
  "orderStatus": "CANCELLED",
  "note": "Customer requested cancellation"
}
```

---

## Admin Dashboard — Feature Map


| Feature        | API                              | UI Behaviour                                                              |
| -------------- | -------------------------------- | ------------------------------------------------------------------------- |
| Status filter  | `GET /admin/orders?status=`      | Dropdown drives table refresh                                             |
| Orders table   | `GET /admin/orders`              | Columns: ID, customer, phone, product, amount, status, payment, createdAt |
| Search         | `GET /admin/orders?search=`      | Filters by order ID or customer name                                      |
| Pagination     | `GET /admin/orders?page=&limit=` | Page controls at table footer                                             |
| Summary cards  | `GET /admin/stats`               | Total orders, revenue, status breakdown                                   |
| Scheduler logs | `GET /admin/scheduler-logs`      | Dedicated tab with run history                                            |
| Order detail   | `GET /admin/orders/:id`          | Modal with status timeline                                                |
| Refresh        | Re-fetch current query           | Manual reload button                                                      |
| Loading state  | —                                | Spinner while request is in flight                                        |
| Empty state    | —                                | Message when no results match filter                                      |
| Error state    | —                                | Toast or inline error on API failure                                      |


---

## Configuration

```env
ADMIN_SECRET_KEY=<your_admin_secret_key>
```

