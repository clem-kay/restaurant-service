import { Injectable } from '@nestjs/common';
import { CreateUseraccountDto } from './dto/create-useraccount.dto';
import { UpdateUseraccountDto } from './dto/update-useraccount.dto';
import { hashPassword } from 'src/core/helpers';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class UseraccountService {
  
  constructor(private prisma: PrismaService) {}
  async findOneById(id: number) {
    return await this.prisma.userAccount.findUnique({
      where: { id },
    });
  }
  async logout(userId: number) {
    await this.prisma.userAccount.updateMany({
      where:{
        id:userId,hashedRT:{
          not: null
        },
      },
      data:{
        hashedRT:null
      }
    })
  }
  async create(userAccount: CreateUseraccountDto) {
    return await this.prisma.userAccount.create({
      data: {
        ...userAccount,
        username:userAccount.username.toLowerCase(),
        password: await hashPassword(userAccount.password),
      },
    });
  }

  
    async findOneByUsername(username: string) {
      return await this.prisma.userAccount.findUnique({
        where: { username },
      });
    }
  
  async findAll() {
    return await this.prisma.userAccount.findMany({
      select: { username: true, role: true,isActive:true },
    });
  }

  async findOne(id: number) {
    return `This action returns a #${id} useraccount`;
  }

  async update(id: number, data: any) {
        
    return await this.prisma.userAccount.update({
      where: {id},
        data: { ...data }
      } );
    
  }

  async  remove(id: number) {
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
}
