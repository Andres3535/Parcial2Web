import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Loan, LoanStatus } from '../loans/entities/loan.entity';
import { CreateItemDto } from './dto/create-item.dto';
import { ItemResponseDto } from './dto/item-response.dto';
import { QueryItemsDto } from './dto/query-items.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { Item } from './entities/item.entity';
import { toItemResponseDto } from './items.mapper';

@Injectable()
export class ItemsService {
  constructor(
    @InjectRepository(Item)
    private readonly itemsRepository: Repository<Item>,
    @InjectRepository(Loan)
    private readonly loansRepository: Repository<Loan>,
  ) {}

  async create(createItemDto: CreateItemDto): Promise<ItemResponseDto> {
    const existingItem = await this.itemsRepository.findOne({
      where: { code: createItemDto.code },
    });

    if (existingItem) {
      throw new ConflictException('Item code is already registered');
    }

    const item = this.itemsRepository.create(createItemDto);

    try {
      const savedItem = await this.itemsRepository.save(item);
      return toItemResponseDto(savedItem, true);
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        throw new ConflictException('Item code is already registered');
      }

      throw error;
    }
  }

  async findAll(queryItemsDto: QueryItemsDto): Promise<ItemResponseDto[]> {
    const where = {
      isActive: true,
      ...(queryItemsDto.type ? { type: queryItemsDto.type } : {}),
    };

    const items = await this.itemsRepository.find({
      where,
      order: { createdAt: 'DESC' },
    });

    return this.withAvailability(items);
  }

  async findOne(id: string): Promise<ItemResponseDto> {
    const item = await this.findActiveItemOrFail(id);
    const unavailableItemIds = await this.getUnavailableItemIds([item.id]);

    return toItemResponseDto(item, !unavailableItemIds.has(item.id));
  }

  async update(id: string, updateItemDto: UpdateItemDto): Promise<ItemResponseDto> {
    const item = await this.findActiveItemOrFail(id);

    this.itemsRepository.merge(item, updateItemDto);
    const savedItem = await this.itemsRepository.save(item);
    const unavailableItemIds = await this.getUnavailableItemIds([savedItem.id]);

    return toItemResponseDto(savedItem, !unavailableItemIds.has(savedItem.id));
  }

  async remove(id: string): Promise<void> {
    const item = await this.findActiveItemOrFail(id);

    item.isActive = false;
    await this.itemsRepository.save(item);
  }

  private async findActiveItemOrFail(id: string): Promise<Item> {
    const item = await this.itemsRepository.findOne({
      where: { id, isActive: true },
    });

    if (!item) {
      throw new NotFoundException('Item not found');
    }

    return item;
  }

  private async withAvailability(items: Item[]): Promise<ItemResponseDto[]> {
    const unavailableItemIds = await this.getUnavailableItemIds(items.map((item) => item.id));

    return items.map((item) => toItemResponseDto(item, !unavailableItemIds.has(item.id)));
  }

  private async getUnavailableItemIds(itemIds: string[]): Promise<Set<string>> {
    if (itemIds.length === 0) {
      return new Set<string>();
    }

    const loans = await this.loansRepository.find({
      select: { itemId: true },
      where: {
        itemId: In(itemIds),
        status: In([LoanStatus.ACTIVE, LoanStatus.OVERDUE]),
      },
    });

    return new Set(loans.map((loan) => loan.itemId));
  }

  private isUniqueViolation(error: unknown): boolean {
    const databaseError = error as { code?: unknown };

    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      databaseError.code === '23505'
    );
  }
}
