import { ExtractJwt, Strategy} from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';

type JwtPayload = {
   sub: string;
   username:string;
}

@Injectable()
export class ATStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(){
    super({
        jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
        secretOrKey: 'at-secret',
      });
  };

  validate(payload:JwtPayload){
    return payload;
  }
}
