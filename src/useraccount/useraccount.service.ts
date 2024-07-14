import {
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
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
    this.logger.log(`Activating user account with ID: ${id}`);
    try {
      const result = await this.prisma.userAccount.update({
        where: { id },
        data: body,
      });
      this.logger.log(`Successfully activated user account with ID: ${id}`);
      return result;
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

  async create(userAccount: CreateUseraccountDto) {
    this.logger.log('Creating a new user account');
    try {
      const userCreated = await this.prisma.userAccount.create({
        data: {
          ...userAccount,
          username: userAccount.username.toLowerCase(),
          password: await hashPassword(userAccount.password),
        },
      });
      this.logger.log('Successfully created a new user account');
      return { user: userCreated, message: 'success' };
    } catch (error) {
      this.logger.error('Failed to create a new user account', error.stack);
      throw error;
    }
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
        select: { username: true, role: true, isActive: true },
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
