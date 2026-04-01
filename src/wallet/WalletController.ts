import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Req,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { Request } from 'express';
import { WalletService } from './WalletService';
import { DepositDto } from './dto/DepositDto';
import { BalanceResponseDto } from './dto/BalanceResponseDto';
import {
  TransactionResponseDto,
  TransactionListResponseDto,
} from './dto/TransactionResponseDto';
import type { JwtPayload } from '../identity/types/IdentityTypes';

/**
 * All routes require a valid JWT (JwtAuthGuard is global).
 * userId is always taken from the JWT — never from the request body.
 * This prevents a user from querying another user's wallet.
 */
@Controller('v1/wallet')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get('balance')
  getBalance(@Req() req: Request & { user: JwtPayload }): Promise<BalanceResponseDto> {
    return this.walletService.getBalance(req.user.sub);
  }

  @Post('deposit')
  @HttpCode(HttpStatus.CREATED)
  deposit(
    @Req() req: Request & { user: JwtPayload },
    @Body() dto: DepositDto,
  ): Promise<TransactionResponseDto> {
    return this.walletService.deposit(req.user.sub, dto);
  }

  @Get('transactions')
  getTransactions(
    @Req() req: Request & { user: JwtPayload },
    @Query('page',  new DefaultValuePipe(1),   ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20),  ParseIntPipe) limit: number,
  ): Promise<TransactionListResponseDto> {
    const safeLimt = Math.min(limit, 100); // cap at 100 per page
    return this.walletService.getTransactions(req.user.sub, page, safeLimt);
  }
}
