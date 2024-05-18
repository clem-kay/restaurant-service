import {
  Controller,
  Get,
  Post,
  Body,
  Put,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { UseraccountService } from './useraccount.service';
import { CreateUseraccountDto } from './dto/create-useraccount.dto';
import { DoesUserExist } from 'src/guards/doesUserExist.guard';
import { UpdateUseraccountDto } from './dto/update-useraccount.dto';

@Controller('useraccount')
export class UseraccountController {
  constructor(private readonly useraccountService: UseraccountService) {}

  @Post()
  @UseGuards(DoesUserExist)
  async create(@Body() createUseraccountDto: CreateUseraccountDto) {
    return this.useraccountService.create(createUseraccountDto);
  }

  @Get()
  async findAll() {
    return this.useraccountService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.useraccountService.findOne(+id);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateUseraccountDto: UpdateUseraccountDto,
  ) {
    return this.useraccountService.update(+id, updateUseraccountDto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.useraccountService.remove(+id);
  }
  @Put("/activate/:id")
  async activate(@Param('id') id:number, @Body() body: {isActive: boolean}){
  return this.useraccountService.activate(id,body) 
  }
}
