import {
  Controller,
  Post,
  Patch,
  Body,
  Param,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { MarketService } from './MarketService';
import { CreateMarketDto } from './dto/CreateMarketDto';
import { MarketResponseDto } from './dto/MarketResponseDto';
import { MarketStatus } from './types/MarketTypes';
import { Roles } from '../auth/decorators/RolesDecorator';
import { Role } from '../identity/types/IdentityTypes';

/**
 * Admin-only endpoints for market management.
 *
 * POST  /v1/markets              — create a market
 * PATCH /v1/markets/:id/suspend  — suspend market (no more bets)
 * PATCH /v1/markets/:id/settle   — settle market (terminal state)
 * PATCH /v1/markets/:id/reopen   — reopen a suspended market
 */
@Controller('v1/markets')
export class MarketController {
  constructor(private readonly marketService: MarketService) {}

  @Post()
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateMarketDto): Promise<MarketResponseDto> {
    return this.marketService.createMarket(dto);
  }

  @Patch(':id/suspend')
  @Roles(Role.ADMIN)
  suspend(@Param('id', ParseUUIDPipe) id: string): Promise<MarketResponseDto> {
    return this.marketService.updateStatus(id, MarketStatus.SUSPENDED);
  }

  @Patch(':id/settle')
  @Roles(Role.ADMIN)
  settle(@Param('id', ParseUUIDPipe) id: string): Promise<MarketResponseDto> {
    return this.marketService.updateStatus(id, MarketStatus.SETTLED);
  }

  @Patch(':id/reopen')
  @Roles(Role.ADMIN)
  reopen(@Param('id', ParseUUIDPipe) id: string): Promise<MarketResponseDto> {
    return this.marketService.updateStatus(id, MarketStatus.OPEN);
  }
}
