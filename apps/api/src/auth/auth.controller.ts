import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';

import type { Response } from 'express';

import { AuthService } from './auth.service.js';

import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import {
  ForgotPasswordRequestDto,
  ForgotPasswordVerifyDto,
  ForgotPasswordResetDto,
} from './dto/forgot-password.dto.js';

import { Roles } from './decorators/roles.decorator.js';
import { Permissions } from './decorators/permissions.decorator.js';

import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import { RolesGuard } from './guards/roles.guard.js';
import { PermissionsGuard } from './guards/permissions.guard.js';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
  ) {}

  @Post('forgot-password/request')
  @HttpCode(HttpStatus.OK)
  async requestPasswordReset(
    @Body() dto: ForgotPasswordRequestDto,
  ) {
    return this.authService.requestPasswordReset(dto);
  }

  @Post('forgot-password/verify')
  @HttpCode(HttpStatus.OK)
  async verifyPasswordReset(
    @Body() dto: ForgotPasswordVerifyDto,
  ) {
    return this.authService.verifyPasswordReset(dto);
  }

  @Post('forgot-password/reset')
  @HttpCode(HttpStatus.OK)
  async resetPassword(
    @Body() dto: ForgotPasswordResetDto,
  ) {
    return this.authService.resetPassword(dto);
  }

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Body() registerDto: RegisterDto,
  ) {
    return this.authService.register(registerDto);
  }

  @Post('login')
@HttpCode(HttpStatus.OK)
async login(
  @Body() loginDto: LoginDto,
  @Res({ passthrough: true }) res: Response,
) {
  const result =
    await this.authService.login(loginDto);

  res.cookie(
    'accessToken',
    result.accessToken,
    {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      path: '/',
      maxAge: 24 * 60 * 60 * 1000,
    },
  );

  res.cookie(
    'refreshToken',
    result.refreshToken,
    {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    },
  );

  return {
    message: result.message,
    user: result.user,
  };
}

    @Post('refresh')
@HttpCode(HttpStatus.OK)
async refresh(
  @Req() req: any,
  @Res({ passthrough: true }) res: Response,
) {
  const refreshToken = req.cookies?.refreshToken;

  if (!refreshToken) {
    throw new UnauthorizedException(
      'Refresh token tidak ditemukan',
    );
  }

  const result =
    await this.authService.refreshTokens(
      refreshToken,
    );

  res.cookie('accessToken', result.accessToken, {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    path: '/',
    maxAge: 24 * 60 * 60 * 1000,
  });

  res.cookie('refreshToken', result.refreshToken, {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  return {
    message: result.message,
  };
}

@Post('logout')
@UseGuards(JwtAuthGuard)
@HttpCode(HttpStatus.OK)
async logout(
  @Req() req: any,
  @Res({ passthrough: true }) res: Response,
) {
  const result = await this.authService.logout(
    req.user.userId,
  );

  res.clearCookie('accessToken', {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    path: '/',
  });

  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    path: '/',
  });

  return result;
}

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  async profile(@Req() req: any) {
    return {
      message: 'Profile berhasil diakses',
      user: req.user,
    };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@Req() req: any) {
    return this.authService.me(
      req.user.userId,
    );
  }

  @Get('admin-test')
  @UseGuards(
    JwtAuthGuard,
    RolesGuard,
  )
  @Roles('ADMIN')
  async adminTest(@Req() req: any) {
    return {
      message: 'Selamat datang Admin',
      user: req.user,
    };
  }

  @Get('users-test')
  @UseGuards(
    JwtAuthGuard,
    PermissionsGuard,
  )
  @Permissions('USER_VIEW')
  async usersTest(@Req() req: any) {
    return {
      message:
        'Anda memiliki permission USER_VIEW',
      user: req.user,
    };
  }
}