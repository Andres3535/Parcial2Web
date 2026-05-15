import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LoanStatus } from '../entities/loan.entity';

export class LoanResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ format: 'uuid' })
  userId: string;

  @ApiProperty({ format: 'uuid' })
  itemId: string;

  @ApiProperty({ type: String, format: 'date-time' })
  loanedAt: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  dueAt: Date;

  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  returnedAt: Date | null;

  @ApiProperty({ enum: LoanStatus, example: LoanStatus.ACTIVE })
  status: LoanStatus;

  @ApiProperty({ example: 0 })
  fineAmount: number;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt: Date;
}
