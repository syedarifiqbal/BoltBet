import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
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
  ApiUnprocessableEntityResponse,
  ApiForbiddenResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { MarketService } from './MarketService';
import { CreateMarketDto } from './dto/CreateMarketDto';
import { SettleMarketDto } from './dto/SettleMarketDto';
import { MarketResponseDto, MarketListResponseDto } from './dto/MarketResponseDto';
import { MarketStatus } from './types/MarketTypes';
import { Roles } from '../auth/decorators/RolesDecorator';
import { Role } from '../identity/types/IdentityTypes';

@ApiTags('Markets')
@ApiBearerAuth()
@Controller('v1/markets')
export class MarketController {
  constructor(private readonly marketService: MarketService) {}

  // ── Public reads (any authenticated user) ─────────────────────────────────

  @Get()
  @ApiOperation({ summary: 'List markets', description: 'Paginated list of markets. Filter by status to show only OPEN markets.' })
  @ApiQuery({ name: 'page',   required: false, example: 1 })
  @ApiQuery({ name: 'limit',  required: false, example: 20 })
  @ApiQuery({ name: 'status', required: false, enum: MarketStatus })
  @ApiOkResponse({ type: MarketListResponseDto })
  list(
    @Query('page',   new DefaultValuePipe(1),  ParseIntPipe) page: number,
    @Query('limit',  new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('status') status?: MarketStatus,
  ): Promise<MarketListResponseDto> {
    const safeLimit = Math.min(limit, 100);
    return this.marketService.list(page, safeLimit, status);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get market by ID' })
  @ApiOkResponse({ type: MarketResponseDto })
  @ApiNotFoundResponse({ description: 'Market not found' })
  getMarket(@Param('id', ParseUUIDPipe) id: string): Promise<MarketResponseDto> {
    return this.marketService.getMarket(id);
  }

  // ── Admin-only mutations ───────────────────────────────────────────────────

  @Post()
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create market (ADMIN only)' })
  @ApiCreatedResponse({ type: MarketResponseDto })
  @ApiForbiddenResponse({ description: 'Requires ADMIN role' })
  create(@Body() dto: CreateMarketDto): Promise<MarketResponseDto> {
    return this.marketService.createMarket(dto);
  }

  @Patch(':id/suspend')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Suspend market — pauses new bets (ADMIN only)' })
  @ApiOkResponse({ type: MarketResponseDto })
  @ApiUnprocessableEntityResponse({ description: 'Market is already SETTLED' })
  @ApiForbiddenResponse({ description: 'Requires ADMIN role' })
  suspend(@Param('id', ParseUUIDPipe) id: string): Promise<MarketResponseDto> {
    return this.marketService.updateStatus(id, MarketStatus.SUSPENDED);
  }

  @Patch(':id/settle')
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Settle market (ADMIN only)',
    description:
      'Marks the market as SETTLED and processes all ACCEPTED bets. ' +
      'WIN — pays out payoutCents to every bettor. ' +
      'LOSS — settles all bets with no payout (stake was already debited at placement).',
  })
  @ApiOkResponse({ type: MarketResponseDto })
  @ApiUnprocessableEntityResponse({ description: 'Market is already SETTLED' })
  @ApiForbiddenResponse({ description: 'Requires ADMIN role' })
  settle(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SettleMarketDto,
  ): Promise<MarketResponseDto> {
    return this.marketService.settle(id, dto.result);
  }

  @Patch(':id/reopen')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Reopen a suspended market (ADMIN only)' })
  @ApiOkResponse({ type: MarketResponseDto })
  @ApiUnprocessableEntityResponse({ description: 'Market is already SETTLED' })
  @ApiForbiddenResponse({ description: 'Requires ADMIN role' })
  reopen(@Param('id', ParseUUIDPipe) id: string): Promise<MarketResponseDto> {
    return this.marketService.updateStatus(id, MarketStatus.OPEN);
  }
}
