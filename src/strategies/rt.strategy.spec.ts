import { ConfigService } from '@nestjs/config';
import { RTStrategy } from './rt.strategy';

const mockConfigService = {
  get: jest.fn((key: string) => {
    if (key === 'RT_SECRET') return 'rt-secret';
    return null;
  }),
};

describe('RTStrategy', () => {
  let strategy: RTStrategy;

  beforeEach(() => {
    jest.clearAllMocks();
    strategy = new RTStrategy(mockConfigService as unknown as ConfigService);
  });

  describe('constructor', () => {
    it('should inject ConfigService and call super with secretOrKey from RT_SECRET', () => {
      expect(mockConfigService.get).toHaveBeenCalledWith('RT_SECRET');
      expect(strategy).toBeInstanceOf(RTStrategy);
    });
  });

  describe('validate', () => {
    it('should extract the refresh token from the Authorization header and return payload with refreshToken', () => {
      const payload = { sub: 1, username: 'testuser' };
      const req = {
        get: jest.fn().mockReturnValue('Bearer mytoken'),
      } as any;

      const result = strategy.validate(req, payload);

      expect(req.get).toHaveBeenCalledWith('authorization');
      expect(result).toEqual({ ...payload, refreshToken: 'mytoken' });
    });

    it('should spread all payload fields alongside the extracted refreshToken', () => {
      const payload = { sub: 42, username: 'anotheruser', role: 'admin' };
      const req = {
        get: jest.fn().mockReturnValue('Bearer mytoken'),
      } as any;

      const result = strategy.validate(req, payload);

      expect(result).toEqual({
        sub: 42,
        username: 'anotheruser',
        role: 'admin',
        refreshToken: 'mytoken',
      });
    });
  });
});
