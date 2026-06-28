import {
  Body, Controller, Headers, HttpCode, HttpStatus,
  Post, RawBodyRequest, Req, UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth, ApiBody, ApiConsumes, ApiExcludeEndpoint,
  ApiOperation, ApiResponse, ApiTags,
} from '@nestjs/swagger';
import { Request } from 'express';
import { PaymentService } from './payment.service';
import { CheckoutDto } from './dto/checkout.dto';
import { AtGuard } from 'src/guards/at.guard';
import { GetUser } from 'src/core/decorators/get-user.decorator';

@ApiTags('Payment')
@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('checkout')
  @UseGuards(AtGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Place an order',
    description: `Creates an order and initiates payment.

**For \`PAYSTACK\`:** Returns an \`authorization_url\`. Open this URL in the Paystack mobile SDK or a WebView. The order is created server-side once the Paystack webhook confirms payment — **do not create the order yourself after redirect**.

**For \`CASH_ON_DELIVERY\`:** Order is created immediately. Monitor the order status via Socket.io events.`,
  })
  @ApiBody({ type: CheckoutDto })
  @ApiResponse({
    status: 200,
    description: 'Paystack checkout initiated',
    schema: {
      examples: {
        paystack: {
          summary: 'Paystack payment',
          value: { authorization_url: 'https://checkout.paystack.com/abc123', reference: 'ref_xyz', paymentMethod: 'PAYSTACK' },
        },
        cod: {
          summary: 'Cash on delivery',
          value: { orderId: 42, paymentMethod: 'CASH_ON_DELIVERY' },
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Restaurant closed, item unavailable, or invalid address' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  checkout(@GetUser('customerId') customerId: number, @Body() dto: CheckoutDto) {
    return this.paymentService.checkout(customerId, dto);
  }

  @Post('webhook/paystack')
  @HttpCode(HttpStatus.OK)
  @ApiExcludeEndpoint()
  webhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-paystack-signature') signature: string,
  ) {
    return this.paymentService.handleWebhook(req.rawBody, signature);
  }

  @Post('cod/confirm')
  @UseGuards(AtGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Confirm cash received (Rider only)',
    description: 'Called by the rider once the customer has handed over cash. Marks the order payment as PAID and triggers the restaurant payout cycle.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['orderId'],
      properties: { orderId: { type: 'number', example: 42 } },
    },
  })
  @ApiResponse({ status: 200, description: 'Cash confirmed, payment marked as PAID', schema: { example: { confirmed: true } } })
  @ApiResponse({ status: 401, description: 'Not the assigned rider for this order' })
  confirmCash(
    @GetUser('riderId') riderId: number,
    @Body('orderId') orderId: number,
  ) {
    return this.paymentService.confirmCashReceived(riderId, orderId);
  }
}
