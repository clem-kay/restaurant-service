import {
  Body, Controller, HttpCode, HttpStatus, Logger, Post, Req, UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth, ApiBody, ApiOperation, ApiResponse, ApiTags,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/LoginDto';

@ApiTags('Auth')
@Controller('auth')
// Auth endpoints get a tighter rate limit than the global default
@Throttle({ short: { ttl: 60_000, limit: 10 }, medium: { ttl: 60_000, limit: 20 } })
export class AuthController {
  private readonly logger = new Logger(AuthController.name);
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Log in',
    description: 'Authenticates a user and returns an access token (15 min TTL) and a refresh token (7 day TTL).',
  })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 200,
    description: 'Login successful',
    schema: {
      example: {
        access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        refresh_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        id: 1,
        username: 'admin',
        role: 'RESTAURANT_ADMIN',
      },
    },
  })
  @ApiResponse({ status: 403, description: 'Invalid credentials' })
  async login(@Body() loginDto: LoginDto) {
    this.logger.log(`Login attempt for user: ${loginDto.username}`);
    return this.authService.login(loginDto);
  }

  @Post('logout')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Log out',
    description: 'Invalidates the current session by clearing the stored refresh token hash.',
  })
  @ApiResponse({ status: 200, description: 'Logged out successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized — invalid or expired access token' })
  logout(@Req() req: Request) {
    this.logger.log(`Logout for user id: ${req.user['sub']}`);
    return this.authService.logout(req.user['sub']);
  }

  @Post('refresh')
  @UseGuards(AuthGuard('jwt-refresh'))
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('refresh-token')
  @ApiOperation({
    summary: 'Refresh tokens',
    description: `Exchange a valid refresh token for a new access + refresh token pair.
**Send the refresh token in the \`Authorization: Bearer <refresh_token>\` header.**
Call this before the access token expires (every ~14 minutes) to keep the session alive.`,
  })
  @ApiResponse({
    status: 200,
    description: 'New token pair issued',
    schema: {
      example: {
        access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        refresh_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Refresh token invalid or expired — user must log in again' })
  refreshTokens(@Req() req: Request) {
    return this.authService.refreshTokens(req.user['sub'], req.user['refreshToken']);
  }
}
