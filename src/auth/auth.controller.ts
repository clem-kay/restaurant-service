import { Body, Controller, Logger, Post, Req, UseGuards,HttpCode, HttpStatus, } from '@nestjs/common';
import { AuthService } from './auth.service';
import { ApiForbiddenResponse, ApiOkResponse, ApiTags, ApiUnprocessableEntityResponse } from '@nestjs/swagger';
import { LoginDto } from './dto/LoginDto';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';


@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);  
  constructor(private readonly authService: AuthService) {}

 
  @Post('login')
  @ApiOkResponse({ description: 'Logged in successfully' })
  @ApiUnprocessableEntityResponse({ description: 'Bad Request' })
  @ApiForbiddenResponse({ description: 'Unauthorized Request' })
  async login(@Body() loginDto:LoginDto){
    const response =  await this.authService.login(loginDto)
    return {
      message: 'sucess',
      data: response
    };
  }
  @UseGuards(AuthGuard('jwt'))
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout(@Req() req: Request) {
    const user = req.user
    return this.authService.logout(user['sub']);
  }
  @UseGuards(AuthGuard('jwt-refresh'))
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refreshTokens(@Req() req: Request) {
    const user = req.user
  
    return this.authService.refreshTokens(user['sub'],user['refreshToken']);
  }
}
