import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AuthModule } from './auth/auth.module';
import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service';
import { PrismaModule } from './prisma/prisma.module';
import { UserModule } from './user/user.module';
import { UseraccountModule } from './useraccount/useraccount.module';
import { FoodmenuModule } from './foodmenu/foodmenu.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { OrdersModule } from './orders/orders.module';
import { ReservationModule } from './reservation/reservation.module';
import { CategoryModule } from './category/category.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { MailerModule } from './mailer/mailer.module';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({isGlobal: true,}),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'uploads'),
      serveRoot: '/uploads',
    }),
    UserModule,
    AuthModule,
    UseraccountModule,
    PrismaModule,
    FoodmenuModule,
    OrdersModule,
    ReservationModule,
    CategoryModule,
    MailerModule, 
    DashboardModule,
  ],
  controllers: [AppController],
  providers: [AppService, PrismaService],
  exports:[ConfigModule]
})
export class AppModule {}
