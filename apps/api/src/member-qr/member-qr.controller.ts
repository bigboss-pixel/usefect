import {
  Body,
  Controller,
  Get,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../auth/guards/permissions.guard.js';
import { Permissions } from '../auth/decorators/permissions.decorator.js';
import { MemberQrService } from './member-qr.service.js';
import { ValidateMemberQrDto } from './dto/validate-member-qr.dto.js';

@Controller('member-qr')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class MemberQrController {
  constructor(private readonly memberQrService: MemberQrService) {}

  @Get()
  @Permissions('MEMBER_QR_VIEW_OWN')
  getOwnQr(@Req() req: any) {
    return this.memberQrService.getOwnQr(req.user.userId);
  }

  @Post()
  @Permissions('MEMBER_QR_GENERATE')
  generateOwnQr(@Req() req: any) {
    return this.memberQrService.generateOwnQr(req.user.userId);
  }

  @Post('revoke')
  @Permissions('MEMBER_QR_GENERATE')
  revokeOwnQr(@Req() req: any) {
    return this.memberQrService.revokeOwnQr(req.user.userId);
  }

  @Post('validate')
  @Permissions('MEMBER_QR_VALIDATE')
  validateQr(@Body() dto: ValidateMemberQrDto) {
    return this.memberQrService.validateQr(dto.token);
  }
}
