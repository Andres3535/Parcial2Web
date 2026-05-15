import { ApiProperty } from '@nestjs/swagger';
import { ItemType } from '../entities/item.entity';

export class ItemResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'BOOK-001' })
  code: string;

  @ApiProperty({ example: 'Clean Code' })
  title: string;

  @ApiProperty({ enum: ItemType, example: ItemType.BOOK })
  type: ItemType;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty({ example: true })
  isAvailable: boolean;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt: Date;
}
