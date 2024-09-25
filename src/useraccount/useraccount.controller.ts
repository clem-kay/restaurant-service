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
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiTags,
  ApiUnprocessableEntityResponse,ApiBody,ApiParam,ApiOperation
} from '@nestjs/swagger';
import { UseraccountService } from './useraccount.service';
import { CreateUseraccountDto } from './dto/create-useraccount.dto';
import { DoesUserExist } from 'src/guards/doesUserExist.guard';
import { UpdateUseraccountDto } from './dto/update-useraccount.dto';
import { ChangePasswordDTO } from 'src/auth/dto/LoginDto';
import { NotFoundError, retry } from 'rxjs';

@ApiTags('UserAccount')
@Controller('useraccount')
export class UseraccountController {
  constructor(private readonly useraccountService: UseraccountService) {}

  @Post()
  @UseGuards(DoesUserExist)
  @HttpCode(HttpStatus.CREATED)
  @ApiOkResponse({ description: 'User created successfully' })
  @ApiUnprocessableEntityResponse({ description: 'Invalid data provided' })
  @ApiForbiddenResponse({ description: 'Unauthorized request' })
  async create(@Body() createUseraccountDto: CreateUseraccountDto) {
    return this.useraccountService.create(createUseraccountDto);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ description: 'List of all users retrieved' })
  @ApiUnprocessableEntityResponse({ description: 'Invalid request' })
  @ApiForbiddenResponse({ description: 'Unauthorized request' })
  async findAll() {
    return this.useraccountService.findAll();
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ description: 'User details retrieved successfully' })
  @ApiUnprocessableEntityResponse({ description: 'Invalid user ID' })
  @ApiForbiddenResponse({ description: 'Unauthorized request' })
  async findOne(@Param('id') id: string) {
    const user =  await this.useraccountService.findOneById(+id);
    if (user){
      return {
        id:user.id,
        username:user.username,
        isActive:user.isActive,
        role:user.role
      }
    }else{
        throw new NotFoundException("User Not found")
      }
  }

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ description: 'User details updated successfully' })
  @ApiUnprocessableEntityResponse({ description: 'Invalid data provided' })
  @ApiForbiddenResponse({ description: 'Unauthorized request' })
  async update(
    @Param('id') id: string,
    @Body() updateUseraccountDto: UpdateUseraccountDto,
  ) {
    return this.useraccountService.update(+id, updateUseraccountDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOkResponse({ description: 'User deleted successfully' })
  @ApiUnprocessableEntityResponse({ description: 'Invalid user ID' })
  @ApiForbiddenResponse({ description: 'Unauthorized request' })
  async remove(@Param('id') id: string) {
    return this.useraccountService.remove(+id);
  }

  @Put('/activate/:id')
@HttpCode(HttpStatus.OK)
@ApiOperation({ summary: 'Activate or deactivate a user account' }) // Add operation summary
@ApiOkResponse({ description: 'User activated/deactivated successfully' })
@ApiUnprocessableEntityResponse({ description: 'Invalid data provided' })
@ApiForbiddenResponse({ description: 'Unauthorized request' })
@ApiParam({
  name: 'id',
  required: true,
  type: Number,
  description: 'ID of the user account to activate/deactivate'
})
@ApiBody({
  schema: {
    type: 'object',
    properties: {
      isActive: {
        type: 'boolean',
        description: 'Set to true to activate, or false to deactivate the user account',
        example: true,
      },
    },
    required: ['isActive'],
  },
})
async activate(
  @Param('id') id: number,
  @Body() body: { isActive: boolean },
) {
  return this.useraccountService.activate(id, body);
}

  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ description: 'Password changed successfully' })
  @ApiUnprocessableEntityResponse({ description: 'Invalid data provided' })
  @ApiForbiddenResponse({ description: 'Unauthorized request' })
  changePassword(@Body() changePasswordDTO: ChangePasswordDTO) {
    return this.useraccountService.changePassword(changePasswordDTO);
  }
}
