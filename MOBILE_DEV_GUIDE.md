# Mobile Developer Guide — Food Delivery Platform

> **API Base URL:** `http://localhost:3000/api/v1` (local) | `https://api.yourdomain.com/api/v1` (production)
> **Interactive docs:** `http://localhost:3000/docs`
> **Socket.io endpoint:** `ws://localhost:3000/tracking`

---

## Table of Contents

1. [Apps & Roles](#1-apps--roles)
2. [Authentication](#2-authentication)
3. [Customer App Flows](#3-customer-app-flows)
4. [Rider App Flows](#4-rider-app-flows)
5. [Real-Time — Socket.io Reference](#5-real-time--socketio-reference)
6. [Payment Integration](#6-payment-integration)
7. [Order & Delivery Lifecycle](#7-order--delivery-lifecycle)
8. [Key Data Models](#8-key-data-models)
9. [Error Handling](#9-error-handling)
10. [Environment Checklist](#10-environment-checklist)

---

## 1. Apps & Roles

There are **two mobile apps** built on this API, each authenticating with a role-scoped JWT.

| App | Role value | Primary responsibilities |
|---|---|---|
| **Customer app** | `CUSTOMER` | Browse restaurants, order food, pay, track delivery, rate |
| **Rider app** | `RIDER` | Go online, accept delivery jobs, update status, confirm COD |

Role is encoded inside the JWT. The backend enforces it on every protected route — a rider calling a customer-only endpoint gets `403`.

---

## 2. Authentication

### 2.1 Login

```
POST /auth/login
Content-Type: application/json

{
  "username": "john_doe",
  "password": "secret123"
}
```

**Response:**

```json
{
  "access_token": "eyJhbGci...",
  "refresh_token": "eyJhbGci...",
  "id": 7,
  "username": "john_doe",
  "role": "CUSTOMER"
}
```

Store both tokens securely. **Never log them.**

| Token | TTL | Use |
|---|---|---|
| `access_token` | 15 minutes | `Authorization: Bearer <token>` on every request |
| `refresh_token` | 7 days | Exchange for a new pair when the access token expires |

### 2.2 Attaching the token

Every protected request must include:

```
Authorization: Bearer eyJhbGci...
```

### 2.3 Refreshing tokens

Call this **before** the access token expires (every ~14 minutes, or on a `401` response):

```
POST /auth/refresh
Authorization: Bearer <refresh_token>   ← use the REFRESH token here, not the access token
```

**Response:**

```json
{
  "access_token": "eyJhbGci...",
  "refresh_token": "eyJhbGci..."
}
```

Replace both stored tokens. If this call itself returns `401`, the session has fully expired — redirect the user to login.

### 2.4 Logout

```
POST /auth/logout
Authorization: Bearer <access_token>
```

Clears the server-side refresh token hash. Always call this when the user explicitly logs out.

---

## 3. Customer App Flows

### 3.1 Browse nearby restaurants

```
GET /restaurant/nearby?lat=5.6037&lng=-0.187&radius=10
```

Returns restaurants sorted by distance. No auth required.

**Response (array):**

```json
[
  {
    "id": 1,
    "name": "Mama Afrika Kitchen",
    "address": "14 Oxford St, Accra",
    "deliveryFee": 5.0,
    "estimatedMinutes": 25,
    "isOpen": true,
    "distanceKm": 1.2,
    "logo": "https://cdn.yourdomain.com/logo.jpg",
    "coverImage": "https://cdn.yourdomain.com/cover.jpg"
  }
]
```

> **Note:** `isOpen: false` restaurants are included in the response so the UI can show them as closed. Filter them out or grey them in your UI.

### 3.2 View a restaurant's menu

```
GET /restaurant/:id/menu
```

Returns categories with nested available menu items. No auth required.

```json
{
  "id": 1,
  "name": "Mama Afrika Kitchen",
  "deliveryFee": 5.0,
  "estimatedMinutes": 25,
  "categories": [
    {
      "id": 2,
      "name": "Grills",
      "menu": [
        {
          "id": 5,
          "name": "Grilled Tilapia",
          "price": 45.0,
          "imageUrl": "https://...",
          "description": "Fresh whole tilapia, grilled over charcoal.",
          "isAvailable": true
        }
      ]
    }
  ]
}
```

### 3.3 Place an order

**Step 1 — Build cart locally.** Track items in memory. Each item needs `foodMenuId`, `quantity`, and `price` (from the menu response).

**Step 2 — Checkout:**

```
POST /payment/checkout
Authorization: Bearer <access_token>

{
  "restaurantId": 1,
  "deliveryAddressId": 3,
  "items": [
    { "foodMenuId": 5, "quantity": 2, "price": 45 },
    { "foodMenuId": 8, "quantity": 1, "price": 12 }
  ],
  "paymentMethod": "PAYSTACK",
  "note": "Extra spicy please"
}
```

**For `PAYSTACK`:** The response contains `authorization_url`. Open it in the Paystack mobile SDK or a WebView. **Do not navigate away without completing payment** — the order is only created after the Paystack webhook fires on the server.

```json
{
  "authorization_url": "https://checkout.paystack.com/abc123",
  "reference": "ref_xyz987",
  "paymentMethod": "PAYSTACK"
}
```

**For `CASH_ON_DELIVERY`:** The order is created immediately.

```json
{
  "orderId": 42,
  "paymentMethod": "CASH_ON_DELIVERY"
}
```

**Step 3 — Open tracking screen.** Connect to Socket.io and join the order room (see [Section 5](#5-real-time--socketio-reference)).

### 3.4 Track a delivery

After placing an order, open a Socket.io connection and subscribe to your order room. See [Section 5.2](#52-customer-events) for the full event reference.

### 3.5 Rate your order

```
POST /rating                     (to be implemented — placeholder)
Authorization: Bearer <access_token>

{
  "orderId": 42,
  "riderScore": 5,
  "foodScore": 4,
  "comment": "Rider was very professional!"
}
```

---

## 4. Rider App Flows

### 4.1 Go online

**Step 1 — Connect to Socket.io and emit `rider:online`:**

```js
socket.emit('rider:online', { riderId: 3 });
```

**Step 2 — Start sending location every 5 seconds** (even before an order is assigned, so the server can match you to nearby orders):

```js
// iOS/Android — use background geolocation library
setInterval(() => {
  socket.emit('rider:location', { orderId: currentOrderId, lat, lng, heading });
  // Also call REST fallback if socket is disconnected:
  // PATCH /delivery/location  { lat, lng }
}, 5000);
```

> **Critical:** Use a background geolocation library (e.g. `react-native-background-geolocation`) so tracking continues when the app is minimised. Foreground-only location breaks the tracking UX for customers.

### 4.2 Receive and accept a job

The server sends a `delivery:job_available` event to your socket room when an order near you is ready:

```json
{
  "orderId": 42,
  "restaurantName": "Mama Afrika Kitchen",
  "restaurantAddress": "14 Oxford St, Accra",
  "dropoffAddress": "25 Ring Road, Accra",
  "deliveryFee": 5.0,
  "riderEarning": 4.0,
  "distanceKm": 1.8
}
```

Show the rider a card with the job details. If they accept:

```
POST /delivery/:orderId/accept
Authorization: Bearer <access_token>
```

**Response** confirms the assignment with pickup/dropoff coordinates. Start navigation immediately.

> The server notifies up to 5 nearest riders. **First to call `/accept` wins.** If you receive a 400 ("Order already assigned"), dismiss the card silently.

### 4.3 Update delivery status

Call this as you move through each stage:

```
PATCH /delivery/:orderId/status
Authorization: Bearer <access_token>

{ "status": "HEADING_TO_RESTAURANT" }
```

**Valid status values and when to send them:**

| Status | When |
|---|---|
| `HEADING_TO_RESTAURANT` | After accepting, when you start moving |
| `ARRIVED_AT_RESTAURANT` | When you reach the restaurant |
| `PICKED_UP` | When the restaurant hands over the food |
| `HEADING_TO_CUSTOMER` | When you leave the restaurant |
| `DELIVERED` | When the customer receives the order |

Each status change broadcasts a `delivery:status` event to the customer.

### 4.4 Confirm cash on COD orders

After marking `DELIVERED` on a COD order, prompt the rider to confirm cash was received:

```
POST /payment/cod/confirm
Authorization: Bearer <access_token>

{ "orderId": 42 }
```

---

## 5. Real-Time — Socket.io Reference

**Namespace:** `/tracking`
**Transport:** WebSocket (with polling fallback)

### 5.1 Connection

```js
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000/tracking', {
  transports: ['websocket'],
  auth: { token: accessToken },   // optional — for future auth on socket
});

socket.on('connect', () => console.log('Socket connected:', socket.id));
socket.on('disconnect', (reason) => console.log('Disconnected:', reason));
```

---

### 5.2 Customer events

#### Emit — join the order tracking room

```js
// Call immediately after order is placed
socket.emit('customer:track', { orderId: 42 });
```

#### Listen — rider's live location

```js
socket.on('delivery:location', (data) => {
  // { lat: 5.6042, lng: -0.1875, heading: 180, timestamp: '2025-01-01T12:00:00Z' }
  // Move the rider marker on your map
  updateRiderMarker(data.lat, data.lng, data.heading);
});
```

#### Listen — delivery status changes

```js
socket.on('delivery:status', (data) => {
  // { status: 'PICKED_UP', timestamp: '...' }
  updateOrderStatusBanner(data.status);
});
```

#### Listen — rider assigned

```js
socket.on('delivery:assigned', (data) => {
  // { riderId: 3, riderName: 'Kofi Mensah', vehicleType: 'MOTORCYCLE' }
  showRiderCard(data);
});
```

#### Listen — COD payment confirmed

```js
socket.on('payment:confirmed', (data) => {
  // { orderId: 42 }
  showPaymentReceiptScreen();
});
```

---

### 5.3 Rider events

#### Emit — go online

```js
socket.emit('rider:online', { riderId: 3 });
```

#### Emit — broadcast location during active delivery

```js
// Call every 5 seconds while on a delivery
socket.emit('rider:location', {
  orderId: 42,
  lat: 5.6042,
  lng: -0.1875,
  heading: 180,    // degrees, optional
});
```

#### Listen — new job available

```js
socket.on('delivery:job_available', (job) => {
  // { orderId, restaurantName, restaurantAddress, dropoffAddress, deliveryFee, riderEarning, distanceKm }
  showJobNotification(job);
});
```

---

### 5.4 Restaurant admin events

#### Emit — join restaurant room (web admin panel)

```js
socket.emit('restaurant:join', { restaurantId: 1 });
```

#### Listen — new order received

```js
socket.on('order:new', (data) => {
  // { orderId: 42, paymentMethod: 'PAYSTACK', totalAmount: 107.0 }
  playNewOrderSound();
  refreshOrderList();
});
```

---

## 6. Payment Integration

### 6.1 Paystack (online payment)

**Recommended mobile library:** `@paystack/react-native-paystack-webview`

**Flow:**

```
Customer taps "Pay" → POST /payment/checkout (paymentMethod: PAYSTACK)
                     → receive { authorization_url, reference }
                     → open Paystack WebView with authorization_url
                     → Paystack processes payment
                     → Paystack webhook hits server → order created
                     → server emits 'order:new' to restaurant socket room
                     → customer receives 'delivery:status' events
```

**React Native example:**

```jsx
import PaystackWebView from '@paystack/react-native-paystack-webview';

<PaystackWebView
  paystackKey="pk_test_xxx"
  authorizationUrl={checkoutResponse.authorization_url}
  onSuccess={(res) => {
    // Payment confirmed — navigate to tracking screen
    // The server already created the order via webhook
    navigation.navigate('Tracking', { orderId: resolveOrderId(res.reference) });
  }}
  onCancel={() => showToast('Payment cancelled')}
/>
```

> **Important:** The `onSuccess` callback fires when Paystack confirms the charge on the client. At this point the webhook may not have fired yet. Add a short polling retry (`GET /orders/:id`) or listen for the `delivery:assigned` socket event before showing the tracking map.

### 6.2 Cash on Delivery

```
Customer taps "Pay on delivery" → POST /payment/checkout (paymentMethod: CASH_ON_DELIVERY)
                                → receive { orderId }
                                → navigate to tracking screen immediately
                                → rider delivers → calls POST /payment/cod/confirm
                                → socket emits 'payment:confirmed' to customer
```

---

## 7. Order & Delivery Lifecycle

```
PENDING ──► ACCEPTED ──► PREPARING ──► READY ──► PICKED_UP ──► DELIVERED
                                          │
                               System finds nearest rider
                               Rider gets 'delivery:job_available'
                               Rider calls POST /delivery/:id/accept
```

**Status descriptions:**

| Food Status | Set by | Meaning |
|---|---|---|
| `PENDING` | System | Order received, waiting for restaurant |
| `ACCEPTED` | Restaurant admin | Restaurant confirmed the order |
| `PREPARING` | Restaurant admin | Kitchen started cooking |
| `READY` | Restaurant admin | Food ready — rider search triggered automatically |
| `PICKED_UP` | Rider (`PATCH /delivery/:id/status`) | Rider has the food |
| `DELIVERED` | Rider | Customer received the order |
| `CANCELLED` | Admin | Order cancelled |

**Delivery Status** (parallel to food status, managed by the rider):

`PENDING_ASSIGNMENT → ASSIGNED → HEADING_TO_RESTAURANT → ARRIVED_AT_RESTAURANT → PICKED_UP → HEADING_TO_CUSTOMER → DELIVERED`

---

## 8. Key Data Models

### Order (checkout response — COD)

```typescript
{
  orderId: number;
  paymentMethod: 'CASH_ON_DELIVERY' | 'PAYSTACK';
}
```

### Delivery (after rider accepts)

```typescript
{
  id: number;
  orderId: number;
  riderId: number;
  status: DeliveryStatus;
  pickupLat: number;
  pickupLng: number;
  dropoffLat: number;
  dropoffLng: number;
  riderEarning: number;
  estimatedETA: string | null;   // ISO 8601
  pickedUpAt: string | null;
  deliveredAt: string | null;
}
```

### Restaurant (nearby list item)

```typescript
{
  id: number;
  name: string;
  description: string | null;
  logo: string | null;
  coverImage: string | null;
  address: string;
  deliveryFee: number;
  estimatedMinutes: number;
  isOpen: boolean;
  distanceKm: number;
}
```

### MenuItem (inside GET /restaurant/:id/menu)

```typescript
{
  id: number;
  name: string;
  price: number;
  imageUrl: string | null;
  description: string;
  isAvailable: boolean;
  categoryId: number;
}
```

---

## 9. Error Handling

All errors follow this shape:

```json
{
  "statusCode": 400,
  "message": "Restaurant is not available",
  "error": "Bad Request"
}
```

| HTTP code | Meaning | What to do |
|---|---|---|
| `400` | Invalid request / business rule violation | Show `message` to the user |
| `401` | Token missing or expired | Call `/auth/refresh`. If that also 401s, redirect to login |
| `403` | Wrong role or insufficient permission | User doesn't have access to this feature |
| `404` | Resource not found | Show a not-found state |
| `500` | Server error | Show generic error, log for debugging |

**Recommended axios interceptor (React Native):**

```js
axiosInstance.interceptors.response.use(
  res => res,
  async err => {
    if (err.response?.status === 401 && !err.config._retry) {
      err.config._retry = true;
      try {
        const { data } = await axios.post('/auth/refresh', {}, {
          headers: { Authorization: `Bearer ${getRefreshToken()}` }
        });
        saveTokens(data.access_token, data.refresh_token);
        err.config.headers.Authorization = `Bearer ${data.access_token}`;
        return axiosInstance(err.config);
      } catch {
        clearTokens();
        navigation.navigate('Login');
      }
    }
    return Promise.reject(err);
  }
);
```

---

## 10. Environment Checklist

Before going live, confirm with the backend team:

- [ ] `PAYSTACK_SECRET_KEY` is set to the **live** key (not test)
- [ ] `PAYSTACK_PUBLIC_KEY` is set to the live public key
- [ ] Paystack webhook URL is registered in the Paystack dashboard pointing to `POST /api/v1/payment/webhook/paystack`
- [ ] `AT_SECRET` and `RT_SECRET` are long random strings (minimum 64 characters)
- [ ] `DATABASE_URL` points to the production database
- [ ] Rider background location permission is granted in both iOS and Android manifests
- [ ] Push notification tokens (FCM) are being stored on rider and customer login
- [ ] CORS is restricted to your mobile app's domain in production
- [ ] HTTPS is enforced — never send tokens over plain HTTP

---

*For questions contact the backend team at devgroup.ai@thedigicoast.com or open an issue in the project repo.*
