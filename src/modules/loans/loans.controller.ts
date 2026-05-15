import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CreateLoanDto } from './dto/create-loan.dto';
import { LoanResponseDto } from './dto/loan-response.dto';
import { QueryLoansDto } from './dto/query-loans.dto';
import { LoansService } from './loans.service';

@ApiTags('loans')
@ApiBearerAuth()
@Controller('loans')
export class LoansController {
  constructor(private readonly loansService: LoansService) {}

  @Post()
  @ApiOperation({ summary: 'Create a loan' })
  @ApiCreatedResponse({ type: LoanResponseDto })
  create(@Body() createLoanDto: CreateLoanDto): Promise<LoanResponseDto> {
    return this.loansService.create(createLoanDto);
  }

  @Get()
  @ApiOperation({ summary: 'List loans' })
  @ApiOkResponse({ type: LoanResponseDto, isArray: true })
  findAll(@Query() queryLoansDto: QueryLoansDto): Promise<LoanResponseDto[]> {
    return this.loansService.findAll(queryLoansDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get loan detail' })
  @ApiOkResponse({ type: LoanResponseDto })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<LoanResponseDto> {
    return this.loansService.findOne(id);
  }

  @Patch(':id/return')
  @ApiOperation({ summary: 'Return a loan' })
  @ApiOkResponse({ type: LoanResponseDto })
  returnLoan(@Param('id', ParseUUIDPipe) id: string): Promise<LoanResponseDto> {
    return this.loansService.returnLoan(id);
  }

  @Patch(':id/mark-lost')
  @ApiOperation({ summary: 'Mark a loan as lost' })
  @ApiOkResponse({ type: LoanResponseDto })
  markLost(@Param('id', ParseUUIDPipe) id: string): Promise<LoanResponseDto> {
    return this.loansService.markLost(id);
  }
}
