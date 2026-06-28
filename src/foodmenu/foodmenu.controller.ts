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
  Query,
} from '@nestjs/common';
import {
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiTags,
  ApiUnprocessableEntityResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiQuery,
} from '@nestjs/swagger';
import { FoodmenuService } from './foodmenu.service';
import { CreateFoodmenuDto } from './dto/create-foodmenu.dto';

@ApiTags('FoodMenu')
@Controller('foodmenu')
export class FoodmenuController {
  constructor(private readonly foodmenuService: FoodmenuService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a food menu item' })
  @ApiCreatedResponse({ description: 'Food menu successfully created.' })
  @ApiUnprocessableEntityResponse({ description: 'Bad Request' })
  @ApiForbiddenResponse({ description: 'Unauthorized Request' })
  create(@Body() createFoodmenuDto: CreateFoodmenuDto) {
    return this.foodmenuService.create(createFoodmenuDto);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List food menu items (filterable)' })
  @ApiOkResponse({ description: 'List of food menu items matching the filters.' })
  @ApiUnprocessableEntityResponse({ description: 'Bad Request' })
  @ApiForbiddenResponse({ description: 'Unauthorized Request' })
  @ApiQuery({ name: 'isAvailable', required: false, type: Boolean, description: 'Filter by availability (true/false)' })
  @ApiQuery({ name: 'restaurantId', required: false, type: Number, description: 'Filter by restaurant' })
  @ApiQuery({ name: 'categoryId', required: false, type: Number, description: 'Filter by category' })
  findAll(
    @Query('isAvailable') isAvailable?: string,
    @Query('restaurantId') restaurantId?: string,
    @Query('categoryId') categoryId?: string,
  ) {
    return this.foodmenuService.findAll({
      isAvailable: isAvailable !== undefined ? isAvailable === 'true' : undefined,
      restaurantId: restaurantId ? +restaurantId : undefined,
      categoryId:   categoryId   ? +categoryId   : undefined,
    });
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get a food menu item by ID' })
  @ApiOkResponse({ description: 'Food menu retrieved successfully.' })
  @ApiNotFoundResponse({ description: 'Food menu not found.' })
  @ApiUnprocessableEntityResponse({ description: 'Bad Request' })
  @ApiForbiddenResponse({ description: 'Unauthorized Request' })
  findOne(@Param('id') id: string) {
    return this.foodmenuService.findOne(+id);
  }

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update a food menu item' })
  @ApiOkResponse({ description: 'Food menu updated successfully.' })
  @ApiNotFoundResponse({ description: 'Food menu not found.' })
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
  @ApiOperation({ summary: 'Delete a food menu item' })
  @ApiOkResponse({ description: 'Food menu deleted successfully.' })
  @ApiNotFoundResponse({ description: 'Food menu not found.' })
  @ApiUnprocessableEntityResponse({ description: 'Bad Request' })
  @ApiForbiddenResponse({ description: 'Unauthorized Request' })
  remove(@Param('id') id: string) {
    return this.foodmenuService.remove(+id);
  }

  @Get('get-by-category/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List food menu items by category (filterable)' })
  @ApiOkResponse({ description: 'Food menu items for this category.' })
  @ApiNotFoundResponse({ description: 'Category not found.' })
  @ApiUnprocessableEntityResponse({ description: 'Bad Request' })
  @ApiForbiddenResponse({ description: 'Unauthorized Request' })
  @ApiQuery({ name: 'isAvailable', required: false, type: Boolean, description: 'Filter by availability (true/false)' })
  findAllByCategory(
    @Param('id') id: string,
    @Query('isAvailable') isAvailable?: string,
  ) {
    return this.foodmenuService.findAllByCategory(
      +id,
      isAvailable !== undefined ? isAvailable === 'true' : undefined,
    );
  }
}
