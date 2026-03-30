import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsString, IsInt, Min, MaxLength } from 'class-validator';

export class CreateMarketDto {
  @ApiProperty({ example: '3fa85f64-5717-4562-b3fc-2c963f66afa6' })
  @IsUUID('4')
  eventId: string;

  @ApiProperty({ example: 'Man City to win', maxLength: 255 })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiProperty({
    example: 240,
    description: 'Decimal odds × 100. Minimum 1.01 → 101.',
  })
  @IsInt()
  @Min(101, { message: 'Minimum odds are 1.01 (101)' })
  oddsInt: number;
}
