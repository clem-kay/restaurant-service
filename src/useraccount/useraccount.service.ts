import {
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { CreateUseraccountDto } from './dto/create-useraccount.dto';
import * as bcrypt from 'bcrypt';
import { hashPassword } from 'src/core/helpers';
import { PrismaService } from 'src/prisma/prisma.service';
import { ChangePasswordDTO } from 'src/auth/dto/LoginDto';

@Injectable()
export class UseraccountService {
  private readonly logger = new Logger(UseraccountService.name);

  constructor(private prisma: PrismaService) {}

  async activate(id: number, body: { isActive: boolean }) {
    body.isActive ? this.logger.log(`Activating user account with ID: ${id}`) : this.logger.log(`Deactivating user account with ID: ${id}`) ;
    try {
      const result = await this.prisma.userAccount.update({
        where: { id },
        data: body,
      });
      this.logger.log(`Successfully activated user account with ID: ${id}`);
      const userReturn = {
        username:result.username,
        role:result.role,
        isActive:result.isActive,
      }
      return userReturn;
    } catch (error) {
      this.logger.error(
        `Failed to activate user account with ID: ${id}`,
        error.stack,
      );
      throw error;
    }
  }

  async findOneById(id: number) {
    this.logger.log(`Fetching user account with ID: ${id}`);
    try {
      const userAccount = await this.prisma.userAccount.findUnique({
        where: { id },
      });
      this.logger.log(`Successfully fetched user account with ID: ${id}`);
      return userAccount;
    } catch (error) {
      this.logger.error(
        `Failed to fetch user account with ID: ${id}`,
        error.stack,
      );
      throw error;
    }
  }

  async logout(userId: number) {
    this.logger.log(`Logging out user with ID: ${userId}`);
    try {
      await this.prisma.userAccount.updateMany({
        where: {
          id: userId,
          hashedRT: {
            not: null,
          },
        },
        data: {
          hashedRT: null,
        },
      });
      this.logger.log(`Successfully logged out user with ID: ${userId}`);
    } catch (error) {
      this.logger.error(
        `Failed to log out user with ID: ${userId}`,
        error.stack,
      );
      throw error;
    }
  }

  async create(dto: CreateUseraccountDto) {
    this.logger.log('Creating a new user account');
    try {
      const { username, password, role, managedRestaurantId } = dto;
      const userCreated = await this.prisma.userAccount.create({
        data: {
          username: username.toLowerCase(),
          password: await hashPassword(password),
          role,
          ...(managedRestaurantId !== undefined && { managedRestaurantId }),
        },
      });
      this.logger.log('Successfully created a new user account');
      return {
        user: {
          username: userCreated.username,
          role: userCreated.role,
          isActive: userCreated.isActive,
          createdAt: userCreated.createdAt,
        },
        message: 'success',
      };
    } catch (error) {
      this.logger.error('Failed to create a new user account', error.stack);
      throw error;
    }
  }

  async createManagedAccount(adminId: number, dto: CreateUseraccountDto) {
    this.logger.log(`RESTAURANT_ADMIN ${adminId} creating managed account (role: ${dto.role ?? 'RESTAURANT_STAFF'})`);
    // Find the restaurant — admin may be owner or co-admin
    let restaurantId: number | undefined;
    const owned = await this.prisma.restaurant.findUnique({
      where: { ownerId: adminId },
      select: { id: true },
    });
    if (owned) {
      restaurantId = owned.id;
    } else {
      const account = await this.prisma.userAccount.findUnique({
        where: { id: adminId },
        select: { managedRestaurantId: true },
      });
      if (account?.managedRestaurantId) restaurantId = account.managedRestaurantId;
    }
    if (!restaurantId) {
      throw new ForbiddenException('No restaurant linked to your account');
    }
    const role: UserRole =
      dto.role === UserRole.RESTAURANT_STAFF || dto.role === UserRole.RESTAURANT_ADMIN
        ? dto.role
        : UserRole.RESTAURANT_STAFF;

    return this.create({ ...dto, role, managedRestaurantId: restaurantId });
  }

  async findStaffByOwner(adminId: number) {
    this.logger.log(`Fetching staff for restaurant administered by account ${adminId}`);
    let restaurantId: number | undefined;
    const owned = await this.prisma.restaurant.findUnique({
      where: { ownerId: adminId },
      select: { id: true },
    });
    if (owned) {
      restaurantId = owned.id;
    } else {
      const account = await this.prisma.userAccount.findUnique({
        where: { id: adminId },
        select: { managedRestaurantId: true },
      });
      if (account?.managedRestaurantId) restaurantId = account.managedRestaurantId;
    }
    if (!restaurantId) return [];
    return this.prisma.userAccount.findMany({
      where: { managedRestaurantId: restaurantId },
      select: { id: true, username: true, role: true, isActive: true, createdAt: true },
    });
  }

  async findTeamForStaff(staffId: number) {
    this.logger.log(`Fetching team for staff account ${staffId}`);
    const account = await this.prisma.userAccount.findUnique({
      where: { id: staffId },
      select: { managedRestaurantId: true },
    });
    if (!account?.managedRestaurantId) return [];
    return this.prisma.userAccount.findMany({
      where: { managedRestaurantId: account.managedRestaurantId },
      select: { id: true, username: true, role: true, isActive: true, createdAt: true },
    });
  }

  async findOneByUsername(username: string) {
    this.logger.log(`Fetching user account with username: ${username}`);
    try {
      const userAccount = await this.prisma.userAccount.findUnique({
        where: { username },
      });
      this.logger.log(
        `Successfully fetched user account with username: ${username}`,
      );
      return userAccount;
    } catch (error) {
      this.logger.error(
        `Failed to fetch user account with username: ${username}`,
        error.stack,
      );
      throw error;
    }
  }

  async findAll() {
    this.logger.log('Fetching all user accounts');
    try {
      const userAccounts = await this.prisma.userAccount.findMany({
        select: { id:true, username: true, role: true, isActive: true, createdAt:true },
      });
      this.logger.log('Successfully fetched all user accounts');
      return userAccounts;
    } catch (error) {
      this.logger.error('Failed to fetch all user accounts', error.stack);
      throw error;
    }
  }

  async update(id: number, data: any) {
    this.logger.log(`Updating user account with ID: ${id}`);
    try {
      const updatedUserAccount = await this.prisma.userAccount.update({
        where: { id },
        data: { ...data },
      });
      this.logger.log(`Successfully updated user account with ID: ${id}`);
      return updatedUserAccount;
    } catch (error) {
      this.logger.error(
        `Failed to update user account with ID: ${id}`,
        error.stack,
      );
      throw error;
    }
  }

  async remove(id: number) {
    this.logger.log(`Removing user account with ID: ${id}`);
    try {
      const result = await this.prisma.userAccount.delete({
        where: { id },
      });
      this.logger.log(`Successfully removed user account with ID: ${id}`);
      return result;
    } catch (error) {
      this.logger.error(
        `Failed to remove user account with ID: ${id}`,
        error.stack,
      );
      throw error;
    }
  }

  async updateRTHash(id: number, rt: string) {
    this.logger.log(
      `Updating refresh token hash for user account with ID: ${id}`,
    );
    try {
      const hash = await hashPassword(rt);
      await this.prisma.userAccount.update({
        where: { id },
        data: {
          hashedRT: hash,
        },
      });
      this.logger.log(
        `Successfully updated refresh token hash for user account with ID: ${id}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to update refresh token hash for user account with ID: ${id}`,
        error.stack,
      );
      throw error;
    }
  }

  async changePassword(changePasswordDTO: ChangePasswordDTO) {
    this.logger.log(
      `Changing password for user with username: ${changePasswordDTO.username}`,
    );
    try {
      const user = await this.findOneByUsername(changePasswordDTO.username);
      if (!user) throw new ForbiddenException('Invalid Username');

      const passwordMatches = await bcrypt.compare(
        changePasswordDTO.oldPassword,
        user.password,
      );
      if (!passwordMatches) {
        throw new UnauthorizedException('Passwords do not match');
      }

      const changedPassword = await this.prisma.userAccount.update({
        where: {
          id: user.id,
        },
        data: {
          password: await hashPassword(changePasswordDTO.newPassword),
        },
      });

      if (!changedPassword) {
        throw new UnprocessableEntityException('Unable to change password');
      } else {
        this.logger.log(
          `Successfully changed password for user with username: ${changePasswordDTO.username}`,
        );
        return { message: 'success' };
      }
    } catch (error) {
      this.logger.error(
        `Failed to change password for user with username: ${changePasswordDTO.username}`,
        error.stack,
      );
      throw error;
    }
  }
}
