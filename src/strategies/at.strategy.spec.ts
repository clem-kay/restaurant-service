import { ConfigService } from '@nestjs/config';
import { ATStrategy } from './at.strategy';

jest.mock('passport-jwt', () => {
  const original = jest.requireActual('passport-jwt');
  return {
    ...original,
    ExtractJwt: {
      fromAuthHeaderAsBearerToken: jest.fn().mockReturnValue(() => null),
    },
  };
});

jest.mock('@nestjs/passport', () => ({
  PassportStrategy: (_strategy: any, _name?: string) => {
    return class MockPassportStrategy {
      constructor(options: any) {
        // capture options for assertion
        (MockPassportStrategy as any).lastOptions = options;
      }
    };
  },
}));

const mockConfigService = {
  get: jest.fn().mockReturnValue('test-secret'),
} as unknown as ConfigService;

describe('ATStrategy', () => {
  let strategy: ATStrategy;

  beforeEach(() => {
    jest.clearAllMocks();
    (mockConfigService.get as jest.Mock).mockReturnValue('test-secret');
    strategy = new ATStrategy(mockConfigService, { userAccount: { findUnique: jest.fn() } } as any);
  });

  describe('constructor', () => {
    it('should call configService.get with AT_SECRET', () => {
      expect(mockConfigService.get).toHaveBeenCalledWith('AT_SECRET');
    });

    it('should call super with secretOrKey from configService.get("AT_SECRET")', () => {
      expect(mockConfigService.get).toHaveBeenCalledTimes(1);
      expect((mockConfigService.get as jest.Mock).mock.calls[0][0]).toBe('AT_SECRET');
    });
  });

  describe('validate', () => {
    it('should return the payload as-is', () => {
      const payload = { sub: 'user-id-123', username: 'testuser', role: 'PLATFORM_ADMIN' };
      const result = strategy.validate(payload);
      expect(result).toBe(payload);
    });

    it('should return any payload object unchanged', () => {
      const payload = { sub: 'another-id', username: 'anotheruser', role: 'RESTAURANT_ADMIN' };
      const result = strategy.validate(payload);
      expect(result).toEqual(payload);
    });
  });
});
