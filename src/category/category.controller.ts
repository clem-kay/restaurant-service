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
import { CategoryService } from './category.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { AtGuard } from 'src/guards/at.guard';
import { RestaurantContextGuard } from 'src/guards/restaurant-context.guard';
import { GetUser } from 'src/core/decorators/get-user.decorator';

@ApiTags('Category')
@Controller('category')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  // ─── Restaurant Admin (restaurantId inferred from JWT) ────────────────────

  @Post()
  @UseGuards(AtGuard, RestaurantContextGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Create a food category (Restaurant Admin)',
    description: 'Creates a category scoped to the authenticated restaurant admin\'s restaurant. No restaurantId needed in the body.',
  })
  @ApiCreatedResponse({ description: 'Category successfully created.' })
  @ApiUnprocessableEntityResponse({ description: 'Bad Request' })
  @ApiForbiddenResponse({ description: 'No restaurant linked to this account' })
  create(
    @GetUser('restaurantId') restaurantId: number,
    @Body() dto: CreateCategoryDto,
  ) {
    return this.categoryService.create(restaurantId, dto);
  }

  @Get('mine')
  @UseGuards(AtGuard, RestaurantContextGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Get my restaurant\'s categories (Restaurant Admin)',
    description: 'Returns all categories for the authenticated restaurant admin\'s restaurant.',
  })
  @ApiOkResponse({ description: 'Categories for this restaurant.' })
  @ApiForbiddenResponse({ description: 'No restaurant linked to this account' })
  findMine(@GetUser('restaurantId') restaurantId: number) {
    return this.categoryService.findMine(restaurantId);
  }

  @Patch(':id')
  @UseGuards(AtGuard, RestaurantContextGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Update a category (Restaurant Admin)',
    description: 'Only the restaurant admin who owns the category can update it.',
  })
  @ApiOkResponse({ description: 'Category updated successfully.' })
  @ApiNotFoundResponse({ description: 'Category not found.' })
  @ApiForbiddenResponse({ description: 'Category does not belong to your restaurant' })
  update(
    @GetUser('restaurantId') restaurantId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.categoryService.update(restaurantId, id, dto);
  }

  @Delete(':id')
  @UseGuards(AtGuard, RestaurantContextGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Delete a category and all its menu items (Restaurant Admin)',
    description: 'Only the restaurant admin who owns the category can delete it.',
  })
  @ApiOkResponse({ description: 'Category deleted successfully.' })
  @ApiNotFoundResponse({ description: 'Category not found.' })
  @ApiForbiddenResponse({ description: 'Category does not belong to your restaurant' })
  remove(
    @GetUser('restaurantId') restaurantId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.categoryService.remove(restaurantId, id);
  }

  // ─── Public / Platform Admin ──────────────────────────────────────────────

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'List all categories',
    description: 'Public endpoint. Filter by restaurantId to get categories for a specific restaurant.',
  })
  @ApiOkResponse({ description: 'List of categories.' })
  @ApiQuery({ name: 'restaurantId', required: false, type: Number, description: 'Filter by restaurant' })
  findAll(@Query('restaurantId') restaurantId?: string) {
    return this.categoryService.findAll(restaurantId ? +restaurantId : undefined);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get a category by ID' })
  @ApiOkResponse({ description: 'Category retrieved successfully.' })
  @ApiNotFoundResponse({ description: 'Category not found.' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.categoryService.findOne(id);
  }
}
