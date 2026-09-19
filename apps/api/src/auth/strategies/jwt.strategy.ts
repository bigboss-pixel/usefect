import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import {
  ExtractJwt,
  Strategy,
} from 'passport-jwt';
import type { Request } from 'express';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
  (request: Request) => {
    return request?.cookies?.accessToken ?? null;
  },
  ExtractJwt.fromAuthHeaderAsBearerToken(),
]),
      ignoreExpiration: false,
      secretOrKey: process.env['JWT_SECRET']!,
    });
  }

  async validate(payload: {
    sub: number;
    email: string;
  }) {
    return {
      userId: payload.sub,
      email: payload.email,
    };
  }
}