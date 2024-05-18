import { ForbiddenException, Injectable } from '@nestjs/common';
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
  ) {}

  async logout(userId: number) {
    await this.userAccountService.logout(userId);
  }

  async refreshTokens(userId: number, rt: string) {
    const user = await this.userAccountService.findOneById(userId);
    if (!user) throw new ForbiddenException('Access Denied');

    const rtMatches = bcrypt.compare(rt, user.hashedRT);
    if (!rtMatches) throw new ForbiddenException('Access Denied');

    const tokens = await this.getTokens(user.id, user.username);
    await this.userAccountService.updateRTHash(user.id, tokens.refresh_token);
    return tokens;
  }

  async login(loginDTO: LoginDto): Promise<SignIn> {
    const userAccount = await this.userAccountService.findOneByUsername(
      loginDTO.username.toLowerCase(),
    );
    if (!userAccount) throw new ForbiddenException('Access Denied');
    const passwordMatches = await bcrypt.compare(
      loginDTO.password,
      userAccount.password,
    );
    if (!passwordMatches) throw new ForbiddenException('Access Denied');

    if (userAccount.isActive) {
      const tokens = await this.getTokens(userAccount.id, userAccount.username);
      await this.userAccountService.updateRTHash(
        userAccount.id,
        tokens.refresh_token,
      );
      return { ...tokens, username: userAccount.username };
    } else {
      throw new ForbiddenException('Account is blocked contact Admin');
    }
  }

  async getTokens(userId: number, username: string): Promise<Tokens> {
    const [at, rt] = await Promise.all([
      this.jwtService.signAsync(
        {
          sub: userId,
          username,
        },
        {
          secret: 'at-secret',
          expiresIn: 60 * 15,
        },
      ),
      this.jwtService.signAsync(
        {
          sub: userId,
          username,
        },
        {
          secret: 'rt-secret',
          expiresIn: 60 * 60 * 24 * 7,
        },
      ),
    ]);
    return { access_token: at, refresh_token: rt };
  }
}
