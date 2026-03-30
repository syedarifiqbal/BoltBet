import {
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Market } from './entities/MarketEntity';
import { MarketStatus } from './types/MarketTypes';
import { CreateMarketDto } from './dto/CreateMarketDto';
import { MarketResponseDto, MarketListResponseDto } from './dto/MarketResponseDto';

@Injectable()
export class MarketService {
  private readonly logger = new Logger(MarketService.name);

  constructor(
    @InjectRepository(Market)
    private readonly marketRepo: Repository<Market>,
  ) {}

  async list(
    page: number,
    limit: number,
    status?: MarketStatus,
  ): Promise<MarketListResponseDto> {
    const where = status ? { status } : {};
    const [rows, total] = await this.marketRepo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip:  (page - 1) * limit,
      take:  limit,
    });
    return {
      markets: rows.map((m) => this.toDto(m)),
      total,
      page,
      limit,
    };
  }

  async getMarket(marketId: string): Promise<MarketResponseDto> {
    const market = await this.getMarketById(marketId);
    return this.toDto(market);
  }

  async createMarket(dto: CreateMarketDto): Promise<MarketResponseDto> {
    const market = this.marketRepo.create({
      eventId: dto.eventId,
      name:    dto.name,
      oddsInt: dto.oddsInt,
      status:  MarketStatus.OPEN,
    });
    const saved = await this.marketRepo.save(market);
    this.logger.log(`Market created: ${saved.id} (event ${saved.eventId})`);
    return this.toDto(saved);
  }

  async getMarketById(marketId: string): Promise<Market> {
    const market = await this.marketRepo.findOne({ where: { id: marketId } });
    if (!market) throw new NotFoundException(`Market ${marketId} not found`);
    return market;
  }

  async assertMarketOpen(marketId: string): Promise<Market> {
    const market = await this.getMarketById(marketId);
    if (market.status !== MarketStatus.OPEN) {
      throw new UnprocessableEntityException(
        `Market ${marketId} is ${market.status} — bets are not accepted`,
      );
    }
    return market;
  }

  async updateStatus(marketId: string, status: MarketStatus): Promise<MarketResponseDto> {
    const market = await this.getMarketById(marketId);
    if (market.status === MarketStatus.SETTLED) {
      throw new UnprocessableEntityException('Cannot change status of a settled market');
    }
    market.status = status;
    const saved = await this.marketRepo.save(market);
    this.logger.log(`Market ${marketId} status → ${status}`);
    return this.toDto(saved);
  }

  private toDto(market: Market): MarketResponseDto {
    return {
      id:          market.id,
      eventId:     market.eventId,
      name:        market.name,
      oddsInt:     market.oddsInt,
      oddsDisplay: this.formatOdds(market.oddsInt),
      status:      market.status,
      createdAt:   market.createdAt,
      updatedAt:   market.updatedAt,
    };
  }

  /** Formats oddsInt back to decimal display string. 240 → "2.40" */
  private formatOdds(oddsInt: number): string {
    return (oddsInt / 100).toFixed(2);
  }
}
