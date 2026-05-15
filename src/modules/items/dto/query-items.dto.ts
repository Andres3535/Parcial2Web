import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { ItemType } from '../entities/item.entity';

export class QueryItemsDto {
  @ApiPropertyOptional({ enum: ItemType, example: ItemType.BOOK })
  @IsOptional()
  @IsEnum(ItemType)
  type?: ItemType;
}
