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
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiNotFoundResponse,
  ApiForbiddenResponse,
  ApiUnprocessableEntityResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { Request } from 'express';
import { BettingService } from './BettingService';
import { PlaceBetDto } from './dto/PlaceBetDto';
import { BetResponseDto, BetListResponseDto } from './dto/BetResponseDto';
import type { JwtPayload } from '../identity/types/IdentityTypes';

@ApiTags('Bets')
@ApiBearerAuth()
@Controller('v1/bets')
export class BettingController {
  constructor(private readonly bettingService: BettingService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Place a bet', description: 'USER and VIP_USER only. ADMIN cannot place bets.' })
  @ApiCreatedResponse({ type: BetResponseDto })
  @ApiUnprocessableEntityResponse({ description: 'Market not OPEN, or insufficient balance' })
  @ApiForbiddenResponse({ description: 'ADMIN role cannot place bets' })
  placeBet(
    @Req() req: Request & { user: JwtPayload },
    @Body() dto: PlaceBetDto,
  ): Promise<BetResponseDto> {
    return this.bettingService.placeBet(req.user.sub, req.user.role, dto);
  }

  @Get()
  @ApiOperation({ summary: "List authenticated user's bets" })
  @ApiQuery({ name: 'page',  required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiOkResponse({ type: BetListResponseDto })
  getBets(
    @Req() req: Request & { user: JwtPayload },
    @Query('page',  new DefaultValuePipe(1),  ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ): Promise<BetListResponseDto> {
    const safeLimit = Math.min(limit, 100);
    return this.bettingService.getBets(req.user.sub, page, safeLimit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a bet by ID', description: 'Owner or ADMIN only.' })
  @ApiOkResponse({ type: BetResponseDto })
  @ApiNotFoundResponse({ description: 'Bet not found' })
  @ApiForbiddenResponse({ description: 'Bet belongs to another user' })
  getBetById(
    @Req() req: Request & { user: JwtPayload },
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<BetResponseDto> {
    return this.bettingService.getBetById(req.user.sub, req.user.role, id);
  }
}
