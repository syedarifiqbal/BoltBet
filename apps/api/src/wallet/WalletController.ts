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
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { Request } from 'express';
import { WalletService } from './WalletService';
import { DepositDto } from './dto/DepositDto';
import { BalanceResponseDto } from './dto/BalanceResponseDto';
import {
  TransactionResponseDto,
  TransactionListResponseDto,
} from './dto/TransactionResponseDto';
import type { JwtPayload } from '../identity/types/IdentityTypes';

@ApiTags('Wallet')
@ApiBearerAuth()
@Controller('v1/wallet')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get('balance')
  @ApiOperation({ summary: "Get authenticated user's balance" })
  @ApiOkResponse({ type: BalanceResponseDto })
  getBalance(@Req() req: Request & { user: JwtPayload }): Promise<BalanceResponseDto> {
    return this.walletService.getBalance(req.user.sub);
  }

  @Post('deposit')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Deposit funds into wallet' })
  @ApiCreatedResponse({ type: TransactionResponseDto })
  deposit(
    @Req() req: Request & { user: JwtPayload },
    @Body() dto: DepositDto,
  ): Promise<TransactionResponseDto> {
    return this.walletService.deposit(req.user.sub, dto);
  }

  @Get('transactions')
  @ApiOperation({ summary: "List authenticated user's transaction history" })
  @ApiQuery({ name: 'page',  required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiOkResponse({ type: TransactionListResponseDto })
  getTransactions(
    @Req() req: Request & { user: JwtPayload },
    @Query('page',  new DefaultValuePipe(1),   ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20),  ParseIntPipe) limit: number,
  ): Promise<TransactionListResponseDto> {
    const safeLimit = Math.min(limit, 100);
    return this.walletService.getTransactions(req.user.sub, page, safeLimit);
  }
}
