import 'dotenv/config';

import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

import { AuthService } from './auth.service.js';
import { AuthController } from './auth.controller.js';

import { JwtStrategy } from './strategies/jwt.strategy.js';

import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import { RolesGuard } from './guards/roles.guard.js';
import { PermissionsGuard } from './guards/permissions.guard.js';
import { MailModule } from '../mail/mail.module.js';


@Module({
  imports: [
    MailModule,

    PassportModule.register({
      defaultStrategy: 'jwt',
    }),

    JwtModule.register({
      secret: process.env['JWT_SECRET'],
      signOptions: {
        expiresIn: '1d',
      },
    }),
  ],

 providers: [
  AuthService,
  JwtStrategy,
  JwtAuthGuard,
  RolesGuard,
  PermissionsGuard,
],

  controllers: [AuthController],

  exports: [
  PassportModule,
  JwtModule,
  JwtAuthGuard,
  RolesGuard,
  PermissionsGuard,
],
})
export class AuthModule {}