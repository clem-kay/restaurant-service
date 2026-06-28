import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, Logger, UnauthorizedException } from '@nestjs/common';
import { UseraccountService } from './useraccount.service';
import { PrismaService } from 'src/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import * as helpers from 'src/core/helpers';
import { ChangePasswordDTO } from 'src/auth/dto/LoginDto';

jest.mock('bcrypt', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

jest.mock('src/core/helpers', () => ({
  hashPassword: jest.fn(),
}));

const mockPrismaService = {
  userAccount: {
    update: jest.fn(),
    updateMany: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
  },
};

describe('UseraccountService', () => {
  let service: UseraccountService;
  let prisma: typeof mockPrismaService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UseraccountService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    // Suppress logger output during tests
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);

    service = module.get<UseraccountService>(UseraccountService);
    prisma = mockPrismaService;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ─── activate ────────────────────────────────────────────────────────────────

  describe('activate', () => {
    const mockUpdatedAccount = {
      id: 1,
      username: 'testuser',
      role: 'RESTAURANT_ADMIN',
      isActive: true,
    };

    it('should log "Activating" when isActive is true and return user fields', async () => {
      prisma.userAccount.update.mockResolvedValue(mockUpdatedAccount);

      const logSpy = jest.spyOn(Logger.prototype, 'log');
      const result = await service.activate(1, { isActive: true });

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Activating'),
      );
      expect(result).toEqual({
        username: mockUpdatedAccount.username,
        role: mockUpdatedAccount.role,
        isActive: mockUpdatedAccount.isActive,
      });
    });

    it('should log "Deactivating" when isActive is false', async () => {
      const deactivatedAccount = { ...mockUpdatedAccount, isActive: false };
      prisma.userAccount.update.mockResolvedValue(deactivatedAccount);

      const logSpy = jest.spyOn(Logger.prototype, 'log');
      const result = await service.activate(1, { isActive: false });

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Deactivating'),
      );
      expect(result).toEqual({
        username: deactivatedAccount.username,
        role: deactivatedAccount.role,
        isActive: deactivatedAccount.isActive,
      });
    });

    it('should throw and log error when prisma throws', async () => {
      const error = new Error('DB error');
      prisma.userAccount.update.mockRejectedValue(error);

      const errorSpy = jest.spyOn(Logger.prototype, 'error');
      await expect(service.activate(1, { isActive: true })).rejects.toThrow(
        'DB error',
      );
      expect(errorSpy).toHaveBeenCalled();
    });
  });

  // ─── findOneById ─────────────────────────────────────────────────────────────

  describe('findOneById', () => {
    it('should return a user account by id', async () => {
      const mockAccount = { id: 1, username: 'testuser' };
      prisma.userAccount.findUnique.mockResolvedValue(mockAccount);

      const result = await service.findOneById(1);

      expect(prisma.userAccount.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(result).toEqual(mockAccount);
    });

    it('should throw and log error when prisma throws', async () => {
      const error = new Error('Not found');
      prisma.userAccount.findUnique.mockRejectedValue(error);

      const errorSpy = jest.spyOn(Logger.prototype, 'error');
      await expect(service.findOneById(99)).rejects.toThrow('Not found');
      expect(errorSpy).toHaveBeenCalled();
    });
  });

  // ─── logout ──────────────────────────────────────────────────────────────────

  describe('logout', () => {
    it('should call updateMany to clear hashedRT', async () => {
      prisma.userAccount.updateMany.mockResolvedValue({ count: 1 });

      await service.logout(1);

      expect(prisma.userAccount.updateMany).toHaveBeenCalledWith({
        where: { id: 1, hashedRT: { not: null } },
        data: { hashedRT: null },
      });
    });

    it('should throw and log error when prisma throws', async () => {
      const error = new Error('Logout error');
      prisma.userAccount.updateMany.mockRejectedValue(error);

      const errorSpy = jest.spyOn(Logger.prototype, 'error');
      await expect(service.logout(1)).rejects.toThrow('Logout error');
      expect(errorSpy).toHaveBeenCalled();
    });
  });

  // ─── create ──────────────────────────────────────────────────────────────────

  describe('create', () => {
    const createDto = {
      username: 'NewUser',
      password: 'plainPassword',
      role: 'RESTAURANT_ADMIN' as any,
    };

    const mockCreated = {
      id: 1,
      username: 'newuser',
      role: 'RESTAURANT_ADMIN',
      isActive: true,
      createdAt: new Date('2024-01-01'),
    };

    it('should hash the password, lowercase the username, and return success', async () => {
      (helpers.hashPassword as jest.Mock).mockResolvedValue('hashedPassword');
      prisma.userAccount.create.mockResolvedValue(mockCreated);

      const result = await service.create(createDto);

      expect(helpers.hashPassword).toHaveBeenCalledWith(createDto.password);
      expect(prisma.userAccount.create).toHaveBeenCalledWith({
        data: {
          ...createDto,
          username: 'newuser',
          password: 'hashedPassword',
        },
      });
      expect(result).toEqual({
        user: {
          username: mockCreated.username,
          role: mockCreated.role,
          isActive: mockCreated.isActive,
          createdAt: mockCreated.createdAt,
        },
        message: 'success',
      });
    });

    it('should throw and log error when prisma throws', async () => {
      (helpers.hashPassword as jest.Mock).mockResolvedValue('hashedPassword');
      const error = new Error('Create error');
      prisma.userAccount.create.mockRejectedValue(error);

      const errorSpy = jest.spyOn(Logger.prototype, 'error');
      await expect(service.create(createDto)).rejects.toThrow('Create error');
      expect(errorSpy).toHaveBeenCalled();
    });
  });

  // ─── findOneByUsername ───────────────────────────────────────────────────────

  describe('findOneByUsername', () => {
    it('should return a user account by username', async () => {
      const mockAccount = { id: 1, username: 'testuser' };
      prisma.userAccount.findUnique.mockResolvedValue(mockAccount);

      const result = await service.findOneByUsername('testuser');

      expect(prisma.userAccount.findUnique).toHaveBeenCalledWith({
        where: { username: 'testuser' },
      });
      expect(result).toEqual(mockAccount);
    });

    it('should throw and log error when prisma throws', async () => {
      const error = new Error('Username error');
      prisma.userAccount.findUnique.mockRejectedValue(error);

      const errorSpy = jest.spyOn(Logger.prototype, 'error');
      await expect(service.findOneByUsername('nobody')).rejects.toThrow(
        'Username error',
      );
      expect(errorSpy).toHaveBeenCalled();
    });
  });

  // ─── findAll ─────────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('should return all user accounts', async () => {
      const mockAccounts = [
        { id: 1, username: 'user1', role: 'ADMIN', isActive: true, createdAt: new Date() },
      ];
      prisma.userAccount.findMany.mockResolvedValue(mockAccounts);

      const result = await service.findAll();

      expect(prisma.userAccount.findMany).toHaveBeenCalledWith({
        select: {
          id: true,
          username: true,
          role: true,
          isActive: true,
          createdAt: true,
        },
      });
      expect(result).toEqual(mockAccounts);
    });

    it('should throw and log error when prisma throws', async () => {
      const error = new Error('FindAll error');
      prisma.userAccount.findMany.mockRejectedValue(error);

      const errorSpy = jest.spyOn(Logger.prototype, 'error');
      await expect(service.findAll()).rejects.toThrow('FindAll error');
      expect(errorSpy).toHaveBeenCalled();
    });
  });

  // ─── update ──────────────────────────────────────────────────────────────────

  describe('update', () => {
    it('should update and return the user account', async () => {
      const updateData = { role: 'WAITER' };
      const mockUpdated = { id: 1, username: 'testuser', role: 'WAITER' };
      prisma.userAccount.update.mockResolvedValue(mockUpdated);

      const result = await service.update(1, updateData);

      expect(prisma.userAccount.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { ...updateData },
      });
      expect(result).toEqual(mockUpdated);
    });

    it('should throw and log error when prisma throws', async () => {
      const error = new Error('Update error');
      prisma.userAccount.update.mockRejectedValue(error);

      const errorSpy = jest.spyOn(Logger.prototype, 'error');
      await expect(service.update(1, {})).rejects.toThrow('Update error');
      expect(errorSpy).toHaveBeenCalled();
    });
  });

  // ─── remove ──────────────────────────────────────────────────────────────────

  describe('remove', () => {
    it('should delete and return the deleted user account', async () => {
      const mockDeleted = { id: 1, username: 'testuser' };
      prisma.userAccount.delete.mockResolvedValue(mockDeleted);

      const result = await service.remove(1);

      expect(prisma.userAccount.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(result).toEqual(mockDeleted);
    });

    it('should throw and log error when prisma throws', async () => {
      const error = new Error('Delete error');
      prisma.userAccount.delete.mockRejectedValue(error);

      const errorSpy = jest.spyOn(Logger.prototype, 'error');
      await expect(service.remove(1)).rejects.toThrow('Delete error');
      expect(errorSpy).toHaveBeenCalled();
    });
  });

  // ─── updateRTHash ────────────────────────────────────────────────────────────

  describe('updateRTHash', () => {
    it('should hash the refresh token and update the user account', async () => {
      (helpers.hashPassword as jest.Mock).mockResolvedValue('hashedRT');
      prisma.userAccount.update.mockResolvedValue({});

      await service.updateRTHash(1, 'refresh_token_value');

      expect(helpers.hashPassword).toHaveBeenCalledWith('refresh_token_value');
      expect(prisma.userAccount.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { hashedRT: 'hashedRT' },
      });
    });

    it('should throw and log error when prisma throws', async () => {
      (helpers.hashPassword as jest.Mock).mockResolvedValue('hashedRT');
      const error = new Error('UpdateRT error');
      prisma.userAccount.update.mockRejectedValue(error);

      const errorSpy = jest.spyOn(Logger.prototype, 'error');
      await expect(service.updateRTHash(1, 'rt')).rejects.toThrow('UpdateRT error');
      expect(errorSpy).toHaveBeenCalled();
    });
  });

  // ─── changePassword ──────────────────────────────────────────────────────────

  describe('changePassword', () => {
    const changePasswordDto: ChangePasswordDTO = {
      username: 'testuser',
      oldPassword: 'oldPass123',
      newPassword: 'newPass456',
    };

    it('should throw ForbiddenException when user is not found', async () => {
      prisma.userAccount.findUnique.mockResolvedValue(null);

      await expect(service.changePassword(changePasswordDto)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.changePassword(changePasswordDto)).rejects.toThrow(
        'Invalid Username',
      );
    });

    it('should throw UnauthorizedException when old password does not match', async () => {
      const mockUser = {
        id: 1,
        username: 'testuser',
        password: 'hashedOldPass',
      };
      prisma.userAccount.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.changePassword(changePasswordDto)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.changePassword(changePasswordDto)).rejects.toThrow(
        'Passwords do not match',
      );
    });

    it('should return { message: "success" } when password is changed successfully', async () => {
      const mockUser = {
        id: 1,
        username: 'testuser',
        password: 'hashedOldPass',
      };
      prisma.userAccount.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (helpers.hashPassword as jest.Mock).mockResolvedValue('hashedNewPass');
      prisma.userAccount.update.mockResolvedValue({ id: 1, password: 'hashedNewPass' });

      const result = await service.changePassword(changePasswordDto);

      expect(helpers.hashPassword).toHaveBeenCalledWith(changePasswordDto.newPassword);
      expect(prisma.userAccount.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: { password: 'hashedNewPass' },
      });
      expect(result).toEqual({ message: 'success' });
    });

    it('should throw and log error when an unexpected error occurs', async () => {
      const error = new Error('Unexpected error');
      prisma.userAccount.findUnique.mockRejectedValue(error);

      const errorSpy = jest.spyOn(Logger.prototype, 'error');
      await expect(service.changePassword(changePasswordDto)).rejects.toThrow(
        'Unexpected error',
      );
      expect(errorSpy).toHaveBeenCalled();
    });
  });
});
