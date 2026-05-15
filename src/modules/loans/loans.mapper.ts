import { LoanResponseDto } from './dto/loan-response.dto';
import { Loan } from './entities/loan.entity';

export function toLoanResponseDto(loan: Loan): LoanResponseDto {
  return {
    id: loan.id,
    userId: loan.userId,
    itemId: loan.itemId,
    loanedAt: loan.loanedAt,
    dueAt: loan.dueAt,
    returnedAt: loan.returnedAt,
    status: loan.status,
    fineAmount: loan.fineAmount,
    createdAt: loan.createdAt,
    updatedAt: loan.updatedAt,
  };
}
