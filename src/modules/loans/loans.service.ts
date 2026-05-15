import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, LessThan, Repository } from 'typeorm';
import { Item } from '../items/entities/item.entity';
import { User } from '../users/entities/user.entity';
import { CreateLoanDto } from './dto/create-loan.dto';
import { LoanResponseDto } from './dto/loan-response.dto';
import { QueryLoansDto } from './dto/query-loans.dto';
import { Loan, LoanStatus } from './entities/loan.entity';
import { toLoanResponseDto } from './loans.mapper';

const ONE_DAY_IN_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class LoansService {
  constructor(
    @InjectRepository(Loan)
    private readonly loansRepository: Repository<Loan>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(Item)
    private readonly itemsRepository: Repository<Item>,
    private readonly configService: ConfigService,
  ) {}

  async create(createLoanDto: CreateLoanDto): Promise<LoanResponseDto> {
    await this.refreshOverdueLoans();

    const loanedAt = new Date();
    const dueAt = createLoanDto.dueAt;

    this.validateDueAt(dueAt, loanedAt);

    await this.ensureUserExists(createLoanDto.userId);
    await this.ensureItemExists(createLoanDto.itemId);
    await this.ensureItemIsAvailable(createLoanDto.itemId);
    await this.ensureUserCanBorrow(createLoanDto.userId);

    const loan = this.loansRepository.create({
      userId: createLoanDto.userId,
      itemId: createLoanDto.itemId,
      loanedAt,
      dueAt,
      status: LoanStatus.ACTIVE,
      fineAmount: 0,
    });

    return toLoanResponseDto(await this.loansRepository.save(loan));
  }

  async findAll(queryLoansDto: QueryLoansDto): Promise<LoanResponseDto[]> {
    await this.refreshOverdueLoans();

    const loans = await this.loansRepository.find({
      where: {
        ...(queryLoansDto.userId ? { userId: queryLoansDto.userId } : {}),
        ...(queryLoansDto.itemId ? { itemId: queryLoansDto.itemId } : {}),
        ...(queryLoansDto.status ? { status: queryLoansDto.status } : {}),
      },
      order: { loanedAt: 'DESC' },
    });

    return loans.map(toLoanResponseDto);
  }

  async findOne(id: string): Promise<LoanResponseDto> {
    await this.refreshOverdueLoans();

    return toLoanResponseDto(await this.findLoanOrFail(id));
  }

  async returnLoan(id: string): Promise<LoanResponseDto> {
    await this.refreshOverdueLoans();

    const loan = await this.findLoanOrFail(id);

    if (this.isTerminalStatus(loan.status)) {
      throw new BadRequestException('Returned and lost loans cannot be returned');
    }

    const returnedAt = new Date();
    const daysOverdue = Math.max(
      0,
      Math.ceil((returnedAt.getTime() - loan.dueAt.getTime()) / ONE_DAY_IN_MS),
    );

    loan.returnedAt = returnedAt;
    loan.fineAmount = Number(
      (daysOverdue * this.configService.get<number>('loans.dailyFineRate', 0.5)).toFixed(2),
    );
    loan.status = LoanStatus.RETURNED;

    return toLoanResponseDto(await this.loansRepository.save(loan));
  }

  async markLost(id: string): Promise<LoanResponseDto> {
    await this.refreshOverdueLoans();

    const loan = await this.findLoanOrFail(id);

    if (this.isTerminalStatus(loan.status)) {
      throw new BadRequestException('Returned and lost loans cannot be marked as lost');
    }

    loan.status = LoanStatus.LOST;

    return toLoanResponseDto(await this.loansRepository.save(loan));
  }

  private validateDueAt(dueAt: Date, loanedAt: Date): void {
    if (Number.isNaN(dueAt.getTime())) {
      throw new BadRequestException('dueAt must be a valid date');
    }

    if (dueAt <= loanedAt) {
      throw new BadRequestException('dueAt must be greater than loanedAt');
    }

    const maxLoanDays = this.configService.get<number>('loans.maxLoanDays', 30);
    const loanDuration = dueAt.getTime() - loanedAt.getTime();

    if (loanDuration > maxLoanDays * ONE_DAY_IN_MS) {
      throw new BadRequestException(`Loan duration cannot exceed ${maxLoanDays} days`);
    }
  }

  private async ensureUserExists(userId: string): Promise<void> {
    const user = await this.usersRepository.findOne({
      where: { id: userId, isActive: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }
  }

  private async ensureItemExists(itemId: string): Promise<void> {
    const item = await this.itemsRepository.findOne({
      where: { id: itemId, isActive: true },
    });

    if (!item) {
      throw new NotFoundException('Item not found');
    }
  }

  private async ensureItemIsAvailable(itemId: string): Promise<void> {
    const blockingLoan = await this.loansRepository.findOne({
      where: {
        itemId,
        status: In([LoanStatus.ACTIVE, LoanStatus.OVERDUE]),
      },
      order: { loanedAt: 'ASC' },
    });

    if (blockingLoan) {
      throw new ConflictException(`Item is already loaned by blocking loanId ${blockingLoan.id}`);
    }
  }

  private async ensureUserCanBorrow(userId: string): Promise<void> {
    const maxActiveLoans = this.configService.get<number>('loans.maxActivePerUser', 3);
    const activeLoansCount = await this.loansRepository.count({
      where: {
        userId,
        status: In([LoanStatus.ACTIVE, LoanStatus.OVERDUE]),
      },
    });

    if (activeLoansCount >= maxActiveLoans) {
      throw new ConflictException(
        `User cannot have more than ${maxActiveLoans} active or overdue loans`,
      );
    }
  }

  private async findLoanOrFail(id: string): Promise<Loan> {
    const loan = await this.loansRepository.findOne({ where: { id } });

    if (!loan) {
      throw new NotFoundException('Loan not found');
    }

    return loan;
  }

  private async refreshOverdueLoans(): Promise<void> {
    await this.loansRepository.update(
      {
        status: LoanStatus.ACTIVE,
        returnedAt: IsNull(),
        dueAt: LessThan(new Date()),
      },
      { status: LoanStatus.OVERDUE },
    );
  }

  private isTerminalStatus(status: LoanStatus): boolean {
    return status === LoanStatus.RETURNED || status === LoanStatus.LOST;
  }
}
