import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { UseraccountService } from 'src/useraccount/useraccount.service';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

const mockUseraccountService = {
  findOneByUsername: jest.fn(),
  findOneById: jest.fn(),
  logout: jest.fn(),
  updateRTHash: jest.fn(),
};

const mockJwtService = {
  signAsync: jest.fn(),
};

const mockConfigService = {
  get: jest.fn((key: string) => {
    if (key === 'AT_SECRET') return 'at-secret';
    if (key === 'RT_SECRET') return 'rt-secret';
    return null;
  }),
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UseraccountService, useValue: mockUseraccountService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('login', () => {
    const loginDto = { username: 'TestUser', password: 'password123' };

    it('should throw UnauthorizedException when user is not found', async () => {
      mockUseraccountService.findOneByUsername.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(
        new UnauthorizedException('Username or password invalid'),
      );
      expect(mockUseraccountService.findOneByUsername).toHaveBeenCalledWith(
        loginDto.username.toLowerCase(),
      );
    });

    it('should throw UnauthorizedException when password does not match', async () => {
      const userAccount = {
        id: 1,
        username: 'testuser',
        password: 'hashed-password',
        isActive: true,
        role: 'user',
      };
      mockUseraccountService.findOneByUsername.mockResolvedValue(userAccount);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.login(loginDto)).rejects.toThrow(
        new UnauthorizedException('Username or password invalid'),
      );
      expect(bcrypt.compare).toHaveBeenCalledWith(
        loginDto.password,
        userAccount.password,
      );
    });

    it('should throw UnauthorizedException when user is found and password matches but account is blocked (isActive=false)', async () => {
      const userAccount = {
        id: 1,
        username: 'testuser',
        password: 'hashed-password',
        isActive: false,
        role: 'user',
      };
      mockUseraccountService.findOneByUsername.mockResolvedValue(userAccount);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await expect(service.login(loginDto)).rejects.toThrow(
        new UnauthorizedException('Account is blocked'),
      );
    });

    it('should return tokens and user info on successful login (isActive=true)', async () => {
      const userAccount = {
        id: 1,
        username: 'testuser',
        password: 'hashed-password',
        isActive: true,
        role: 'admin',
      };
      const tokens = {
        access_token: 'mock-access-token',
        refresh_token: 'mock-refresh-token',
      };

      mockUseraccountService.findOneByUsername.mockResolvedValue(userAccount);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockJwtService.signAsync
        .mockResolvedValueOnce(tokens.access_token)
        .mockResolvedValueOnce(tokens.refresh_token);
      mockUseraccountService.updateRTHash.mockResolvedValue(undefined);

      const result = await service.login(loginDto);

      expect(result).toEqual({
        id: userAccount.id,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        username: userAccount.username,
        message: 'success',
        role: userAccount.role,
      });
      expect(mockUseraccountService.updateRTHash).toHaveBeenCalledWith(
        userAccount.id,
        tokens.refresh_token,
      );
    });
  });

  describe('logout', () => {
    it('should call userAccountService.logout with the provided userId', async () => {
      const userId = 42;
      mockUseraccountService.logout.mockResolvedValue(undefined);

      await service.logout(userId);

      expect(mockUseraccountService.logout).toHaveBeenCalledWith(userId);
    });
  });

  describe('refreshTokens', () => {
    const userId = 1;
    const rt = 'plain-refresh-token';

    it('should throw ForbiddenException when user is not found', async () => {
      mockUseraccountService.findOneById.mockResolvedValue(null);

      await expect(service.refreshTokens(userId, rt)).rejects.toThrow(
        new ForbiddenException('Access Denied'),
      );
      expect(mockUseraccountService.findOneById).toHaveBeenCalledWith(userId);
    });

    it('should throw ForbiddenException when user has no hashedRT (null)', async () => {
      const user = { id: 1, username: 'testuser', hashedRT: null };
      mockUseraccountService.findOneById.mockResolvedValue(user);

      await expect(service.refreshTokens(userId, rt)).rejects.toThrow(
        new ForbiddenException('Access Denied'),
      );
    });

    it('should throw ForbiddenException when rt does not match the stored hash', async () => {
      const user = { id: 1, username: 'testuser', hashedRT: 'stored-hash' };
      mockUseraccountService.findOneById.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.refreshTokens(userId, rt)).rejects.toThrow(
        new ForbiddenException('Access Denied'),
      );
      expect(bcrypt.compare).toHaveBeenCalledWith(rt, user.hashedRT);
    });

    it('should return new tokens and update hash when rt matches', async () => {
      const user = { id: 1, username: 'testuser', hashedRT: 'stored-hash' };
      const tokens = {
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
      };

      mockUseraccountService.findOneById.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockJwtService.signAsync
        .mockResolvedValueOnce(tokens.access_token)
        .mockResolvedValueOnce(tokens.refresh_token);
      mockUseraccountService.updateRTHash.mockResolvedValue(undefined);

      const result = await service.refreshTokens(userId, rt);

      expect(result).toEqual(tokens);
      expect(mockUseraccountService.updateRTHash).toHaveBeenCalledWith(
        user.id,
        tokens.refresh_token,
      );
    });
  });

  describe('getTokens', () => {
    it('should call jwtService.signAsync twice with correct secrets and return tokens', async () => {
      const userId = 1;
      const username = 'testuser';
      const accessToken = 'signed-access-token';
      const refreshToken = 'signed-refresh-token';

      mockJwtService.signAsync
        .mockResolvedValueOnce(accessToken)
        .mockResolvedValueOnce(refreshToken);

      const result = await service.getTokens(userId, username);

      expect(result).toEqual({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      expect(mockJwtService.signAsync).toHaveBeenCalledTimes(2);

      expect(mockJwtService.signAsync).toHaveBeenCalledWith(
        { sub: userId, username },
        { secret: 'at-secret', expiresIn: 60 * 15 },
      );

      expect(mockJwtService.signAsync).toHaveBeenCalledWith(
        { sub: userId, username },
        { secret: 'rt-secret', expiresIn: 60 * 60 * 24 * 7 },
      );

      expect(mockConfigService.get).toHaveBeenCalledWith('AT_SECRET');
      expect(mockConfigService.get).toHaveBeenCalledWith('RT_SECRET');
    });
  });
});
