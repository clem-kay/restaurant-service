import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ValidationPipe, Logger } from '@nestjs/common';
import { json } from 'express';
import helmet from 'helmet';
import * as compression from 'compression';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });
  const logger = new Logger('Bootstrap');

  app.setGlobalPrefix('api/v1');

  // ─── Security headers ─────────────────────────────────────────────────────
  app.use(
    helmet({
      // Allow Swagger UI to load inline scripts/styles
      contentSecurityPolicy: process.env.NODE_ENV === 'production',
    }),
  );

  // ─── GZIP compression ─────────────────────────────────────────────────────
  app.use(compression());

  // Raw body needed for Paystack webhook HMAC verification
  app.use('/api/v1/payment/webhook/paystack', json({ type: '*/*' }));

  // ─── CORS ─────────────────────────────────────────────────────────────────
  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : ['http://localhost:5173', 'http://localhost:3001'];

  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, Postman, server-to-server)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // ─── Swagger ─────────────────────────────────────────────────────────────
  const config = new DocumentBuilder()
    .setTitle('Food Delivery Platform API')
    .setDescription(
      `
## Overview
Multi-restaurant food delivery platform API — similar to Bolt Food.

## Authentication
All protected endpoints require a **Bearer token** in the \`Authorization\` header.
Tokens expire after **15 minutes**. Use \`POST /auth/refresh\` with the refresh token to get a new pair.

## Real-time (Socket.io)
Connect to \`ws://<host>/tracking\` for live delivery tracking.
See the Mobile Developer Guide for full event documentation.

## Environments
| Environment | Base URL |
|---|---|
| Local | \`http://localhost:3000/api/v1\` |
| Staging | \`https://staging.yourdomain.com/api/v1\` |
| Production | \`https://api.yourdomain.com/api/v1\` |
      `.trim(),
    )
    .setVersion('2.0')
    .setContact('Platform Team', '', 'devgroup.ai@thedigicoast.com')
    .addServer('http://localhost:3000', 'Local')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', in: 'header' },
      'access-token',
    )
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', in: 'header' },
      'refresh-token',
    )
    .addTag('Auth', 'Login, logout, and token refresh')
    .addTag('Restaurant', 'Restaurant discovery, onboarding, and menu browsing (public + admin)')
    .addTag('Orders', 'Order creation and management')
    .addTag('Payment', 'Paystack checkout and cash-on-delivery flows')
    .addTag('Delivery', 'Rider assignment and delivery tracking')
    .addTag('FoodMenu', 'Menu item management')
    .addTag('Category', 'Food category management')
    .addTag('UserAccount', 'User account management')
    .addTag('Reservation', 'Table reservations')
    .addTag('Dashboard', 'Admin analytics and stats')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
    customSiteTitle: 'Food Delivery API Docs',
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  logger.log(`Application running on http://localhost:${port}`);
  logger.log(`Swagger docs at http://localhost:${port}/docs`);
}
bootstrap();
