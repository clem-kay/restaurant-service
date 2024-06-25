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
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ description: 'User Creation' })
  @ApiUnprocessableEntityResponse({ description: 'Bad Request' })
  @ApiForbiddenResponse({ description: 'Unauthorized Request' })
  async create(@Body() createUseraccountDto: CreateUseraccountDto) {
    return this.useraccountService.create(createUseraccountDto);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ description: 'Getting all users' })
  @ApiUnprocessableEntityResponse({ description: 'Bad Request' })
  @ApiForbiddenResponse({ description: 'Unauthorized Request' })
  async findAll() {
    return this.useraccountService.findAll();
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ description: 'Getting a single user' })
  @ApiUnprocessableEntityResponse({ description: 'Bad Request' })
  @ApiForbiddenResponse({ description: 'Unauthorized Request' })
  async findOne(@Param('id') id: string) {
    return this.useraccountService.findOneById(+id);
  }

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ description: 'Updating a single user' })
  @ApiUnprocessableEntityResponse({ description: 'Bad Request' })
  @ApiForbiddenResponse({ description: 'Unauthorized Request' })
  async update(
    @Param('id') id: string,
    @Body() updateUseraccountDto: UpdateUseraccountDto,
  ) {
    return this.useraccountService.update(+id, updateUseraccountDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ description: 'Deleting a user' })
  @ApiUnprocessableEntityResponse({ description: 'Bad Request' })
  @ApiForbiddenResponse({ description: 'Unauthorized Request' })
  async remove(@Param('id') id: string) {
    return this.useraccountService.remove(+id);
  }

  @Put("/activate/:id")
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ description: 'activating/deactivating a user' })
  @ApiUnprocessableEntityResponse({ description: 'Bad Request' })
  @ApiForbiddenResponse({ description: 'Unauthorized Request' })
  async activate(@Param('id') id:number, @Body() body: {isActive: boolean}){
  return this.useraccountService.activate(id,body) 
  }

  @Put('change-password')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ description: 'Changing password' })
  @ApiUnprocessableEntityResponse({ description: 'Bad Request' })
  @ApiForbiddenResponse({ description: 'Unauthorized Request' })
  changePassword(@Body() changePasswordDTO: ChangePasswordDTO) {
    return this.useraccountService.changePassword(changePasswordDTO);
  }
}
