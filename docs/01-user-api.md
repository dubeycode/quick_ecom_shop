# Customer API

**Base URL:** `http://localhost:5000/api/v1`

## Overview

The Customer API handles order placement and order tracking. Customers can view their delivery OTP on the order detail screen when a provider has initiated the verification step.

---

## Order Status Reference

```
PLACED → PROCESSING → READY_TO_SHIP → OUT_FOR_DELIVERY → COMPLETED
         (scheduler)    (scheduler)       (provider)         (OTP verified)
```


| Status             | Description                                |
| ------------------ | ------------------------------------------ |
| `PLACED`           | Order submitted by customer                |
| `PROCESSING`       | Order acknowledged by fulfillment pipeline |
| `READY_TO_SHIP`    | Order packed and ready for pickup          |
| `OUT_FOR_DELIVERY` | Assigned to a delivery provider            |
| `COMPLETED`        | Delivered and OTP verified                 |
| `CANCELLED`        | Order cancelled                            |


---



## 1. Create Order

Places a new order on behalf of a customer.

### `POST /user/orders`

**Headers**

```
Content-Type: application/json
```

**Request Body**

```json
{
  "customerName": "Satyam Dubey",
  "phone": "7643869052",
  "productName": "Wireless Earbuds",
  "amount": 2499,
  "paymentStatus": "PAID"
}
```

**Validation**


| Field           | Rules                               |
| --------------- | ----------------------------------- |
| `customerName`  | Required, minimum 2 characters      |
| `phone`         | Required, exactly 10 digits         |
| `productName`   | Required                            |
| `amount`        | Required, positive number           |
| `paymentStatus` | One of: `COD`, `PAID` |


**Response** `201 Created`

```json
{
  "success": true,
  "message": "Order created successfully",
  "data": {
    "orderId": "ORD-20250702-A1B2",
    "customerName": "Satyam Dubey",
    "phone": "7643869052",
    "productName": "Wireless Earbuds",
    "amount": 2499,
    "paymentStatus": "PAID",
    "orderStatus": "PLACED",
    "createdAt": "2025-07-02T10:00:00.000Z",
    "updatedAt": "2025-07-02T10:00:00.000Z"
  }
}
```

**Response** `400 Bad Request`

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    { "field": "phone", "message": "Phone must be 10 digits" }
  ]
}
```

**cURL**

```bash
curl -X POST http://localhost:5000/api/v1/user/orders \
  -H "Content-Type: application/json" \
  -d '{
    "customerName": "Satyam Dubey",
    "phone": "7643869052",
    "productName": "Wireless Earbuds",
    "amount": 2499,
    "paymentStatus": "PAID"
  }'
```

**Postman**

```
POST {{baseUrl}}/user/orders
Content-Type: application/json

Body:
{
  "customerName": "Satyam Dubey",
  "phone": "7643869052",
  "productName": "Wireless Earbuds",
  "amount": 2499,
  "paymentStatus": "PAID"
}
```

---



## 2. List Orders by Phone

Returns all orders associated with a customer's phone number.

### `GET /user/orders`

**Query Parameters**


| Parameter | Required | Default | Description           |
| --------- | -------- | ------- | --------------------- |
| `phone`   | Yes      | —       | Customer phone number |
| `page`    | No       | `1`     | Page number           |
| `limit`   | No       | `10`    | Results per page      |


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
        "orderStatus": "OUT_FOR_DELIVERY",
        "otp": "482931",
        "otpExpiresAt": "2025-07-02T11:30:00.000Z",
        "createdAt": "2025-07-02T10:00:00.000Z",
        "updatedAt": "2025-07-02T11:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 1,
      "totalPages": 1
    }
  }
}
```

> The `otp` field is returned only when the order status is `OUT_FOR_DELIVERY` and an active OTP exists.

**cURL**

```bash
curl -X GET "http://localhost:5000/api/v1/user/orders?phone=7643869052&page=1&limit=10"
```

**Postman**

```
GET {{baseUrl}}/user/orders?phone=7643869052&page=1&limit=10
```

---



## 3. Get Order Detail

Returns full order detail including status history and delivery OTP when applicable.

### `GET /user/orders/:orderId`

**Path Parameters**


| Parameter | Description                                 |
| --------- | ------------------------------------------- |
| `orderId` | Order identifier (e.g. `ORD-20250702-A1B2`) |


**Query Parameters**


| Parameter | Required | Description                                           |
| --------- | -------- | ----------------------------------------------------- |
| `phone`   | Yes      | Ensures the customer can only access their own orders |


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
    "orderStatus": "OUT_FOR_DELIVERY",
    "otp": "482931",
    "otpExpiresAt": "2025-07-02T11:30:00.000Z",
    "statusHistory": [
      { "status": "PLACED", "changedAt": "2025-07-02T10:00:00.000Z", "changedBy": "SYSTEM" },
      { "status": "PROCESSING", "changedAt": "2025-07-02T10:10:00.000Z", "changedBy": "SCHEDULER" },
      { "status": "READY_TO_SHIP", "changedAt": "2025-07-02T10:30:00.000Z", "changedBy": "SCHEDULER" },
      { "status": "OUT_FOR_DELIVERY", "changedAt": "2025-07-02T11:00:00.000Z", "changedBy": "PROVIDER" }
    ],
    "createdAt": "2025-07-02T10:00:00.000Z",
    "updatedAt": "2025-07-02T11:00:00.000Z"
  }
}
```

**cURL**

```bash
curl -X GET "http://localhost:5000/api/v1/user/orders/ORD-20250702-A1B2?phone=7643869052"
```

**Postman**

```
GET {{baseUrl}}/user/orders/ORD-20250702-A1B2?phone=7643869052
```

---



## Client Application — Screen Mapping


| Screen         | API                         | Notes                                               |
| -------------- | --------------------------- | --------------------------------------------------- |
| Place Order    | `POST /user/orders`         | Booking form submission                             |
| My Orders      | `GET /user/orders?phone=`   | List with status badges                             |
| Order Tracking | `GET /user/orders/:orderId` | Timeline + OTP display                              |
| Delivery OTP   | Same as above               | Shown prominently when status is `OUT_FOR_DELIVERY` |


---



## Related Configuration

```env
OTP_EXPIRY_MINUTES=30
OTP_LENGTH=6
```

