import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext } from '@nestjs/common';

import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { AtGuard } from 'src/guards/at.guard';
import { CheckoutDto } from './dto/checkout.dto';
import { PaymentMethod } from '@prisma/client';

const mockPaymentService = {
  checkout: jest.fn(),
  handleWebhook: jest.fn(),
  confirmCashReceived: jest.fn(),
};

const mockAtGuard = {
  canActivate: (ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    request.user = { customerId: 42, riderId: 7 };
    return true;
  },
};

describe('PaymentController', () => {
  let controller: PaymentController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentController],
      providers: [
        { provide: PaymentService, useValue: mockPaymentService },
      ],
    })
      .overrideGuard(AtGuard)
      .useValue(mockAtGuard)
      .compile();

    controller = module.get<PaymentController>(PaymentController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ─── checkout ──────────────────────────────────────────────────────────────

  describe('checkout', () => {
    it('calls paymentService.checkout with customerId and dto', async () => {
      const dto: CheckoutDto = {
        restaurantId: 1,
        deliveryAddressId: 10,
        items: [{ foodMenuId: 101, quantity: 2, price: 1000 }],
        paymentMethod: PaymentMethod.CASH_ON_DELIVERY,
      };
      const expected = { orderId: 55, paymentMethod: 'CASH_ON_DELIVERY' };
      mockPaymentService.checkout.mockResolvedValue(expected);

      const result = await controller.checkout(42, dto);

      expect(mockPaymentService.checkout).toHaveBeenCalledWith(42, dto);
      expect(result).toEqual(expected);
    });

    it('returns paystack authorization_url for PAYSTACK payment', async () => {
      const dto: CheckoutDto = {
        restaurantId: 1,
        deliveryAddressId: 10,
        items: [{ foodMenuId: 101, quantity: 1, price: 1500 }],
        paymentMethod: PaymentMethod.PAYSTACK,
      };
      const expected = {
        authorization_url: 'https://checkout.paystack.com/abc123',
        reference: 'ref_xyz',
        paymentMethod: 'PAYSTACK',
      };
      mockPaymentService.checkout.mockResolvedValue(expected);

      const result = await controller.checkout(42, dto);

      expect(mockPaymentService.checkout).toHaveBeenCalledWith(42, dto);
      expect(result).toEqual(expected);
    });
  });

  // ─── webhook ───────────────────────────────────────────────────────────────

  describe('webhook', () => {
    it('calls paymentService.handleWebhook with req.rawBody and signature', async () => {
      const rawBody = Buffer.from(JSON.stringify({ event: 'charge.success', data: {} }));
      const req = { rawBody } as any;
      const signature = 'valid-hmac-signature';
      const expected = { received: true };
      mockPaymentService.handleWebhook.mockResolvedValue(expected);

      const result = await controller.webhook(req, signature);

      expect(mockPaymentService.handleWebhook).toHaveBeenCalledWith(rawBody, signature);
      expect(result).toEqual(expected);
    });

    it('passes req.rawBody as a Buffer', async () => {
      const rawBody = Buffer.from('raw-body-content');
      const req = { rawBody } as any;
      const signature = 'some-signature';
      mockPaymentService.handleWebhook.mockResolvedValue({ received: true });

      await controller.webhook(req, signature);

      const calledWith = mockPaymentService.handleWebhook.mock.calls[0][0];
      expect(Buffer.isBuffer(calledWith)).toBe(true);
      expect(calledWith).toBe(rawBody);
    });
  });

  // ─── confirmCash ───────────────────────────────────────────────────────────

  describe('confirmCash', () => {
    it('calls paymentService.confirmCashReceived with riderId and orderId', async () => {
      const riderId = 7;
      const orderId = 55;
      const expected = { confirmed: true };
      mockPaymentService.confirmCashReceived.mockResolvedValue(expected);

      const result = await controller.confirmCash(riderId, orderId);

      expect(mockPaymentService.confirmCashReceived).toHaveBeenCalledWith(riderId, orderId);
      expect(result).toEqual(expected);
    });
  });
});
