import { Module } from '@nestjs/common';
import { UseraccountService } from './useraccount.service';
import { UseraccountController } from './useraccount.controller';

@Module({
  controllers: [UseraccountController],
  providers: [UseraccountService],
})
export class UseraccountModule {}
