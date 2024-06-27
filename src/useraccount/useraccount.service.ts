import {
  ForbiddenException,
  Injectable,
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
  constructor(private prisma: PrismaService) {}

  async activate(id: number, body: { isActive: boolean }) {
    return await this.prisma.userAccount.update({
      where: { id },
      data: body,
    });
  }
  async findOneById(id: number) {
    return await this.prisma.userAccount.findUnique({
      where: { id },
    });
  }
  async logout(userId: number) {
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
  }
  async create(userAccount: CreateUseraccountDto) {
    const userCreated =  await this.prisma.userAccount.create({
      data: {
        ...userAccount,
        username: userAccount.username.toLowerCase(),
        password: await hashPassword(userAccount.password),
      },
    });

    return {user:userCreated,message:"success"}
  }

  async findOneByUsername(username: string) {
    return await this.prisma.userAccount.findUnique({
      where: { username },
    });
  }

  async findAll() {
    return await this.prisma.userAccount.findMany({
      select: { username: true, role: true, isActive: true },
    });
  }

  async update(id: number, data: any) {
    return await this.prisma.userAccount.update({
      where: { id },
      data: { ...data },
    });
  }

  async remove(id: number) {
    return `This action removes a #${id} useraccount`;
  }

  async updateRTHash(id: number, rt: string) {
    const hash = await hashPassword(rt);
    await this.prisma.userAccount.update({
      where: { id },
      data: {
        hashedRT: hash,
      },
    });
  }

  async changePassword(changePasswordDTO: ChangePasswordDTO) {
  
      const user = await this.findOneByUsername(changePasswordDTO.username);
      console.log(user)
      if (!user) throw new ForbiddenException('Invalid Username');

      const passwordMatches = await bcrypt.compare(
        changePasswordDTO.oldPassword,
        user.password,
      );
      if (!passwordMatches) {
        throw new UnauthorizedException('Passwords do not match');
      }
  
      const changedPassword =  this.prisma.userAccount.update({
        where: {
          id: user.id,
        },
        data: {
          password: await hashPassword(changePasswordDTO.newPassword),
        },
      });

      if (!changedPassword){
          throw new UnprocessableEntityException("Unable to change passsword")
      }else {
        return {message:"success"}
      }
  }
}
