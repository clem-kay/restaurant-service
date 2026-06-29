# Food Delivery Platform — Backend API

A production-ready multi-restaurant food delivery backend built with NestJS, Prisma (PostgreSQL), Socket.io, and Paystack. Designed to power a platform similar to Bolt Food — multiple restaurants, customer ordering, real-time rider tracking, walk-in orders, in-app notifications, and flexible payment.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Tech Stack](#2-tech-stack)
3. [Getting Started](#3-getting-started)
4. [Environment Variables](#4-environment-variables)
5. [Database](#5-database)
6. [Running the App](#6-running-the-app)
7. [API Reference](#7-api-reference)
8. [Authentication & RBAC](#8-authentication--rbac)
9. [Multi-Restaurant Architecture](#9-multi-restaurant-architecture)
10. [Real-Time Events (Socket.io)](#10-real-time-events-socketio)
11. [Payment Flows](#11-payment-flows)
12. [Order & Delivery Lifecycle](#12-order--delivery-lifecycle)
13. [Walk-in Orders](#13-walk-in-orders)
14. [In-App Notifications](#14-in-app-notifications)
15. [Security](#15-security)
16. [Logging](#16-logging)
17. [Admin Panel](#17-admin-panel)
18. [Mobile Developer Guide](#18-mobile-developer-guide)
19. [Deployment](#19-deployment)

---

## 1. Architecture Overview

```
┌─────────────────────┐     ┌─────────────────────┐     ┌─────────────────────┐
│   Customer App      │     │   Rider App         │     │   Admin Panel       │
│   (Mobile/Web)      │     │   (Mobile)          │     │   (React)           │
└────────┬────────────┘     └──────────┬──────────┘     └──────────┬──────────┘
         │                             │                            │
         └─────────────────────────────┴────────────────────────────┘
                                       │
                         ┌─────────────▼─────────────┐
                         │   NestJS REST API          │
                         │   + Socket.io (/tracking)  │
                         └─────────────┬─────────────┘
                                       │
               ┌───────────────────────┼────────────────────────┐
               │                       │                        │
    ┌──────────▼──────┐   ┌────────────▼───────┐   ┌───────────▼──────┐
    │   PostgreSQL     │   │   Paystack API     │   │   In-memory      │
    │   (via Prisma)   │   │   (Payments)       │   │   Cache          │
    └─────────────────┘   └────────────────────┘   └──────────────────┘
```

**Module breakdown:**

| Module | Responsibility |
|---|---|
| `AuthModule` | JWT login, logout, token refresh |
| `UseraccountModule` | User account CRUD, staff management per restaurant |
| `RestaurantModule` | Multi-restaurant onboarding, listings, menus, approval |
| `OrdersModule` | Order creation, status management, walk-in orders |
| `PaymentModule` | Paystack checkout, COD, webhook verification |
| `DeliveryModule` | Rider assignment, delivery lifecycle, location REST fallback |
| `TrackingModule` | Socket.io gateway for real-time location and status |
| `CategoryModule` | Food category management (restaurant-scoped) |
| `FoodmenuModule` | Menu item management (restaurant-scoped) |
| `DashboardModule` | Aggregated admin analytics (platform + restaurant-scoped) |
| `NotificationModule` | In-app notifications with real-time delivery via Socket.io |
| `CustomerModule` | Customer profiles, addresses, orders, ratings |
| `RiderModule` | Rider profiles and management |
| `LoggerModule` | Winston-based structured logging |

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| Framework | NestJS 10 |
| Language | TypeScript 5 |
| ORM | Prisma 5 |
| Database | PostgreSQL 14+ |
| Auth | Passport + JWT (access + refresh token pattern) |
| Real-time | Socket.io 4 |
| Payments | Paystack |
| Email | Nodemailer + Google OAuth2 |
| Validation | class-validator + class-transformer |
| Docs | Swagger / OpenAPI 3 |
| Logging | Winston (JSON in prod, colorized in dev) |
| Security | Helmet, @nestjs/throttler, CORS allowlist |
| Compression | compression (GZIP) |

---

## 3. Getting Started

### Prerequisites

- Node.js >= 18
- PostgreSQL >= 14
- npm >= 9

### Installation

```bash
git clone <repo-url>
cd restaurant-service
npm install
```

Copy the environment file and fill in your values:

```bash
cp .env.example .env
# then edit .env with your actual values
```

See [Section 4](#4-environment-variables) for a full variable reference.

---

## 4. Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `PORT` | No | HTTP port (default: `3000`) |
| `AT_SECRET` | Yes | JWT access token signing secret (min 32 chars) |
| `RT_SECRET` | Yes | JWT refresh token signing secret (min 32 chars) |
| `PAYSTACK_SECRET_KEY` | Yes | Paystack secret key (`sk_live_...` or `sk_test_...`) |
| `PAYSTACK_PUBLIC_KEY` | Yes | Paystack public key |
| `APPURL` | Yes | Base URL of this server (used in redirect URLs) |
| `ALLOWED_ORIGINS` | No | Comma-separated CORS origins (default: localhost dev ports) |
| `NODE_ENV` | No | `development` or `production` |
| `MAIL_HOST` | No | SMTP host |
| `MAIL_PORT` | No | SMTP port |
| `MAIL_USER` | No | SMTP username |
| `MAIL_PASSWORD` | No | SMTP password |
| `DEFAULT_MAIL_FROM` | No | Default sender address |
| `APP_NAME` | No | Application display name |
| `CLIENT_ID` | No | Google OAuth2 client ID (mailer) |
| `CLIENT_SECRET` | No | Google OAuth2 client secret |
| `REDIRECT_URI` | No | Google OAuth2 redirect URI |
| `REFRESH_TOKEN` | No | Google OAuth2 refresh token |

> **Security:** Never commit `.env` to version control. Generate strong secrets with:
> ```bash
> openssl rand -base64 64
> ```

---

## 5. Database

### Schema overview

```
UserAccount ──── Restaurant ──── FoodCategory ──── FoodMenu
     │                │                                │
     │           (ownerId/                         OrderItem
     │         managedRestaurantId)                    │
     │                └──── Order ────────────────────┘
     │                         │
     │                    Delivery ──── Rider
     │                         │
     │                    Customer ──── CustomerAddress
     │
     └──── Notification
```

**Key design decisions:**

- `Restaurant` is the central multi-tenant entity. Every category, menu item, and order is scoped to a restaurant.
- `UserAccount` holds auth credentials. Admins are linked to a restaurant via `ownerId` (primary owner) or `managedRestaurantId` (co-admin or staff).
- `Order.customerId` and `Order.deliveryAddressId` are nullable to support walk-in orders.
- `Order.walkInName` and `Order.walkInPhone` capture walk-in customer identity.
- `Delivery` is created atomically when a rider accepts — prevents double-assignment.
- `OrderStatusHistory` provides a full audit trail of every status change.
- `Notification` stores in-app notifications per user, delivered in real time via Socket.io.

### Migrations

```bash
# First run on a new database
npx prisma migrate dev --name init

# After pulling schema changes from git
npx prisma migrate dev

# Production — apply pending migrations, no prompts
npx prisma migrate deploy

# Regenerate Prisma client after schema edits
npx prisma generate

# Open the Prisma data browser
npx prisma studio
```

---

## 6. Running the App

```bash
# Development with hot-reload
npm run start:dev

# Production build + start
npm run build
npm run start:prod

# Unit tests
npm run test

# End-to-end tests
npm run test:e2e
```

| URL | Purpose |
|---|---|
| `http://localhost:3000/api/v1` | API base |
| `http://localhost:3000/docs` | Swagger UI (interactive docs) |

---

## 7. API Reference

All endpoints are documented interactively at `/docs`. Below is a summary.

### Auth

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/auth/login` | Public | Login — returns access + refresh tokens |
| `POST` | `/auth/logout` | Bearer (AT) | Invalidate current session |
| `POST` | `/auth/refresh` | Bearer (RT) | Get new access + refresh token pair |

> Rate-limited to **10 requests per minute** per IP.

### Restaurant

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/restaurant/nearby` | Public | Nearby open restaurants (Haversine sort) |
| `GET` | `/restaurant/:id/menu` | Public | Restaurant menu grouped by category |
| `POST` | `/restaurant/register` | Bearer (AT) | Restaurant owner self-registers |
| `PATCH` | `/restaurant/toggle-open` | Bearer (AT) | Open / close for orders |
| `PATCH` | `/restaurant/hours` | Bearer (AT) | Set weekly opening hours |
| `POST` | `/restaurant/admin/create` | PLATFORM_ADMIN | Manually onboard a restaurant (with optional admin account) |
| `PATCH` | `/restaurant/:id/approve` | PLATFORM_ADMIN | Approve or revoke restaurant registration |
| `GET` | `/restaurant/admin/pending` | PLATFORM_ADMIN | Restaurants awaiting approval |
| `GET` | `/restaurant/admin/all` | PLATFORM_ADMIN | All restaurants with filters |

**Query filters on `/restaurant/admin/all`:**

```
?isApproved=true     — only approved restaurants
?isOpen=false        — only closed restaurants
```

**Manually create a restaurant with an admin account:**

```json
POST /restaurant/admin/create
{
  "name": "Burger Palace",
  "description": "...",
  "address": "...",
  "adminUsername": "burger_admin",
  "adminPassword": "SecurePass123"
}
```

If `adminUsername` and `adminPassword` are provided, the API creates a `RESTAURANT_ADMIN` account linked to the new restaurant in one atomic operation.

### User Accounts

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/useraccount` | PLATFORM_ADMIN / RESTAURANT_ADMIN / RESTAURANT_STAFF | List users (scoped to role) |
| `POST` | `/useraccount` | PLATFORM_ADMIN / RESTAURANT_ADMIN | Create user account |
| `GET` | `/useraccount/:id` | Bearer (AT) | Get user by ID |
| `PUT` | `/useraccount/:id` | PLATFORM_ADMIN | Update user |
| `DELETE` | `/useraccount/:id` | PLATFORM_ADMIN | Delete user |
| `PUT` | `/useraccount/activate/:id` | PLATFORM_ADMIN / RESTAURANT_ADMIN | Activate or deactivate account |
| `POST` | `/useraccount/change-password` | Bearer (AT) | Change own password |

**Role-scoped `GET /useraccount` behavior:**

| Caller role | Returns |
|---|---|
| `PLATFORM_ADMIN` | All user accounts |
| `RESTAURANT_ADMIN` | Staff belonging to their restaurant |
| `RESTAURANT_STAFF` | All team members of their restaurant (read-only) |

**Creating staff as RESTAURANT_ADMIN:**

```json
POST /useraccount
{
  "username": "chef_kwame",
  "password": "Pass1234",
  "role": "RESTAURANT_STAFF"   // or "RESTAURANT_ADMIN" for co-admin
}
```

The new account is automatically linked to the calling admin's restaurant.

### Orders

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/orders` | PLATFORM_ADMIN | List all orders (paginated + filtered) |
| `GET` | `/orders/mine` | RESTAURANT_ADMIN / RESTAURANT_STAFF | Restaurant-scoped orders |
| `POST` | `/orders/walkin` | RESTAURANT_ADMIN / RESTAURANT_STAFF | Create walk-in order |
| `PUT` | `/orders/update-status/:id` | Bearer (AT) | Update food status (restaurant-ownership validated) |
| `GET` | `/orders/:id` | Bearer (AT) | Get order with items |
| `DELETE` | `/orders/:id` | Bearer (AT) | Delete order (PENDING only) |

**Query filters on `GET /orders` and `GET /orders/mine`:**

```
?foodStatus=PENDING             — filter by food status
?paymentStatus=PAID             — filter by payment status
?paymentMethod=CASH_ON_DELIVERY — filter by payment method
?restaurantId=1                 — filter by restaurant (PLATFORM_ADMIN only)
?page=1&limit=50                — pagination (max 100/page)
```

**Valid `foodStatus` values:** `PENDING | ACCEPTED | PREPARING | READY | PICKED_UP | DELIVERED | CANCELLED`

**Valid `paymentStatus` values:** `PENDING | PAID | FAILED | REFUNDED | COD_PENDING`

**Order status transitions:**

```
PENDING → ACCEPTED → PREPARING → READY → PICKED_UP → DELIVERED
   └──────────────────────────────────── CANCELLED
```

### Walk-in Orders

See [Section 13](#13-walk-in-orders) for full details.

```json
POST /orders/walkin
{
  "customerName": "John Doe",
  "customerPhone": "+233201234567",
  "note": "No onions please",
  "items": [
    { "foodMenuId": 3, "quantity": 2 },
    { "foodMenuId": 7, "quantity": 1 }
  ]
}
```

Response: created order with `totalAmount` calculated from current menu prices.

### Customer

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/customer/register` | Bearer (AT) | Register customer profile |
| `GET` | `/customer/me` | Bearer (AT) | Get own customer profile |
| `PATCH` | `/customer/me` | Bearer (AT) | Update own profile |
| `GET` | `/customer` | PLATFORM_ADMIN | List all customers |
| `GET` | `/customer/mine` | RESTAURANT_ADMIN / RESTAURANT_STAFF | Customers who have ordered from my restaurant |
| `GET` | `/customer/:id` | PLATFORM_ADMIN | Get customer by ID |
| `POST` | `/customer/addresses` | Bearer (AT) | Add delivery address |
| `GET` | `/customer/addresses` | Bearer (AT) | List delivery addresses |
| `PATCH` | `/customer/addresses/:id` | Bearer (AT) | Update address |
| `DELETE` | `/customer/addresses/:id` | Bearer (AT) | Delete address |
| `PATCH` | `/customer/addresses/:id/default` | Bearer (AT) | Set default address |
| `GET` | `/customer/orders` | Bearer (AT) | Get customer's own orders |
| `POST` | `/customer/ratings` | Bearer (AT) | Submit order rating |
| `GET` | `/customer/ratings` | Bearer (AT) | Get own ratings |

### Notifications

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/notifications` | Bearer (AT) | List all notifications for the current user |
| `GET` | `/notifications/unread-count` | Bearer (AT) | Get unread notification count |
| `PATCH` | `/notifications/:id/read` | Bearer (AT) | Mark a notification as read |
| `PATCH` | `/notifications/read-all` | Bearer (AT) | Mark all notifications as read |

### Dashboard

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/dashboard` | Bearer (AT) | Platform or restaurant stats (role-determined) |

**PLATFORM_ADMIN response:**

```json
{
  "totalRestaurants": 12,
  "pendingApprovals": 2,
  "totalRevenue": 45230.00,
  "totalOrders": 890,
  "totalCustomers": 430,
  "totalRiders": 18
}
```

With `?restaurantId=3`, returns restaurant-scoped stats instead.

**RESTAURANT_ADMIN / RESTAURANT_STAFF response:**

```json
{
  "totalOrders": 128,
  "todaySales": 1204.00,
  "prevMonthRevenue": 18430.00,
  "totalMenuItems": 34,
  "totalCategories": 6,
  "totalStaff": 5
}
```

### Payment

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/payment/checkout` | Bearer (AT) | Initiate Paystack or COD checkout |
| `POST` | `/payment/webhook/paystack` | None | Paystack webhook receiver |
| `POST` | `/payment/cod/confirm` | Bearer (AT) | Rider confirms cash received |

### Delivery

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/delivery/:orderId/accept` | Bearer (AT) | Rider claims a delivery job |
| `PATCH` | `/delivery/:orderId/status` | Bearer (AT) | Update delivery status |
| `PATCH` | `/delivery/location` | Bearer (AT) | REST fallback for rider location |

### Food Menu

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/foodmenu` | Public | List items (filterable) |
| `GET` | `/foodmenu/mine` | RESTAURANT_ADMIN / RESTAURANT_STAFF | Menu items for my restaurant |
| `POST` | `/foodmenu` | Bearer (AT) | Create item |
| `GET` | `/foodmenu/:id` | Public | Get item by ID |
| `PUT` | `/foodmenu/:id` | Bearer (AT) | Update item |
| `DELETE` | `/foodmenu/:id` | Bearer (AT) | Delete item |
| `GET` | `/foodmenu/get-by-category/:id` | Public | Items by category |

**Query filters on `GET /foodmenu`:**

```
?isAvailable=true      — only available items
?restaurantId=1        — items for a specific restaurant
?categoryId=2          — items in a specific category
```

### Categories

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/category` | Public | List categories (filterable) |
| `GET` | `/category/mine` | RESTAURANT_ADMIN / RESTAURANT_STAFF | Categories for my restaurant |
| `POST` | `/category` | Bearer (AT) | Create category |
| `GET` | `/category/:id` | Public | Get category by ID |
| `PATCH` | `/category/:id` | Bearer (AT) | Update category |
| `DELETE` | `/category/:id` | Bearer (AT) | Delete category and all its items |

---

## 8. Authentication & RBAC

### Token lifecycle

The platform uses a **dual-token pattern** with short-lived access tokens and long-lived refresh tokens.

| Token | TTL | Where to use |
|---|---|---|
| Access Token | 15 minutes | `Authorization: Bearer <access_token>` on every request |
| Refresh Token | 7 days | `Authorization: Bearer <refresh_token>` on `POST /auth/refresh` only |

```
1.  POST /auth/login  →  { access_token, refresh_token, id, username, role }
2.  Store both tokens securely (avoid localStorage in web — use httpOnly cookies)
3.  Attach to every request: Authorization: Bearer <access_token>
4.  On 401 response:
      POST /auth/refresh  (Authorization: Bearer <refresh_token>)
      →  { access_token, refresh_token }
      Replace both stored tokens, retry the failed request
5.  On refresh 401: session fully expired — redirect to login
6.  On logout: POST /auth/logout  (clears server-side RT hash)
```

### Role hierarchy

| Role | Can do |
|---|---|
| `PLATFORM_ADMIN` | Manage all restaurants, onboard restaurants, view/manage all users, platform-wide analytics |
| `RESTAURANT_ADMIN` | Manage own restaurant, menu, categories, orders, staff (can also be co-admin of a restaurant without owning it) |
| `RESTAURANT_STAFF` | View orders, manage order status, create walk-in orders, view own team and customers |
| `CUSTOMER` | Browse restaurants, place orders, track delivery, rate |
| `RIDER` | Go online, accept jobs, update status, confirm COD |

### Guards

| Guard | Purpose |
|---|---|
| `AtGuard` | Validates JWT access token |
| `RolesGuard` | Checks role against `@Roles()` decorator |
| `RestaurantContextGuard` | Resolves `request.user.restaurantId` for restaurant-scoped endpoints |
| `DoesUserExist` | Prevents duplicate username on account creation |

**RestaurantContextGuard resolution logic:**

1. `RESTAURANT_ADMIN` — looks up `Restaurant.ownerId` first, then falls back to `UserAccount.managedRestaurantId` (co-admin)
2. `RESTAURANT_STAFF` — reads `UserAccount.managedRestaurantId`
3. `PLATFORM_ADMIN` — reads optional `?restaurantId` query param (for drill-down views)

---

## 9. Multi-Restaurant Architecture

The platform is built as a true multi-tenant system. All data is scoped to a restaurant.

### Onboarding flow

```
Option A — Self-registration:
  Restaurant owner → POST /restaurant/register
  PLATFORM_ADMIN reviews → PATCH /restaurant/:id/approve { approve: true }

Option B — Manual creation:
  PLATFORM_ADMIN → POST /restaurant/admin/create
  (optional: include adminUsername + adminPassword to create the admin account in one step)
```

### Staff management

```
RESTAURANT_ADMIN → POST /useraccount { role: "RESTAURANT_STAFF", ... }
  → New account is auto-linked to the admin's restaurant via managedRestaurantId

RESTAURANT_ADMIN → POST /useraccount { role: "RESTAURANT_ADMIN", ... }
  → Creates a co-admin (has RESTAURANT_ADMIN role but linked via managedRestaurantId, not ownerId)
```

### Platform Admin drill-down

PLATFORM_ADMIN can scope any view to a specific restaurant by passing `?restaurantId=X`:

- `GET /dashboard?restaurantId=3` — restaurant-scoped analytics
- `GET /orders?restaurantId=3` — orders for that restaurant
- `GET /foodmenu?restaurantId=3` — menu for that restaurant

---

## 10. Real-Time Events (Socket.io)

**Namespace:** `/tracking`
**Transport:** WebSocket (polling fallback)

```js
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000/tracking', {
  transports: ['websocket'],
});
```

### Events emitted by the client

| Event | Payload | Who sends | When |
|---|---|---|---|
| `customer:track` | `{ orderId: number }` | Customer | After placing order — joins order room |
| `rider:online` | `{ riderId: number }` | Rider | When going available for deliveries |
| `rider:location` | `{ orderId, lat, lng, heading }` | Rider | Every 5s during active delivery |
| `restaurant:join` | `{ restaurantId: number }` | Restaurant admin | On admin panel load |
| `user:join` | `{ userId: number }` | Any user | On app start — joins personal notification room |

### Events emitted by the server

| Event | Payload | Who receives | Trigger |
|---|---|---|---|
| `delivery:location` | `{ lat, lng, heading, timestamp }` | Customer | Rider emits `rider:location` |
| `delivery:status` | `{ status, timestamp }` | Customer | Rider calls `PATCH /delivery/:id/status` |
| `delivery:assigned` | `{ riderId, riderName, vehicleType }` | Customer | Rider accepts delivery |
| `delivery:job_available` | `{ orderId, restaurantName, dropoffAddress, riderEarning, distanceKm }` | Rider | Restaurant marks food READY |
| `order:new` | `{ orderId, paymentMethod, totalAmount }` | Restaurant admin | Paystack webhook or COD checkout |
| `payment:confirmed` | `{ orderId }` | Customer | Rider calls `POST /payment/cod/confirm` |
| `notification:new` | `{ id, type, title, body, data, createdAt }` | Any user | Server creates notification for that user |

---

## 11. Payment Flows

### Paystack (online payment)

```
Customer:  POST /payment/checkout  { paymentMethod: "PAYSTACK", ... }
           ←  { authorization_url, reference }
           Opens Paystack checkout (WebView or SDK)
           Completes payment

Paystack:  POST /api/v1/payment/webhook/paystack  (automatic)
Server:    Verifies HMAC-SHA512 signature
           Creates order in database
           Emits 'order:new' to restaurant socket room
           Initiates rider search when food is READY
```

> Register the webhook URL in the Paystack dashboard → **Settings → Webhooks**:
> `https://yourdomain.com/api/v1/payment/webhook/paystack`

### Cash on Delivery (COD)

```
Customer:  POST /payment/checkout  { paymentMethod: "CASH_ON_DELIVERY", ... }
           ←  { orderId }  (order created immediately, paymentStatus = COD_PENDING)

Rider:     Delivers food, collects cash
           POST /payment/cod/confirm  { orderId }

Server:    Sets paymentStatus = PAID
           Emits 'payment:confirmed' to customer
```

---

## 12. Order & Delivery Lifecycle

### Food status (set by restaurant staff)

| Status | Set by | Meaning |
|---|---|---|
| `PENDING` | System | Order received, awaiting restaurant confirmation |
| `ACCEPTED` | Restaurant staff | Restaurant confirmed the order |
| `PREPARING` | Restaurant staff | Kitchen started cooking |
| `READY` | Restaurant staff | Food ready — rider search triggered |
| `PICKED_UP` | Rider (via delivery status) | Rider has the food |
| `DELIVERED` | Rider (via delivery status) | Customer received the order |
| `CANCELLED` | Admin | Order cancelled |

### Valid status transitions

```
PENDING   → ACCEPTED, CANCELLED
ACCEPTED  → PREPARING, CANCELLED
PREPARING → READY, CANCELLED
READY     → PICKED_UP
PICKED_UP → DELIVERED
```

### Delivery status (set by rider)

```
PENDING_ASSIGNMENT
  → ASSIGNED               (rider accepted)
  → HEADING_TO_RESTAURANT  (rider moving to pick up)
  → ARRIVED_AT_RESTAURANT  (rider at restaurant)
  → PICKED_UP              (food collected — syncs foodStatus)
  → HEADING_TO_CUSTOMER    (rider en route to customer)
  → DELIVERED              (order complete — earnings credited)
```

### Rider assignment

When food is marked `READY`:

1. Server queries riders within **5 km** using Haversine (PostgreSQL raw SQL)
2. Top 5 nearest available riders receive `delivery:job_available` socket event
3. First rider to call `POST /delivery/:orderId/accept` wins (atomic transaction)
4. If no rider accepts within **2 minutes**, radius expands to **10 km**

---

## 13. Walk-in Orders

Walk-in orders allow restaurant staff to serve customers at the counter without a customer app account or delivery address.

**Key differences from regular orders:**

| Field | Regular order | Walk-in order |
|---|---|---|
| `customerId` | Required (linked Customer record) | `null` |
| `deliveryAddressId` | Required | `null` |
| `walkInName` | `null` | Customer's name (required) |
| `walkInPhone` | `null` | Customer's phone (optional) |
| `paymentMethod` | Any | Always `CASH_ON_DELIVERY` |
| Initial `foodStatus` | `PENDING` | `ACCEPTED` (restaurant already accepted) |

**Creating a walk-in order:**

```json
POST /orders/walkin
Authorization: Bearer <staff_token>

{
  "customerName": "Kofi Mensah",
  "customerPhone": "+233244123456",
  "note": "Extra spicy",
  "items": [
    { "foodMenuId": 5, "quantity": 2 },
    { "foodMenuId": 12, "quantity": 1 }
  ]
}
```

The server:
1. Validates that all `foodMenuId` values belong to the staff's restaurant
2. Fetches current prices from the menu (no price injection)
3. Calculates `totalAmount` server-side
4. Creates the order with `foodStatus = ACCEPTED`, `paymentStatus = COD_PENDING`

---

## 14. In-App Notifications

Notifications are stored in the `Notification` table and delivered in real time via Socket.io.

**Creating a notification (server-side only):**

```typescript
// Injected in any service
constructor(private readonly notificationService: NotificationService) {}

await this.notificationService.create(userId, 'NEW_ORDER', 'New Order', 'Order #42 received', { orderId: 42 });
```

**Notification types used internally:**

| Type | Trigger |
|---|---|
| `NEW_ORDER` | New order arrives at a restaurant |
| `ORDER_STATUS` | Order status changes |
| `PAYMENT` | Payment confirmed or failed |

**Real-time delivery:** The `TrackingGateway` emits `notification:new` to the user's personal room (`user-{userId}`). Clients join this room by emitting `user:join { userId }` on connect.

**REST endpoints for the admin panel (see [Section 7](#7-api-reference)):**

```
GET  /notifications           — list all, ordered by date desc
GET  /notifications/unread-count
PATCH /notifications/:id/read
PATCH /notifications/read-all
```

---

## 15. Security

| Measure | Details |
|---|---|
| Security headers | `helmet` — sets XSS-Protection, HSTS, Content-Security-Policy, X-Frame-Options |
| Rate limiting | Global: 100 req/min; Auth endpoints: 10 req/min (via `@nestjs/throttler`) |
| CORS | Restricted to `ALLOWED_ORIGINS` env var; mobile apps (no origin) are allowed |
| JWT | Secrets from env, never hardcoded; access token 15 min, refresh 7 days |
| Input validation | `class-validator` — `whitelist: true, forbidNonWhitelisted: true` strips extra fields |
| Webhook auth | Paystack HMAC-SHA512 verification on raw request body |
| Password hashing | bcrypt |
| Refresh token storage | bcrypt hash in DB — raw token never persisted |
| Restaurant ownership | `RestaurantContextGuard` enforces restaurant scoping — staff cannot access other restaurants' data |
| Walk-in price integrity | Server fetches prices from DB; client-submitted prices are ignored |
| Response compression | GZIP via `compression` middleware |

**Production security checklist:**

- [ ] Set `AT_SECRET` / `RT_SECRET` to 64-byte random strings
- [ ] Set `NODE_ENV=production`
- [ ] Set `ALLOWED_ORIGINS` to your actual domain(s)
- [ ] Use live Paystack keys
- [ ] Enforce HTTPS — never send tokens over plain HTTP
- [ ] Enable PostgreSQL SSL (`?sslmode=require` in `DATABASE_URL`)
- [ ] Restrict DB port to app server only (firewall rule)
- [ ] Set up log rotation for `logs/`

---

## 16. Logging

All logs use **Winston** via the global `AppLogger` service.

| Environment | Format | Output |
|---|---|---|
| `development` | Colorized text with timestamp | Console |
| `production` | Structured JSON | Console + `logs/combined.log` + `logs/error.log` |

**HTTP request log format:**

```
GET /api/v1/orders 200 34ms 1248b — 127.0.0.1 "Mozilla/5.0..."
```

5xx responses log as `error`, 4xx as `warn`, 2xx as `log`.

---

## 17. Admin Panel

A React admin panel lives at `../restaurant-service-admin/`. See that project's README for full details.

**Running:**

```bash
cd ../restaurant-service-admin
npm install
cp .env.local.example .env.local   # set VITE_BASE_URL
npm run dev
```

---

## 18. Mobile Developer Guide

See `MOBILE_DEV_GUIDE.md` for the full mobile integration reference. It covers:

- Customer app flows (browse, order, track, rate)
- Rider app flows (go online, accept job, update status, confirm COD)
- Socket.io event reference with complete payload shapes
- Paystack React Native integration (`@paystack/react-native-paystack-webview`)
- Axios interceptor pattern for automatic token refresh with request queuing
- Error handling table with recommended actions per HTTP status code

Contact: devgroup.ai@thedigicoast.com

---

## 19. Deployment

### Docker

```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY package*.json ./
ENV NODE_ENV=production
EXPOSE 3000
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]
```

### Recommended platforms

- **Railway / Render** — auto-builds from git, PostgreSQL add-on available
- **Fly.io** — global edge regions, good for Socket.io latency
- **AWS ECS / EC2** — if you need full control

### CI/CD notes

```bash
# Never run in production:
npx prisma migrate dev   # resets schema — destructive

# Safe for production deploy:
npx prisma migrate deploy  # applies pending migrations only
```

### Health check

```
GET /api/v1/
→ 200 OK  (service is running)
```

Configure your load balancer / container platform to hit this endpoint every 30 seconds.
