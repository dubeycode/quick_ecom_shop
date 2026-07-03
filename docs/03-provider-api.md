# Provider API

**Base URL:** `http://localhost:5000/api/v1`

## Overview

The Provider API serves delivery partners. Providers pick up ready orders, initiate delivery OTP verification, and confirm completion once the customer shares their OTP.

---

## Delivery Flow

```
1. Order reaches READY_TO_SHIP (via scheduler)
2. Provider accepts order          → OUT_FOR_DELIVERY
3. Provider generates OTP        → OTP visible on customer app
4. Customer shares OTP at doorstep
5. Provider submits OTP          → COMPLETED
```

---

## Authentication

All provider endpoints require:

```
x-provider-key: <PROVIDER_SECRET_KEY>
```

Provider identity is passed in the request body:

```json
{
  "providerId": "PROV-001",
  "providerName": "Delivery Partner 1"
}
```

---

## 1. List Available Orders

Returns orders available for pickup, filtered by status.

### `GET /provider/orders`

**Query Parameters**

| Parameter | Default | Description |
|-----------|---------|-------------|
| `status` | `READY_TO_SHIP` | Order status filter |
| `page` | `1` | Page number |
| `limit` | `20` | Results per page |

**Response `200 OK`**

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
        "orderStatus": "READY_TO_SHIP",
        "createdAt": "2025-07-02T10:00:00.000Z"
      }
    ],
    "pagination": { "page": 1, "limit": 20, "total": 5 }
  }
}
```

**cURL**

```bash
curl -X GET "http://localhost:5000/api/v1/provider/orders?status=READY_TO_SHIP" \
  -H "x-provider-key: <PROVIDER_SECRET_KEY>"
```

**Postman**

```
GET {{baseUrl}}/provider/orders?status=READY_TO_SHIP
x-provider-key: {{providerSecret}}
```

---

## 2. Accept Order

Assigns an order to a provider and moves it to `OUT_FOR_DELIVERY`.

### `POST /provider/orders/:orderId/accept`

**Request Body**

```json
{
  "providerId": "PROV-001",
  "providerName": "Delivery Partner 1"
}
```

**Response `200 OK`**

```json
{
  "success": true,
  "message": "Order accepted successfully",
  "data": {
    "orderId": "ORD-20250702-A1B2",
    "orderStatus": "OUT_FOR_DELIVERY",
    "providerId": "PROV-001",
    "providerName": "Delivery Partner 1",
    "updatedAt": "2025-07-02T11:00:00.000Z"
  }
}
```

**Response `409 Conflict`**

```json
{
  "success": false,
  "message": "Order already assigned to another provider"
}
```

**cURL**

```bash
curl -X POST "http://localhost:5000/api/v1/provider/orders/ORD-20250702-A1B2/accept" \
  -H "Content-Type: application/json" \
  -H "x-provider-key: <PROVIDER_SECRET_KEY>" \
  -d '{
    "providerId": "PROV-001",
    "providerName": "Delivery Partner 1"
  }'
```

**Postman**

```
POST {{baseUrl}}/provider/orders/ORD-20250702-A1B2/accept
Content-Type: application/json
x-provider-key: {{providerSecret}}

Body:
{
  "providerId": "PROV-001",
  "providerName": "Delivery Partner 1"
}
```

---

## 3. Generate Delivery OTP

Generates a one-time password for delivery verification. The OTP is surfaced on the customer's order screen — it is **not** returned in this response.

### `POST /provider/orders/:orderId/send-otp`

**Request Body**

```json
{
  "providerId": "PROV-001"
}
```

**Business Rules**

- Order status must be `OUT_FOR_DELIVERY`
- The requesting `providerId` must match the assigned provider on the order
- OTP is a 6-digit numeric code with a configurable expiry (default 30 minutes)
- Generating a new OTP invalidates any previous OTP for the order

**Response `200 OK`**

```json
{
  "success": true,
  "message": "OTP generated. Customer can view it on their order screen.",
  "data": {
    "orderId": "ORD-20250702-A1B2",
    "otpSent": true,
    "otpExpiresAt": "2025-07-02T11:30:00.000Z"
  }
}
```

> **Security:** The OTP value is never included in the provider API response. The customer retrieves it via the Customer API.

**cURL**

```bash
curl -X POST "http://localhost:5000/api/v1/provider/orders/ORD-20250702-A1B2/send-otp" \
  -H "Content-Type: application/json" \
  -H "x-provider-key: <PROVIDER_SECRET_KEY>" \
  -d '{"providerId": "PROV-001"}'
```

**Postman**

```
POST {{baseUrl}}/provider/orders/ORD-20250702-A1B2/send-otp
Content-Type: application/json
x-provider-key: {{providerSecret}}

Body:
{
  "providerId": "PROV-001"
}
```

---

## 4. Verify OTP and Complete Delivery

Validates the OTP provided by the customer and marks the order as `COMPLETED`.

### `POST /provider/orders/:orderId/verify-otp`

**Request Body**

```json
{
  "providerId": "PROV-001",
  "otp": "482931"
}
```

**Business Rules**

- Order status must be `OUT_FOR_DELIVERY`
- OTP is compared against the stored hash
- Expired OTPs are rejected
- Maximum 3 incorrect attempts before OTP lockout
- On success: status set to `COMPLETED`, OTP cleared from the order

**Response `200 OK`**

```json
{
  "success": true,
  "message": "OTP verified. Order marked as COMPLETED.",
  "data": {
    "orderId": "ORD-20250702-A1B2",
    "orderStatus": "COMPLETED",
    "completedAt": "2025-07-02T11:15:00.000Z"
  }
}
```

**Response `400 Bad Request`**

```json
{
  "success": false,
  "message": "Invalid OTP",
  "data": {
    "attemptsRemaining": 2
  }
}
```

**Response `410 Gone`**

```json
{
  "success": false,
  "message": "OTP expired. Please generate a new OTP."
}
```

**cURL**

```bash
curl -X POST "http://localhost:5000/api/v1/provider/orders/ORD-20250702-A1B2/verify-otp" \
  -H "Content-Type: application/json" \
  -H "x-provider-key: <PROVIDER_SECRET_KEY>" \
  -d '{
    "providerId": "PROV-001",
    "otp": "482931"
  }'
```

**Postman**

```
POST {{baseUrl}}/provider/orders/ORD-20250702-A1B2/verify-otp
Content-Type: application/json
x-provider-key: {{providerSecret}}

Body:
{
  "providerId": "PROV-001",
  "otp": "482931"
}
```

---

## 5. List Assigned Orders

Returns orders currently assigned to a specific provider.

### `GET /provider/orders/my`

**Query Parameters**

| Parameter | Required | Description |
|-----------|----------|-------------|
| `providerId` | Yes | Provider identifier |
| `page` | No | Page number (default `1`) |
| `limit` | No | Results per page (default `20`) |

**cURL**

```bash
curl -X GET "http://localhost:5000/api/v1/provider/orders/my?providerId=PROV-001" \
  -H "x-provider-key: <PROVIDER_SECRET_KEY>"
```

**Postman**

```
GET {{baseUrl}}/provider/orders/my?providerId=PROV-001
x-provider-key: {{providerSecret}}
```

---

## Provider App — Screen Mapping

| Screen | API | Action |
|--------|-----|--------|
| Available Orders | `GET /provider/orders?status=READY_TO_SHIP` | Accept button per row |
| Active Deliveries | `GET /provider/orders/my` | Send OTP / Verify OTP actions |
| Send OTP | `POST /provider/orders/:id/send-otp` | Triggers OTP on customer screen |
| Verify OTP | `POST /provider/orders/:id/verify-otp` | Input field for customer-provided code |
| Completed | Filter by `COMPLETED` status | Delivery history |

---

## Configuration

```env
PROVIDER_SECRET_KEY=<your_provider_secret_key>
OTP_EXPIRY_MINUTES=30
OTP_LENGTH=6
OTP_MAX_ATTEMPTS=3
```
