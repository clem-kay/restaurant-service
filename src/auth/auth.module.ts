import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { ATStrategy, RTStrategy } from 'src/strategies';
import { JwtModule } from '@nestjs/jwt';
import { UseraccountModule } from 'src/useraccount/useraccount.module';
import { PassportModule } from '@nestjs/passport';
import { UseraccountService } from 'src/useraccount/useraccount.service';

@Module({
  imports: [PassportModule, UseraccountModule, JwtModule.register({})],
  providers: [AuthService, RTStrategy, ATStrategy, UseraccountService],
  controllers: [AuthController],
})
export class AuthModule {}
