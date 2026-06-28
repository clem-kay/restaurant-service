import {
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LoginDto } from './dto/LoginDto';
import * as bcrypt from 'bcrypt';
import { UseraccountService } from 'src/useraccount/useraccount.service';
import { JwtService } from '@nestjs/jwt';
import { Tokens, SignIn } from 'src/types';

@Injectable()
export class AuthService {
  constructor(
    private readonly userAccountService: UseraccountService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}
  private readonly logger = new Logger(AuthService.name);

  async logout(userId: number) {
    await this.userAccountService.logout(userId);
  }

  async refreshTokens(userId: number, rt: string) {
    const user = await this.userAccountService.findOneById(userId);
    if (!user || !user.hashedRT) throw new ForbiddenException('Access Denied');

    const rtMatches = await bcrypt.compare(rt, user.hashedRT);
    if (!rtMatches) throw new ForbiddenException('Access Denied');

    const tokens = await this.getTokens(user.id, user.username);
    await this.userAccountService.updateRTHash(user.id, tokens.refresh_token);
    return tokens;
  }

  async login(loginDTO: LoginDto): Promise<SignIn> {
    this.logger.debug('login dto receieved for ' + loginDTO.username);
    const userAccount = await this.userAccountService.findOneByUsername(
      loginDTO.username.toLowerCase(),
    );
    if (!userAccount) {
      throw new UnauthorizedException('Username or password invalid');
    }
    const passwordMatches = await bcrypt.compare(
      loginDTO.password,
      userAccount.password,
    );
    if (!passwordMatches) {
      throw new UnauthorizedException('Username or password invalid');
    }

    if (userAccount.isActive) {
      const tokens = await this.getTokens(userAccount.id, userAccount.username);
      await this.userAccountService.updateRTHash(
        userAccount.id,
        tokens.refresh_token,
      );
      return {
        id: userAccount.id,
        ...tokens,
        username: userAccount.username,
        message: 'success',
        role: userAccount.role
      };
    } else {
      this.logger.debug(
        'login is uncessufull because ' + loginDTO.username + 'is blocked',
      );
      throw new UnauthorizedException('Account is blocked');
    }
  }

  async getTokens(userId: number, username: string): Promise<Tokens> {
    const [at, rt] = await Promise.all([
      this.jwtService.signAsync(
        { sub: userId, username },
        {
          secret: this.configService.get<string>('AT_SECRET'),
          expiresIn: 60 * 15,
        },
      ),
      this.jwtService.signAsync(
        { sub: userId, username },
        {
          secret: this.configService.get<string>('RT_SECRET'),
          expiresIn: 60 * 60 * 24 * 7,
        },
      ),
    ]);
    return { access_token: at, refresh_token: rt };
  }
}
