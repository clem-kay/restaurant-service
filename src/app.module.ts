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

@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'uploads'),
      serveRoot: '/uploads',
    }),
  UserModule, 
  AuthModule,
  UseraccountModule,
  PrismaModule,
  FoodmenuModule],
  controllers: [AppController],
  providers: [AppService,PrismaService],
})
export class AppModule {}
