import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { UseraccountController } from './useraccount.controller';
import { UseraccountService } from './useraccount.service';
import { DoesUserExist } from 'src/guards/doesUserExist.guard';
import { CreateUseraccountDto } from './dto/create-useraccount.dto';
import { UpdateUseraccountDto } from './dto/update-useraccount.dto';
import { ChangePasswordDTO } from 'src/auth/dto/LoginDto';
import { UserRole } from '@prisma/client';

const mockUseraccountService = {
  create: jest.fn(),
  findAll: jest.fn(),
  findOneById: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
  activate: jest.fn(),
  changePassword: jest.fn(),
};

describe('UseraccountController', () => {
  let controller: UseraccountController;
  let service: typeof mockUseraccountService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UseraccountController],
      providers: [
        {
          provide: UseraccountService,
          useValue: mockUseraccountService,
        },
      ],
    })
      .overrideGuard(DoesUserExist)
      .useValue({ canActivate: jest.fn().mockReturnValue(true) })
      .compile();

    controller = module.get<UseraccountController>(UseraccountController);
    service = module.get(UseraccountService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should call useraccountService.create with the provided dto', async () => {
      const dto: CreateUseraccountDto = {
        username: 'john_doe',
        password: 'TempPass123!',
        role: UserRole.RESTAURANT_ADMIN,
      };

      const expectedResult = {
        user: { username: 'john_doe', role: UserRole.RESTAURANT_ADMIN, isActive: true, createdAt: new Date() },
        message: 'success',
      };

      service.create.mockResolvedValue(expectedResult);

      const result = await controller.create(dto);

      expect(service.create).toHaveBeenCalledWith(dto);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('findAll', () => {
    it('should call useraccountService.findAll and return all users', async () => {
      const expectedUsers = [
        { id: 1, username: 'john_doe', role: UserRole.RESTAURANT_ADMIN, isActive: true, createdAt: new Date() },
        { id: 2, username: 'jane_doe', role: UserRole.RESTAURANT_ADMIN, isActive: false, createdAt: new Date() },
      ];

      service.findAll.mockResolvedValue(expectedUsers);

      const result = await controller.findAll();

      expect(service.findAll).toHaveBeenCalled();
      expect(result).toEqual(expectedUsers);
    });
  });

  describe('findOne', () => {
    it('should return the user fields when user is found', async () => {
      const mockUser = {
        id: 1,
        username: 'john_doe',
        isActive: true,
        role: UserRole.RESTAURANT_ADMIN,
        password: 'hashed',
        hashedRT: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      service.findOneById.mockResolvedValue(mockUser);

      const result = await controller.findOne('1');

      expect(service.findOneById).toHaveBeenCalledWith(1);
      expect(result).toEqual({
        id: mockUser.id,
        username: mockUser.username,
        isActive: mockUser.isActive,
        role: mockUser.role,
      });
    });

    it('should throw NotFoundException when user is not found', async () => {
      service.findOneById.mockResolvedValue(null);

      await expect(controller.findOne('99')).rejects.toThrow(NotFoundException);
      expect(service.findOneById).toHaveBeenCalledWith(99);
    });
  });

  describe('update', () => {
    it('should call useraccountService.update with the numeric id and dto', async () => {
      const dto: UpdateUseraccountDto = { username: 'updated_user' };
      const updatedUser = { id: 1, username: 'updated_user', role: UserRole.RESTAURANT_ADMIN, isActive: true };

      service.update.mockResolvedValue(updatedUser);

      const result = await controller.update('1', dto);

      expect(service.update).toHaveBeenCalledWith(1, dto);
      expect(result).toEqual(updatedUser);
    });
  });

  describe('remove', () => {
    it('should call useraccountService.remove with the numeric id', async () => {
      const deletedUser = { id: 1, username: 'john_doe' };

      service.remove.mockResolvedValue(deletedUser);

      const result = await controller.remove('1');

      expect(service.remove).toHaveBeenCalledWith(1);
      expect(result).toEqual(deletedUser);
    });
  });

  describe('activate', () => {
    it('should call useraccountService.activate with the numeric id and body', async () => {
      const body = { isActive: true };
      const expectedResult = { username: 'john_doe', role: UserRole.RESTAURANT_ADMIN, isActive: true };

      service.activate.mockResolvedValue(expectedResult);

      const result = await controller.activate('1', body);

      expect(service.activate).toHaveBeenCalledWith(1, body);
      expect(result).toEqual(expectedResult);
    });

    it('should call useraccountService.activate with isActive false to deactivate', async () => {
      const body = { isActive: false };
      const expectedResult = { username: 'john_doe', role: UserRole.RESTAURANT_ADMIN, isActive: false };

      service.activate.mockResolvedValue(expectedResult);

      const result = await controller.activate('2', body);

      expect(service.activate).toHaveBeenCalledWith(2, body);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('changePassword', () => {
    it('should call useraccountService.changePassword with the provided dto', async () => {
      const dto: ChangePasswordDTO = {
        username: 'john_doe',
        oldPassword: 'OldPass123!',
        newPassword: 'NewPass456!',
      };

      const expectedResult = { message: 'success' };

      service.changePassword.mockResolvedValue(expectedResult);

      const result = await controller.changePassword(dto);

      expect(service.changePassword).toHaveBeenCalledWith(dto);
      expect(result).toEqual(expectedResult);
    });
  });
});
