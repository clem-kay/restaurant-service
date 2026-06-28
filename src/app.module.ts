import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from './logger/logger.module';
import { HttpLoggerMiddleware } from './middleware/http-logger.middleware';
import { ServeStaticModule } from '@nestjs/serve-static';
import { CacheModule } from '@nestjs/cache-manager';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { join } from 'path';

import { PrismaModule } from './prisma/prisma.module';
import { PrismaService } from './prisma/prisma.service';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { UseraccountModule } from './useraccount/useraccount.module';
import { FoodmenuModule } from './foodmenu/foodmenu.module';
import { OrdersModule } from './orders/orders.module';
import { ReservationModule } from './reservation/reservation.module';
import { CategoryModule } from './category/category.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { MailerModule } from './mailer/mailer.module';
import { RestaurantModule } from './restaurant/restaurant.module';
import { PaymentModule } from './payment/payment.module';
import { DeliveryModule } from './delivery/delivery.module';
import { TrackingModule } from './tracking/tracking.module';
import { CustomerModule } from './customer/customer.module';
import { RiderModule } from './rider/rider.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    CacheModule.register({ isGlobal: true }),
    ThrottlerModule.forRoot([
      { name: 'short', ttl: 1000, limit: 10 },    // 10 req/s burst
      { name: 'medium', ttl: 60_000, limit: 100 }, // 100 req/min sustained
    ]),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'uploads'),
      serveRoot: '/uploads',
    }),
    PrismaModule,
    AuthModule,
    UserModule,
    UseraccountModule,
    FoodmenuModule,
    OrdersModule,
    ReservationModule,
    CategoryModule,
    DashboardModule,
    MailerModule,
    RestaurantModule,
    PaymentModule,
    DeliveryModule,
    TrackingModule,
    CustomerModule,
    RiderModule,
    LoggerModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    PrismaService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
  exports: [ConfigModule],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(HttpLoggerMiddleware).forRoutes('*');
  }
}
