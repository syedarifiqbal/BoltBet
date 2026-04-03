import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  Req,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { Request } from 'express';
import { BettingService } from './BettingService';
import { PlaceBetDto } from './dto/PlaceBetDto';
import { BetResponseDto, BetListResponseDto } from './dto/BetResponseDto';
import type { JwtPayload } from '../identity/types/IdentityTypes';

/**
 * All routes require a valid JWT (JwtAuthGuard is global).
 * userId and role are always taken from the JWT — never from the request body.
 *
 * POST /v1/bets        — place a bet (USER + VIP_USER only)
 * GET  /v1/bets        — list the authenticated user's bets
 * GET  /v1/bets/:id    — get a single bet (owner or ADMIN)
 */
@Controller('v1/bets')
export class BettingController {
  constructor(private readonly bettingService: BettingService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  placeBet(
    @Req() req: Request & { user: JwtPayload },
    @Body() dto: PlaceBetDto,
  ): Promise<BetResponseDto> {
    return this.bettingService.placeBet(req.user.sub, req.user.role, dto);
  }

  @Get()
  getBets(
    @Req() req: Request & { user: JwtPayload },
    @Query('page',  new DefaultValuePipe(1),  ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ): Promise<BetListResponseDto> {
    const safeLimit = Math.min(limit, 100);
    return this.bettingService.getBets(req.user.sub, page, safeLimit);
  }

  @Get(':id')
  getBetById(
    @Req() req: Request & { user: JwtPayload },
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<BetResponseDto> {
    return this.bettingService.getBetById(req.user.sub, req.user.role, id);
  }
}
