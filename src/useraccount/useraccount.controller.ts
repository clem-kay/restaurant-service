import {
  Controller,
  Get,
  Post,
  Body,
  Put,
  Param,
  Delete,
  UseGuards,
  HttpCode,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiTags,
  ApiUnprocessableEntityResponse,
  ApiBody,
  ApiParam,
  ApiOperation,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { UseraccountService } from './useraccount.service';
import { CreateUseraccountDto } from './dto/create-useraccount.dto';
import { UpdateUseraccountDto } from './dto/update-useraccount.dto';
import { ChangePasswordDTO } from 'src/auth/dto/LoginDto';
import { AtGuard } from 'src/guards/at.guard';
import { RolesGuard } from 'src/guards/roles.guard';
import { Roles } from 'src/guards/roles.decorator';
import { DoesUserExist } from 'src/guards/doesUserExist.guard';
import { GetUser } from 'src/core/decorators/get-user.decorator';

@ApiTags('UserAccount')
@Controller('useraccount')
export class UseraccountController {
  constructor(private readonly useraccountService: UseraccountService) {}

  @Post()
  @UseGuards(AtGuard, RolesGuard, DoesUserExist)
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.RESTAURANT_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth('access-token')
  @ApiOkResponse({ description: 'User created successfully' })
  @ApiUnprocessableEntityResponse({ description: 'Invalid data provided' })
  @ApiForbiddenResponse({ description: 'Unauthorized request' })
  async create(
    @Body() dto: CreateUseraccountDto,
    @GetUser('sub') requesterId: number,
    @GetUser('role') requesterRole: string,
  ) {
    if (requesterRole === UserRole.RESTAURANT_ADMIN) {
      return this.useraccountService.createManagedAccount(requesterId, dto);
    }
    return this.useraccountService.create(dto);
  }

  @Get()
  @UseGuards(AtGuard, RolesGuard)
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.RESTAURANT_ADMIN, UserRole.RESTAURANT_STAFF)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @ApiOkResponse({ description: 'List of users retrieved' })
  @ApiForbiddenResponse({ description: 'Unauthorized request' })
  async findAll(
    @GetUser('sub') requesterId: number,
    @GetUser('role') requesterRole: string,
  ) {
    if (requesterRole === UserRole.RESTAURANT_STAFF) {
      return this.useraccountService.findTeamForStaff(requesterId);
    }
    if (requesterRole === UserRole.RESTAURANT_ADMIN) {
      return this.useraccountService.findStaffByOwner(requesterId);
    }
    return this.useraccountService.findAll();
  }

  @Put('/activate/:id')
  @UseGuards(AtGuard, RolesGuard)
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.RESTAURANT_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Activate or deactivate a user account' })
  @ApiOkResponse({ description: 'User activated/deactivated successfully' })
  @ApiUnprocessableEntityResponse({ description: 'Invalid data provided' })
  @ApiForbiddenResponse({ description: 'Unauthorized request' })
  @ApiParam({ name: 'id', required: true, type: Number, description: 'ID of the user account' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: { isActive: { type: 'boolean', example: true } },
      required: ['isActive'],
    },
  })
  async activate(@Param('id') id: string, @Body() body: { isActive: boolean }) {
    return this.useraccountService.activate(+id, body);
  }

  @Get(':id')
  @UseGuards(AtGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @ApiOkResponse({ description: 'User details retrieved successfully' })
  @ApiUnprocessableEntityResponse({ description: 'Invalid user ID' })
  @ApiForbiddenResponse({ description: 'Unauthorized request' })
  async findOne(@Param('id') id: string) {
    const user = await this.useraccountService.findOneById(+id);
    if (!user) throw new NotFoundException('User not found');
    return { id: user.id, username: user.username, isActive: user.isActive, role: user.role };
  }

  @Put(':id')
  @UseGuards(AtGuard, RolesGuard)
  @Roles(UserRole.PLATFORM_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @ApiOkResponse({ description: 'User updated successfully' })
  @ApiUnprocessableEntityResponse({ description: 'Invalid data provided' })
  @ApiForbiddenResponse({ description: 'Unauthorized request' })
  async update(@Param('id') id: string, @Body() dto: UpdateUseraccountDto) {
    return this.useraccountService.update(+id, dto);
  }

  @Delete(':id')
  @UseGuards(AtGuard, RolesGuard)
  @Roles(UserRole.PLATFORM_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('access-token')
  @ApiOkResponse({ description: 'User deleted successfully' })
  @ApiUnprocessableEntityResponse({ description: 'Invalid user ID' })
  @ApiForbiddenResponse({ description: 'Unauthorized request' })
  async remove(@Param('id') id: string) {
    return this.useraccountService.remove(+id);
  }

  @Post('change-password')
  @UseGuards(AtGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @ApiOkResponse({ description: 'Password changed successfully' })
  @ApiUnprocessableEntityResponse({ description: 'Invalid data provided' })
  @ApiForbiddenResponse({ description: 'Unauthorized request' })
  changePassword(@Body() dto: ChangePasswordDTO) {
    return this.useraccountService.changePassword(dto);
  }
}
