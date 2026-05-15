import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Item } from '../items/entities/item.entity';
import { User } from '../users/entities/user.entity';
import { CreateLoanDto } from './dto/create-loan.dto';
import { Loan, LoanStatus } from './entities/loan.entity';
import { LoansService } from './loans.service';

describe('LoansService', () => {
  let service: LoansService;
  let loansRepository: jest.Mocked<Repository<Loan>>;
  let usersRepository: jest.Mocked<Repository<User>>;
  let itemsRepository: jest.Mocked<Repository<Item>>;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    const mockLoansRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    };

    const mockUsersRepository = {
      findOne: jest.fn(),
    };

    const mockItemsRepository = {
      findOne: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LoansService,
        {
          provide: getRepositoryToken(Loan),
          useValue: mockLoansRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUsersRepository,
        },
        {
          provide: getRepositoryToken(Item),
          useValue: mockItemsRepository,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<LoansService>(LoansService);
    loansRepository = module.get(getRepositoryToken(Loan));
    usersRepository = module.get(getRepositoryToken(User));
    itemsRepository = module.get(getRepositoryToken(Item));
    configService = module.get(ConfigService);

    configService.get.mockImplementation((key: string, defaultValue: any) => {
      const configMap: Record<string, any> = {
        'loans.dailyFineRate': 0.5,
        'loans.maxActivePerUser': 3,
        'loans.maxLoanDays': 30,
      };
      return configMap[key] ?? defaultValue;
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a loan successfully when item is available, user is under limit, and dates are valid', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440001';
      const itemId = '550e8400-e29b-41d4-a716-446655440002';
      const createLoanDto: CreateLoanDto = {
        userId,
        itemId,
        dueAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
      };

      const mockUser: User = {
        id: userId,
        email: 'user@example.com',
        isActive: true,
      } as User;

      const mockItem: Item = {
        id: itemId,
        title: 'Test Item',
        isActive: true,
      } as Item;

      const mockLoan: Loan = {
        id: '550e8400-e29b-41d4-a716-446655440003',
        userId,
        itemId,
        loanedAt: expect.any(Date),
        dueAt: createLoanDto.dueAt,
        returnedAt: null,
        status: LoanStatus.ACTIVE,
        fineAmount: 0,
        user: mockUser,
        item: mockItem,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      };

      loansRepository.update.mockResolvedValue({ affected: 0, raw: {}, generatedMaps: [] });
      usersRepository.findOne.mockResolvedValue(mockUser);
      itemsRepository.findOne.mockResolvedValue(mockItem);
      loansRepository.findOne.mockResolvedValue(null);
      loansRepository.count.mockResolvedValue(0);
      loansRepository.create.mockReturnValue(mockLoan);
      loansRepository.save.mockResolvedValue(mockLoan);

      const result = await service.create(createLoanDto);

      expect(result).toHaveProperty('id');
      expect(result.status).toBe(LoanStatus.ACTIVE);
      expect(result.fineAmount).toBe(0);
      expect(loansRepository.save).toHaveBeenCalled();
    });

    it('should throw ConflictException if item already has an active loan', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440001';
      const itemId = '550e8400-e29b-41d4-a716-446655440002';
      const createLoanDto: CreateLoanDto = {
        userId,
        itemId,
        dueAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
      };

      const mockUser: User = {
        id: userId,
        email: 'user@example.com',
        isActive: true,
      } as User;

      const mockItem: Item = {
        id: itemId,
        title: 'Test Item',
        isActive: true,
      } as Item;

      const existingLoan: Loan = {
        id: '550e8400-e29b-41d4-a716-446655440004',
        userId: 'other-user-id',
        itemId,
        status: LoanStatus.ACTIVE,
      } as Loan;

      loansRepository.update.mockResolvedValue({ affected: 0, raw: {}, generatedMaps: [] });
      usersRepository.findOne.mockResolvedValue(mockUser);
      itemsRepository.findOne.mockResolvedValue(mockItem);
      loansRepository.findOne.mockResolvedValue(existingLoan);

      await expect(service.create(createLoanDto)).rejects.toThrow(ConflictException);
      await expect(service.create(createLoanDto)).rejects.toThrow(/Item is already loaned/);
    });

    it('should throw ConflictException if user already has 3 active/overdue loans', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440001';
      const itemId = '550e8400-e29b-41d4-a716-446655440002';
      const createLoanDto: CreateLoanDto = {
        userId,
        itemId,
        dueAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
      };

      const mockUser: User = {
        id: userId,
        email: 'user@example.com',
        isActive: true,
      } as User;

      const mockItem: Item = {
        id: itemId,
        title: 'Test Item',
        isActive: true,
      } as Item;

      loansRepository.update.mockResolvedValue({ affected: 0, raw: {}, generatedMaps: [] });
      usersRepository.findOne.mockResolvedValue(mockUser);
      itemsRepository.findOne.mockResolvedValue(mockItem);
      loansRepository.findOne.mockResolvedValue(null);
      loansRepository.count.mockResolvedValue(3);

      await expect(service.create(createLoanDto)).rejects.toThrow(ConflictException);
      await expect(service.create(createLoanDto)).rejects.toThrow(/cannot have more than 3/);
    });

    it('should throw BadRequestException if dueAt is before loanedAt', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440001';
      const itemId = '550e8400-e29b-41d4-a716-446655440002';
      const pastDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
      const createLoanDto: CreateLoanDto = {
        userId,
        itemId,
        dueAt: pastDate,
      };

      loansRepository.update.mockResolvedValue({ affected: 0, raw: {}, generatedMaps: [] });

      await expect(service.create(createLoanDto)).rejects.toThrow(BadRequestException);
      await expect(service.create(createLoanDto)).rejects.toThrow(
        /dueAt must be greater than loanedAt/,
      );
    });
  });

  describe('returnLoan', () => {
    it('should calculate fine correctly when dueAt was 5 days ago and DAILY_FINE_RATE is 0.50, expecting fineAmount = 2.50', async () => {
      const loanId = '550e8400-e29b-41d4-a716-446655440005';
      const now = new Date();
      const dueAt = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);

      const mockLoan: Loan = {
        id: loanId,
        userId: '550e8400-e29b-41d4-a716-446655440001',
        itemId: '550e8400-e29b-41d4-a716-446655440002',
        loanedAt: new Date(dueAt.getTime() - 10 * 24 * 60 * 60 * 1000),
        dueAt,
        returnedAt: null,
        status: LoanStatus.OVERDUE,
        fineAmount: 0,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      } as Loan;

      const updatedLoan = { ...mockLoan };

      loansRepository.update.mockResolvedValue({ affected: 0, raw: {}, generatedMaps: [] });
      loansRepository.findOne.mockResolvedValue(mockLoan);
      loansRepository.save.mockImplementation(async (loan: Loan) => {
        updatedLoan.returnedAt = loan.returnedAt;
        updatedLoan.fineAmount = loan.fineAmount;
        updatedLoan.status = loan.status;
        return updatedLoan;
      });

      const result = await service.returnLoan(loanId);

      expect(result.fineAmount).toBe(2.5);
      expect(result.status).toBe(LoanStatus.RETURNED);
      expect(result.returnedAt).toBeDefined();
    });

    it('should throw BadRequestException when returning a returned loan', async () => {
      const loanId = '550e8400-e29b-41d4-a716-446655440005';

      const mockLoan: Loan = {
        id: loanId,
        userId: '550e8400-e29b-41d4-a716-446655440001',
        itemId: '550e8400-e29b-41d4-a716-446655440002',
        status: LoanStatus.RETURNED,
        returnedAt: new Date(),
      } as Loan;

      loansRepository.update.mockResolvedValue({ affected: 0, raw: {}, generatedMaps: [] });
      loansRepository.findOne.mockResolvedValue(mockLoan);

      await expect(service.returnLoan(loanId)).rejects.toThrow(BadRequestException);
      await expect(service.returnLoan(loanId)).rejects.toThrow(/cannot be returned/);
    });

    it('should throw BadRequestException when returning a lost loan', async () => {
      const loanId = '550e8400-e29b-41d4-a716-446655440005';

      const mockLoan: Loan = {
        id: loanId,
        userId: '550e8400-e29b-41d4-a716-446655440001',
        itemId: '550e8400-e29b-41d4-a716-446655440002',
        status: LoanStatus.LOST,
      } as Loan;

      loansRepository.update.mockResolvedValue({ affected: 0, raw: {}, generatedMaps: [] });
      loansRepository.findOne.mockResolvedValue(mockLoan);

      await expect(service.returnLoan(loanId)).rejects.toThrow(BadRequestException);
    });
  });

  describe('findOne', () => {
    it('should throw NotFoundException when loan does not exist', async () => {
      const loanId = '550e8400-e29b-41d4-a716-446655440005';

      loansRepository.update.mockResolvedValue({ affected: 0, raw: {}, generatedMaps: [] });
      loansRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne(loanId)).rejects.toThrow(NotFoundException);
    });
  });
});

describe('LoansService', () => {
  let service: LoansService;
  let loansRepository: jest.Mocked<Repository<Loan>>;
  let usersRepository: jest.Mocked<Repository<User>>;
  let itemsRepository: jest.Mocked<Repository<Item>>;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    const mockLoansRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    };

    const mockUsersRepository = {
      findOne: jest.fn(),
    };

    const mockItemsRepository = {
      findOne: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LoansService,
        {
          provide: getRepositoryToken(Loan),
          useValue: mockLoansRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUsersRepository,
        },
        {
          provide: getRepositoryToken(Item),
          useValue: mockItemsRepository,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<LoansService>(LoansService);
    loansRepository = module.get(getRepositoryToken(Loan));
    usersRepository = module.get(getRepositoryToken(User));
    itemsRepository = module.get(getRepositoryToken(Item));
    configService = module.get(ConfigService);

    // Default mock config values
    configService.get.mockImplementation((key: string, defaultValue: any) => {
      const configMap: Record<string, any> = {
        'loans.dailyFineRate': 0.5,
        'loans.maxActivePerUser': 3,
        'loans.maxLoanDays': 30,
      };
      return configMap[key] ?? defaultValue;
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a loan successfully when item is available, user is under limit, and dates are valid', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440001';
      const itemId = '550e8400-e29b-41d4-a716-446655440002';
      const createLoanDto: CreateLoanDto = {
        userId,
        itemId,
        dueAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10 days from now
      };

      const mockUser: User = {
        id: userId,
        email: 'user@example.com',
        isActive: true,
      } as User;

      const mockItem: Item = {
        id: itemId,
        title: 'Test Item',
        isActive: true,
      } as Item;

      const mockLoan: Loan = {
        id: '550e8400-e29b-41d4-a716-446655440003',
        userId,
        itemId,
        loanedAt: expect.any(Date),
        dueAt: createLoanDto.dueAt,
        returnedAt: null,
        status: LoanStatus.ACTIVE,
        fineAmount: 0,
        user: mockUser,
        item: mockItem,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      };

      loansRepository.update.mockResolvedValue({ affected: 0, raw: {}, generatedMaps: [] });
      usersRepository.findOne.mockResolvedValue(mockUser);
      itemsRepository.findOne.mockResolvedValue(mockItem);
      loansRepository.findOne.mockResolvedValue(null); // No blocking loan
      loansRepository.count.mockResolvedValue(0); // User has 0 active loans
      loansRepository.create.mockReturnValue(mockLoan);
      loansRepository.save.mockResolvedValue(mockLoan);

      const result = await service.create(createLoanDto);

      expect(result).toHaveProperty('id');
      expect(result.status).toBe(LoanStatus.ACTIVE);
      expect(result.fineAmount).toBe(0);
      expect(loansRepository.save).toHaveBeenCalled();
    });

    it('should throw ConflictException if item already has an active loan', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440001';
      const itemId = '550e8400-e29b-41d4-a716-446655440002';
      const createLoanDto: CreateLoanDto = {
        userId,
        itemId,
        dueAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
      };

      const mockUser: User = {
        id: userId,
        email: 'user@example.com',
        isActive: true,
      } as User;

      const mockItem: Item = {
        id: itemId,
        title: 'Test Item',
        isActive: true,
      } as Item;

      const existingLoan: Loan = {
        id: '550e8400-e29b-41d4-a716-446655440004',
        userId: 'other-user-id',
        itemId,
        status: LoanStatus.ACTIVE,
      } as Loan;

      loansRepository.update.mockResolvedValue({ affected: 0, raw: {}, generatedMaps: [] });
      usersRepository.findOne.mockResolvedValue(mockUser);
      itemsRepository.findOne.mockResolvedValue(mockItem);
      loansRepository.findOne.mockResolvedValue(existingLoan); // Item has an active loan

      await expect(service.create(createLoanDto)).rejects.toThrow(ConflictException);
      await expect(service.create(createLoanDto)).rejects.toThrow(
        /Item is already loaned/,
      );
    });

    it('should throw ConflictException if user already has 3 active/overdue loans', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440001';
      const itemId = '550e8400-e29b-41d4-a716-446655440002';
      const createLoanDto: CreateLoanDto = {
        userId,
        itemId,
        dueAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
      };

      const mockUser: User = {
        id: userId,
        email: 'user@example.com',
        isActive: true,
      } as User;

      const mockItem: Item = {
        id: itemId,
        title: 'Test Item',
        isActive: true,
      } as Item;

      loansRepository.update.mockResolvedValue({ affected: 0, raw: {}, generatedMaps: [] });
      usersRepository.findOne.mockResolvedValue(mockUser);
      itemsRepository.findOne.mockResolvedValue(mockItem);
      loansRepository.findOne.mockResolvedValue(null); // No blocking loan for item
      loansRepository.count.mockResolvedValue(3); // User already has 3 active loans

      await expect(service.create(createLoanDto)).rejects.toThrow(ConflictException);
      await expect(service.create(createLoanDto)).rejects.toThrow(
        /cannot have more than 3/,
      );
    });

    it('should throw BadRequestException if dueAt is before loanedAt', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440001';
      const itemId = '550e8400-e29b-41d4-a716-446655440002';
      const pastDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
      const createLoanDto: CreateLoanDto = {
        userId,
        itemId,
        dueAt: pastDate,
      };

      loansRepository.update.mockResolvedValue({ affected: 0, raw: {}, generatedMaps: [] });

      await expect(service.create(createLoanDto)).rejects.toThrow(BadRequestException);
      await expect(service.create(createLoanDto)).rejects.toThrow(
        /dueAt must be greater than loanedAt/,
      );
    });
  });

  describe('returnLoan', () => {
    it('should calculate fine correctly when dueAt was 5 days ago and DAILY_FINE_RATE is 0.50, expecting fineAmount = 2.50', async () => {
      const loanId = '550e8400-e29b-41d4-a716-446655440005';
      const now = new Date();
      const dueAt = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000); // 5 days ago

      const mockLoan: Loan = {
        id: loanId,
        userId: '550e8400-e29b-41d4-a716-446655440001',
        itemId: '550e8400-e29b-41d4-a716-446655440002',
        loanedAt: new Date(dueAt.getTime() - 10 * 24 * 60 * 60 * 1000),
        dueAt,
        returnedAt: null,
        status: LoanStatus.OVERDUE,
        fineAmount: 0,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      } as Loan;

      const updatedLoan = { ...mockLoan };

      loansRepository.update.mockResolvedValue({ affected: 0, raw: {}, generatedMaps: [] });
      loansRepository.findOne.mockResolvedValue(mockLoan);
      loansRepository.save.mockImplementation(async (loan: Loan) => {
        updatedLoan.returnedAt = loan.returnedAt;
        updatedLoan.fineAmount = loan.fineAmount;
        updatedLoan.status = loan.status;
        return updatedLoan;
      });

      const result = await service.returnLoan(loanId);

      expect(result.fineAmount).toBe(2.5); // 5 days * 0.5 = 2.50
      expect(result.status).toBe(LoanStatus.RETURNED);
      expect(result.returnedAt).toBeDefined();
    });

    it('should throw BadRequestException when returning a returned loan', async () => {
      const loanId = '550e8400-e29b-41d4-a716-446655440005';

      const mockLoan: Loan = {
        id: loanId,
        userId: '550e8400-e29b-41d4-a716-446655440001',
        itemId: '550e8400-e29b-41d4-a716-446655440002',
        status: LoanStatus.RETURNED,
        returnedAt: new Date(),
      } as Loan;

      loansRepository.update.mockResolvedValue({ affected: 0, raw: {}, generatedMaps: [] });
      loansRepository.findOne.mockResolvedValue(mockLoan);

      await expect(service.returnLoan(loanId)).rejects.toThrow(BadRequestException);
      await expect(service.returnLoan(loanId)).rejects.toThrow(
        /cannot be returned/,
      );
    });

    it('should throw BadRequestException when returning a lost loan', async () => {
      const loanId = '550e8400-e29b-41d4-a716-446655440005';

      const mockLoan: Loan = {
        id: loanId,
        userId: '550e8400-e29b-41d4-a716-446655440001',
        itemId: '550e8400-e29b-41d4-a716-446655440002',
        status: LoanStatus.LOST,
      } as Loan;

      loansRepository.update.mockResolvedValue({ affected: 0, raw: {}, generatedMaps: [] });
      loansRepository.findOne.mockResolvedValue(mockLoan);

      await expect(service.returnLoan(loanId)).rejects.toThrow(BadRequestException);
    });
  });

  describe('findOne', () => {
    it('should throw NotFoundException when loan does not exist', async () => {
      const loanId = '550e8400-e29b-41d4-a716-446655440005';

      loansRepository.update.mockResolvedValue({ affected: 0, raw: {}, generatedMaps: [] });
      loansRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne(loanId)).rejects.toThrow(NotFoundException);
    });
  });
});
      const userId = '550e8400-e29b-41d4-a716-446655440001';
      const itemId = '550e8400-e29b-41d4-a716-446655440002';
      const createLoanDto: CreateLoanDto = {
        userId,
        itemId,
        dueAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10 days from now
      };

      const mockUser: User = {
        id: userId,
        email: 'user@example.com',
        isActive: true,
      } as User;

      const mockItem: Item = {
        id: itemId,
        title: 'Test Item',
        isActive: true,
      } as Item;

      const mockLoan: Loan = {
        id: '550e8400-e29b-41d4-a716-446655440003',
        userId,
        itemId,
        loanedAt: expect.any(Date),
        dueAt: createLoanDto.dueAt,
        returnedAt: null,
        status: LoanStatus.ACTIVE,
        fineAmount: 0,
        user: mockUser,
        item: mockItem,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      };

      loansRepository.update.mockResolvedValue({ affected: 0, raw: {}, generatedMaps: [] });
      usersRepository.findOne.mockResolvedValue(mockUser);
      itemsRepository.findOne.mockResolvedValue(mockItem);
      loansRepository.findOne.mockResolvedValue(null); // No blocking loan
      loansRepository.count.mockResolvedValue(0); // User has 0 active loans
      loansRepository.create.mockReturnValue(mockLoan);
      loansRepository.save.mockResolvedValue(mockLoan);

      const result = await service.create(createLoanDto);

      expect(result).toHaveProperty('id');
      expect(result.status).toBe(LoanStatus.ACTIVE);
      expect(result.fineAmount).toBe(0);
      expect(loansRepository.save).toHaveBeenCalled();
    });

    it('should throw ConflictException if item already has an active loan', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440001';
      const itemId = '550e8400-e29b-41d4-a716-446655440002';
      const createLoanDto: CreateLoanDto = {
        userId,
        itemId,
        dueAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
      };

      const mockUser: User = {
        id: userId,
        email: 'user@example.com',
        isActive: true,
      } as User;

      const mockItem: Item = {
        id: itemId,
        title: 'Test Item',
        isActive: true,
      } as Item;

      const existingLoan: Loan = {
        id: '550e8400-e29b-41d4-a716-446655440004',
        userId: 'other-user-id',
        itemId,
        status: LoanStatus.ACTIVE,
      } as Loan;

      loansRepository.update.mockResolvedValue({ affected: 0, raw: {}, generatedMaps: [] });
      usersRepository.findOne.mockResolvedValue(mockUser);
      itemsRepository.findOne.mockResolvedValue(mockItem);
      loansRepository.findOne.mockResolvedValue(existingLoan); // Item has an active loan

      await expect(service.create(createLoanDto)).rejects.toThrow(ConflictException);
      await expect(service.create(createLoanDto)).rejects.toThrow(
        /Item is already loaned/,
      );
    });

    it('should throw ConflictException if user already has 3 active/overdue loans', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440001';
      const itemId = '550e8400-e29b-41d4-a716-446655440002';
      const createLoanDto: CreateLoanDto = {
        userId,
        itemId,
        dueAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
      };

      const mockUser: User = {
        id: userId,
        email: 'user@example.com',
        isActive: true,
      } as User;

      const mockItem: Item = {
        id: itemId,
        title: 'Test Item',
        isActive: true,
      } as Item;

      loansRepository.update.mockResolvedValue({ affected: 0, raw: {}, generatedMaps: [] });
      usersRepository.findOne.mockResolvedValue(mockUser);
      itemsRepository.findOne.mockResolvedValue(mockItem);
      loansRepository.findOne.mockResolvedValue(null); // No blocking loan for item
      loansRepository.count.mockResolvedValue(3); // User already has 3 active loans

      await expect(service.create(createLoanDto)).rejects.toThrow(ConflictException);
      await expect(service.create(createLoanDto)).rejects.toThrow(
        /cannot have more than 3/,
      );
    });

    it('should throw BadRequestException if dueAt is before loanedAt', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440001';
      const itemId = '550e8400-e29b-41d4-a716-446655440002';
      const pastDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
      const createLoanDto: CreateLoanDto = {
        userId,
        itemId,
        dueAt: pastDate,
      };

      loansRepository.update.mockResolvedValue({ affected: 0, raw: {}, generatedMaps: [] });

      await expect(service.create(createLoanDto)).rejects.toThrow(BadRequestException);
      await expect(service.create(createLoanDto)).rejects.toThrow(
        /dueAt must be greater than loanedAt/,
      );
    });
  });

  describe('returnLoan', () => {
    it('should calculate fine correctly when dueAt was 5 days ago and DAILY_FINE_RATE is 0.50, expecting fineAmount = 2.50', async () => {
      const loanId = '550e8400-e29b-41d4-a716-446655440005';
      const now = new Date();
      const dueAt = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000); // 5 days ago

      const mockLoan: Loan = {
        id: loanId,
        userId: '550e8400-e29b-41d4-a716-446655440001',
        itemId: '550e8400-e29b-41d4-a716-446655440002',
        loanedAt: new Date(dueAt.getTime() - 10 * 24 * 60 * 60 * 1000),
        dueAt,
        returnedAt: null,
        status: LoanStatus.OVERDUE,
        fineAmount: 0,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      } as Loan;

      const updatedLoan = { ...mockLoan };

      loansRepository.update.mockResolvedValue({ affected: 0, raw: {}, generatedMaps: [] });
      loansRepository.findOne.mockResolvedValue(mockLoan);
      loansRepository.save.mockImplementation(async (loan: Loan) => {
        updatedLoan.returnedAt = loan.returnedAt;
        updatedLoan.fineAmount = loan.fineAmount;
        updatedLoan.status = loan.status;
        return updatedLoan;
      });

      const result = await service.returnLoan(loanId);

      expect(result.fineAmount).toBe(2.5); // 5 days * 0.5 = 2.50
      expect(result.status).toBe(LoanStatus.RETURNED);
      expect(result.returnedAt).toBeDefined();
    });

    it('should throw BadRequestException when returning a returned loan', async () => {
      const loanId = '550e8400-e29b-41d4-a716-446655440005';

      const mockLoan: Loan = {
        id: loanId,
        userId: '550e8400-e29b-41d4-a716-446655440001',
        itemId: '550e8400-e29b-41d4-a716-446655440002',
        status: LoanStatus.RETURNED,
        returnedAt: new Date(),
      } as Loan;

      loansRepository.update.mockResolvedValue({ affected: 0, raw: {}, generatedMaps: [] });
      loansRepository.findOne.mockResolvedValue(mockLoan);

      await expect(service.returnLoan(loanId)).rejects.toThrow(BadRequestException);
      await expect(service.returnLoan(loanId)).rejects.toThrow(
        /cannot be returned/,
      );
    });

    it('should throw BadRequestException when returning a lost loan', async () => {
      const loanId = '550e8400-e29b-41d4-a716-446655440005';

      const mockLoan: Loan = {
        id: loanId,
        userId: '550e8400-e29b-41d4-a716-446655440001',
        itemId: '550e8400-e29b-41d4-a716-446655440002',
        status: LoanStatus.LOST,
      } as Loan;

      loansRepository.update.mockResolvedValue({ affected: 0, raw: {}, generatedMaps: [] });
      loansRepository.findOne.mockResolvedValue(mockLoan);

      await expect(service.returnLoan(loanId)).rejects.toThrow(BadRequestException);
    });
  });

  describe('findOne', () => {
    it('should throw NotFoundException when loan does not exist', async () => {
      const loanId = '550e8400-e29b-41d4-a716-446655440005';

      loansRepository.update.mockResolvedValue({ affected: 0, raw: {}, generatedMaps: [] });
      loansRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne(loanId)).rejects.toThrow(NotFoundException);
    });
  });
});
