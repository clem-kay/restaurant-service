import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'src/prisma/prisma.service';

type JwtPayload = {
  sub: string;
  username: string;
  role?: string;
};

@Injectable()
export class ATStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: configService.get<string>('AT_SECRET'),
    });
  }

  async validate(payload: JwtPayload) {
    if (payload.role) return payload;
    // Backward compat: tokens issued before role was added to the JWT
    const user = await this.prisma.userAccount.findUnique({
      where: { id: +payload.sub },
      select: { role: true },
    });
    return { ...payload, role: user?.role };
  }
}
