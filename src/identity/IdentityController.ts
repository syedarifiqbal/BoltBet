import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Req,
  Res,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { IdentityService } from './identity.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AccessTokenResponseDto } from './dto/authResponse.dto';
import { Public } from '../auth/decorators/public.decorator';
import type { JwtPayload } from './types/identity.types';

/**
 * All routes here are prefixed with v1/auth by the module.
 *
 * POST /v1/auth/register  — create account, @Public
 * POST /v1/auth/login     — issue access token + set HttpOnly refresh cookie, @Public
 * POST /v1/auth/refresh   — rotate refresh token, issue new access token, @Public
 * POST /v1/auth/logout    — revoke refresh token, blacklist access token jti
 *
 * Controllers hold no business logic — they validate input, delegate to the
 * service, and shape the HTTP response. That's it.
 */
@Controller('v1/auth')
export class IdentityController {
  constructor(private readonly identityService: IdentityService) {}

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() dto: RegisterDto): Promise<void> {
    return this.identityService.register(dto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AccessTokenResponseDto> {
    return this.identityService.login(dto, req, res);
  }

  /**
   * @Public because the caller has no access token at this point —
   * they only have the HttpOnly refresh cookie. JwtAuthGuard must not
   * block this endpoint.
   */
  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AccessTokenResponseDto> {
    return this.identityService.refresh(req, res);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @Req() req: Request & { user: JwtPayload },
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    return this.identityService.logout(req.user, req, res);
  }
}
