import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';

import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey:
        configService.get<string>('JWT_SECRET') ?? 'your_jwt_secret_key',
    });
  }

  validate(payload: {
    sub: string;
    email: string;
    department: string;
    yearOfStudy: number;
  }) {
    return {
      id: payload.sub,
      email: payload.email,
      department: payload.department,
      yearOfStudy: payload.yearOfStudy,
    };
  }
}
