# Food Delivery Platform — Backend API

A production-ready multi-restaurant food delivery backend built with NestJS, Prisma (PostgreSQL), Socket.io, and Paystack. Designed to power a platform similar to Bolt Food — multiple restaurants, customer ordering, real-time rider tracking, and flexible payment.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Tech Stack](#2-tech-stack)
3. [Getting Started](#3-getting-started)
4. [Environment Variables](#4-environment-variables)
5. [Database](#5-database)
6. [Running the App](#6-running-the-app)
7. [API Reference](#7-api-reference)
8. [Authentication](#8-authentication)
9. [Real-Time Events (Socket.io)](#9-real-time-events-socketio)
10. [Payment Flows](#10-payment-flows)
11. [Order & Delivery Lifecycle](#11-order--delivery-lifecycle)
12. [Security](#12-security)
13. [Logging](#13-logging)
14. [Admin Panel](#14-admin-panel)
15. [Mobile Developer Guide](#15-mobile-developer-guide)
16. [Deployment](#16-deployment)

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
| `UseraccountModule` | User account CRUD |
| `RestaurantModule` | Multi-restaurant onboarding, listings, menus |
| `OrdersModule` | Order creation and status management |
| `PaymentModule` | Paystack checkout, COD, webhook verification |
| `DeliveryModule` | Rider assignment, delivery lifecycle, location REST fallback |
| `TrackingModule` | Socket.io gateway for real-time location and status |
| `CategoryModule` | Food category management |
| `FoodmenuModule` | Menu item management |
| `DashboardModule` | Aggregated admin analytics |
| `ReservationModule` | Table reservations (legacy) |
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
                     │                                 │
                     └──── Order ──── OrderItem ───────┘
                              │
                         Delivery ──── Rider
                              │
                         Customer ──── CustomerAddress
```

**Key design decisions:**

- `Restaurant` is the central multi-tenant entity. Every category, menu item, and order is scoped to a restaurant.
- `UserAccount` holds auth credentials. Role-specific data lives in `Restaurant`, `Customer`, or `Rider` profile records.
- `Delivery` is created atomically when a rider accepts — prevents double-assignment.
- `OrderStatusHistory` provides a full audit trail of every status change.

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
| `POST` | `/restaurant/admin/create` | PLATFORM_ADMIN | Manually onboard a restaurant |
| `PATCH` | `/restaurant/:id/approve` | PLATFORM_ADMIN | Approve or reject registration |
| `GET` | `/restaurant/admin/pending` | PLATFORM_ADMIN | Restaurants awaiting approval |
| `GET` | `/restaurant/admin/all` | PLATFORM_ADMIN | All restaurants with filters |

**Query filters on `/restaurant/admin/all`:**

```
?isApproved=true     — only approved restaurants
?isOpen=false        — only closed restaurants
?isApproved=true&isOpen=true   — open and approved
```

### Orders

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/orders` | Public | List orders (paginated + filtered) |
| `POST` | `/orders` | Public | Create order (admin legacy) |
| `GET` | `/orders/:id` | Public | Get order with items |
| `DELETE` | `/orders/:id` | Public | Delete order (PENDING only) |
| `PUT` | `/orders/update-status/:id` | Public | Update food status |
| `PUT` | `/orders/update-payment/:id` | Public | Update payment status |

**Query filters on `GET /orders`:**

```
?foodStatus=PENDING             — filter by food status
?paymentStatus=PAID             — filter by payment status
?paymentMethod=CASH_ON_DELIVERY — filter by payment method
?restaurantId=1                 — filter by restaurant
?page=1&limit=50                — pagination (max 100/page)
```

**Valid `foodStatus` values:** `PENDING | ACCEPTED | PREPARING | READY | PICKED_UP | DELIVERED | CANCELLED`
**Valid `paymentStatus` values:** `PENDING | PAID | FAILED | REFUNDED | COD_PENDING`
**Valid `paymentMethod` values:** `PAYSTACK | CASH_ON_DELIVERY`

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
| `POST` | `/foodmenu` | Public | Create item |
| `GET` | `/foodmenu/:id` | Public | Get item by ID |
| `PUT` | `/foodmenu/:id` | Public | Update item |
| `DELETE` | `/foodmenu/:id` | Public | Delete item |
| `GET` | `/foodmenu/get-by-category/:id` | Public | Items by category (filterable) |

**Query filters on `GET /foodmenu`:**

```
?isAvailable=true      — only available items
?restaurantId=1        — items for a specific restaurant
?categoryId=2          — items in a specific category
```

**Query filters on `GET /foodmenu/get-by-category/:id`:**

```
?isAvailable=true      — only available items in this category
```

### Categories

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/category` | Public | List categories (filterable) |
| `POST` | `/category` | Public | Create category |
| `GET` | `/category/:id` | Public | Get category by ID |
| `PATCH` | `/category/:id` | Public | Update category |
| `DELETE` | `/category/:id` | Public | Delete category and all its items |

**Query filters on `GET /category`:**

```
?restaurantId=1    — categories for a specific restaurant
```

### Dashboard

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/dashboard` | Bearer (AT) | Platform stats — orders, sales, menu counts |

---

## 8. Authentication

The platform uses a **dual-token pattern** with short-lived access tokens and long-lived refresh tokens.

| Token | TTL | Where to use |
|---|---|---|
| Access Token | 15 minutes | `Authorization: Bearer <access_token>` on every request |
| Refresh Token | 7 days | `Authorization: Bearer <refresh_token>` on `POST /auth/refresh` only |

**Full flow:**

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

**User roles:**

| Role | Can do |
|---|---|
| `PLATFORM_ADMIN` | Manage all restaurants, users, platform settings |
| `RESTAURANT_ADMIN` | Manage own restaurant, menu, categories, orders |
| `CUSTOMER` | Browse restaurants, place orders, track delivery, rate |
| `RIDER` | Go online, accept jobs, update status, confirm COD |

Role is embedded in the JWT payload. A rider calling a customer-only endpoint receives `403 Forbidden`.

---

## 9. Real-Time Events (Socket.io)

**Namespace:** `/tracking`
**Transport:** WebSocket (polling fallback)

```js
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000/tracking', {
  transports: ['websocket'],
});

socket.on('connect', () => console.log('Connected:', socket.id));
socket.on('disconnect', (reason) => console.log('Disconnected:', reason));
```

### Events emitted by the client

| Event | Payload | Who sends | When |
|---|---|---|---|
| `customer:track` | `{ orderId: number }` | Customer | After placing order — joins order room |
| `rider:online` | `{ riderId: number }` | Rider | When going available for deliveries |
| `rider:location` | `{ orderId, lat, lng, heading }` | Rider | Every 5s during active delivery |
| `restaurant:join` | `{ restaurantId: number }` | Restaurant admin | On admin panel load |

### Events emitted by the server

| Event | Payload | Who receives | Trigger |
|---|---|---|---|
| `delivery:location` | `{ lat, lng, heading, timestamp }` | Customer | Rider emits `rider:location` |
| `delivery:status` | `{ status, timestamp }` | Customer | Rider calls `PATCH /delivery/:id/status` |
| `delivery:assigned` | `{ riderId, riderName, vehicleType }` | Customer | Rider accepts delivery |
| `delivery:job_available` | `{ orderId, restaurantName, dropoffAddress, riderEarning, distanceKm }` | Rider | Restaurant marks food READY |
| `order:new` | `{ orderId, paymentMethod, totalAmount }` | Restaurant admin | Paystack webhook or COD checkout |
| `payment:confirmed` | `{ orderId }` | Customer | Rider calls `POST /payment/cod/confirm` |

---

## 10. Payment Flows

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
           Opens tracking screen

Rider:     Delivers food, collects cash
           POST /payment/cod/confirm  { orderId }
           ←  200 OK

Server:    Sets paymentStatus = PAID
           Emits 'payment:confirmed' to customer
```

---

## 11. Order & Delivery Lifecycle

### Food status (set by restaurant admin)

| Status | Set by | Meaning |
|---|---|---|
| `PENDING` | System | Order received, awaiting restaurant confirmation |
| `ACCEPTED` | Restaurant admin | Restaurant confirmed the order |
| `PREPARING` | Restaurant admin | Kitchen started cooking |
| `READY` | Restaurant admin | Food ready — rider search triggered |
| `PICKED_UP` | Rider (via delivery status) | Rider has the food |
| `DELIVERED` | Rider (via delivery status) | Customer received the order |
| `CANCELLED` | Admin | Order cancelled |

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
4. If no rider accepts within **2 minutes**, radius expands to **10 km** and top 5 in that radius are notified

---

## 12. Security

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

## 13. Logging

All logs use **Winston** via the global `AppLogger` service (injected like a NestJS service).

| Environment | Format | Output |
|---|---|---|
| `development` | Colorized text with timestamp | Console |
| `production` | Structured JSON | Console + `logs/combined.log` + `logs/error.log` |

**HTTP request log format:**

```
GET /api/v1/orders 200 34ms 1248b — 127.0.0.1 "Mozilla/5.0..."
```

5xx responses log as `error`, 4xx as `warn`, 2xx as `log`.

**Using the logger in a service:**

```typescript
import { AppLogger } from 'src/logger/logger.service';

@Injectable()
export class MyService {
  constructor(private readonly logger: AppLogger) {
    this.logger.setContext(MyService.name);
  }

  doWork() {
    this.logger.log('Starting work');
    this.logger.warn('Something looks off');
    this.logger.error('Failed', error.stack);
  }
}
```

---

## 14. Admin Panel

A React admin panel lives at `../restaurant-service-admin/`.

**Tech stack:** React 18 + Vite + TanStack Query + Zustand + shadcn/ui + Axios

**Features:**
- JWT auth with automatic token refresh (queues concurrent requests during refresh)
- Dashboard with order stats and sales summaries
- Category management
- Menu item management per category (create, update, delete)
- Order list, status updates, payment management
- Error boundary for runtime crashes
- GZIP compression on API responses

**Running:**

```bash
cd ../restaurant-service-admin
npm install
cp .env.local.example .env.local   # set VITE_BASE_URL
npm run dev
```

---

## 15. Mobile Developer Guide

See `MOBILE_DEV_GUIDE.md` for the full mobile integration reference. It covers:

- Customer app flows (browse, order, track, rate)
- Rider app flows (go online, accept job, update status, confirm COD)
- Socket.io event reference with complete payload shapes
- Paystack React Native integration (`@paystack/react-native-paystack-webview`)
- Axios interceptor pattern for automatic token refresh with request queuing
- Error handling table with recommended actions per HTTP status code
- Pre-launch checklist (keys, permissions, push tokens, HTTPS)

Contact: devgroup.ai@thedigicoast.com

---

## 16. Deployment

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
