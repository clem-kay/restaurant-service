import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/LoginDto';

const mockAuthService = {
  login: jest.fn(),
  logout: jest.fn(),
  refreshTokens: jest.fn(),
};

describe('AuthController', () => {
  let controller: AuthController;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: mockAuthService }],
    })
      .overrideGuard(require('@nestjs/passport').AuthGuard('jwt'))
      .useValue({ canActivate: () => true })
      .overrideGuard(require('@nestjs/passport').AuthGuard('jwt-refresh'))
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AuthController>(AuthController);
  });

  describe('login', () => {
    it('should call authService.login with the dto and return its result', async () => {
      const dto: LoginDto = { username: 'admin', password: 'secret' };
      const expected = { id: 1, access_token: 'at', refresh_token: 'rt', username: 'admin', message: 'success', role: 'CUSTOMER' };
      mockAuthService.login.mockResolvedValue(expected);

      const result = await controller.login(dto);

      expect(mockAuthService.login).toHaveBeenCalledWith(dto);
      expect(result).toEqual(expected);
    });
  });

  describe('logout', () => {
    it('should call authService.logout with user sub and return its result', async () => {
      const req = { user: { sub: 42 } } as any;
      mockAuthService.logout.mockResolvedValue(undefined);

      await controller.logout(req);

      expect(mockAuthService.logout).toHaveBeenCalledWith(42);
    });
  });

  describe('refreshTokens', () => {
    it('should call authService.refreshTokens with sub and refreshToken', async () => {
      const req = { user: { sub: 7, refreshToken: 'my-rt' } } as any;
      const expected = { access_token: 'new-at', refresh_token: 'new-rt' };
      mockAuthService.refreshTokens.mockResolvedValue(expected);

      const result = await controller.refreshTokens(req);

      expect(mockAuthService.refreshTokens).toHaveBeenCalledWith(7, 'my-rt');
      expect(result).toEqual(expected);
    });
  });
});
