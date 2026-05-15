import { ItemResponseDto } from './dto/item-response.dto';
import { Item } from './entities/item.entity';

export function toItemResponseDto(item: Item, isAvailable: boolean): ItemResponseDto {
  return {
    id: item.id,
    code: item.code,
    title: item.title,
    type: item.type,
    isActive: item.isActive,
    isAvailable,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}
