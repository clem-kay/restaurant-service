import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
  Query,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
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
import { CreateFoodmenuDto, UpdateFoodmenuDto } from './dto/create-foodmenu.dto';
import { AtGuard } from 'src/guards/at.guard';
import { RestaurantContextGuard } from 'src/guards/restaurant-context.guard';
import { GetUser } from 'src/core/decorators/get-user.decorator';

@ApiTags('FoodMenu')
@Controller('foodmenu')
export class FoodmenuController {
  constructor(private readonly foodmenuService: FoodmenuService) {}

  // ─── Restaurant Admin (restaurantId inferred from JWT) ────────────────────

  @Post()
  @UseGuards(AtGuard, RestaurantContextGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Create a menu item (Restaurant Admin)',
    description: 'Creates a menu item scoped to the authenticated restaurant. No restaurantId needed in the body.',
  })
  @ApiCreatedResponse({ description: 'Menu item successfully created.' })
  @ApiUnprocessableEntityResponse({ description: 'Bad Request' })
  @ApiForbiddenResponse({ description: 'No restaurant linked to this account' })
  create(
    @GetUser('restaurantId') restaurantId: number,
    @Body() dto: CreateFoodmenuDto,
  ) {
    return this.foodmenuService.create(restaurantId, dto);
  }

  @Get('mine')
  @UseGuards(AtGuard, RestaurantContextGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Get my restaurant\'s menu items (Restaurant Admin)',
    description: 'Returns all menu items for the authenticated restaurant.',
  })
  @ApiOkResponse({ description: 'Menu items for this restaurant.' })
  @ApiForbiddenResponse({ description: 'No restaurant linked to this account' })
  findMine(@GetUser('restaurantId') restaurantId: number) {
    return this.foodmenuService.findMine(restaurantId);
  }

  @Patch(':id')
  @UseGuards(AtGuard, RestaurantContextGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Update a menu item (Restaurant Admin)',
    description: 'Only the restaurant admin who owns the menu item can update it.',
  })
  @ApiOkResponse({ description: 'Menu item updated successfully.' })
  @ApiNotFoundResponse({ description: 'Menu item not found.' })
  @ApiForbiddenResponse({ description: 'Menu item does not belong to your restaurant' })
  update(
    @GetUser('restaurantId') restaurantId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateFoodmenuDto,
  ) {
    return this.foodmenuService.update(restaurantId, id, dto);
  }

  @Delete(':id')
  @UseGuards(AtGuard, RestaurantContextGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Delete a menu item (Restaurant Admin)',
    description: 'Only the restaurant admin who owns the menu item can delete it.',
  })
  @ApiOkResponse({ description: 'Menu item deleted successfully.' })
  @ApiNotFoundResponse({ description: 'Menu item not found.' })
  @ApiForbiddenResponse({ description: 'Menu item does not belong to your restaurant' })
  remove(
    @GetUser('restaurantId') restaurantId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.foodmenuService.remove(restaurantId, id);
  }

  // ─── Public / Platform Admin ──────────────────────────────────────────────

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List food menu items (filterable)' })
  @ApiOkResponse({ description: 'List of food menu items matching the filters.' })
  @ApiQuery({ name: 'isAvailable', required: false, type: Boolean })
  @ApiQuery({ name: 'restaurantId', required: false, type: Number })
  @ApiQuery({ name: 'categoryId', required: false, type: Number })
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

  @Get('get-by-category/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List food menu items by category' })
  @ApiOkResponse({ description: 'Food menu items for this category.' })
  @ApiQuery({ name: 'isAvailable', required: false, type: Boolean })
  findAllByCategory(
    @Param('id', ParseIntPipe) id: number,
    @Query('isAvailable') isAvailable?: string,
  ) {
    return this.foodmenuService.findAllByCategory(
      id,
      isAvailable !== undefined ? isAvailable === 'true' : undefined,
    );
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get a food menu item by ID' })
  @ApiOkResponse({ description: 'Menu item retrieved successfully.' })
  @ApiNotFoundResponse({ description: 'Menu item not found.' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.foodmenuService.findOne(id);
  }
}
