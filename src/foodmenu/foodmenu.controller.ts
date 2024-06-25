import {
  Controller,
  Get,
  Post,
  Body,
  Put,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiTags,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { FoodmenuService } from './foodmenu.service';
import { CreateFoodmenuDto } from './dto/create-foodmenu.dto';

@ApiTags('UserAccount')
@Controller('foodmenu')
export class FoodmenuController {
  constructor(private readonly foodmenuService: FoodmenuService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOkResponse({ description: 'User Creation' })
  @ApiUnprocessableEntityResponse({ description: 'Bad Request' })
  @ApiForbiddenResponse({ description: 'Unauthorized Request' })
  create(@Body() createFoodmenuDto: CreateFoodmenuDto) {
    return this.foodmenuService.create(createFoodmenuDto);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
@ApiOkResponse({ description: 'User Creation' })
@ApiUnprocessableEntityResponse({ description: 'Bad Request' })
@ApiForbiddenResponse({ description: 'Unauthorized Request' })
  findAll() {
    return this.foodmenuService.findAll();
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ description: 'User Creation' })
  @ApiUnprocessableEntityResponse({ description: 'Bad Request' })
  @ApiForbiddenResponse({ description: 'Unauthorized Request' })
  findOne(@Param('id') id: string) {
    return this.foodmenuService.findOne(+id);
  }

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ description: 'User Creation' })
  @ApiUnprocessableEntityResponse({ description: 'Bad Request' })
  @ApiForbiddenResponse({ description: 'Unauthorized Request' })
  update(
    @Param('id') id: string,
    @Body() updateFoodmenuDto: CreateFoodmenuDto,
  ) {
    return this.foodmenuService.update(+id, updateFoodmenuDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOkResponse({ description: 'User Creation' })
  @ApiUnprocessableEntityResponse({ description: 'Bad Request' })
  @ApiForbiddenResponse({ description: 'Unauthorized Request' })
  remove(@Param('id') id: string) {
    return this.foodmenuService.remove(+id);
  }
  @Get('get-by-category/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ description: 'User Creation' })
  @ApiUnprocessableEntityResponse({ description: 'Bad Request' })
  @ApiForbiddenResponse({ description: 'Unauthorized Request' })
  findAllByCategory(@Param('id') id: string) {
    return this.foodmenuService.findAllByCategory(+id);
  }
}
