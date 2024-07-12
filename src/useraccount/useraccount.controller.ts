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
} from '@nestjs/common';
import {
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiTags,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { UseraccountService } from './useraccount.service';
import { CreateUseraccountDto } from './dto/create-useraccount.dto';
import { DoesUserExist } from 'src/guards/doesUserExist.guard';
import { UpdateUseraccountDto } from './dto/update-useraccount.dto';
import { ChangePasswordDTO } from 'src/auth/dto/LoginDto';

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
    return this.useraccountService.findOneById(+id);
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

  @Put("/activate/:id")
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ description: 'User activated/deactivated successfully' })
  @ApiUnprocessableEntityResponse({ description: 'Invalid data provided' })
  @ApiForbiddenResponse({ description: 'Unauthorized request' })
  async activate(@Param('id') id:number, @Body() body: {isActive: boolean}){
    return this.useraccountService.activate(id,body);
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
