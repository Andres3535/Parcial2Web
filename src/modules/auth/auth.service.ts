import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { AuthResponseDto } from './dto/auth-response.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { toAuthUserDto } from './auth.mapper';
import { User, UserRole } from '../users/entities/user.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(registerDto: RegisterDto): Promise<AuthResponseDto> {
    const existingUser = await this.usersRepository.findOne({
      where: { email: registerDto.email },
    });

    if (existingUser) {
      throw new ConflictException('Email is already registered');
    }

    const passwordHash = await bcrypt.hash(
      registerDto.password,
      this.configService.get<number>('bcrypt.saltRounds', 10),
    );

    const user = this.usersRepository.create({
      email: registerDto.email,
      passwordHash,
      firstName: registerDto.firstName,
      lastName: registerDto.lastName,
      role: UserRole.MEMBER,
    });

    try {
      const savedUser = await this.usersRepository.save(user);
      return this.buildAuthResponse(savedUser);
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        throw new ConflictException('Email is already registered');
      }

      throw error;
    }
  }

  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.usersRepository
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('user.email = :email', { email: loginDto.email })
      .andWhere('user.isActive = :isActive', { isActive: true })
      .getOne();

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordMatches = await bcrypt.compare(loginDto.password, user.passwordHash);

    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.buildAuthResponse(user);
  }

  private buildAuthResponse(user: User): AuthResponseDto {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    return {
      accessToken: this.jwtService.sign(payload),
      user: toAuthUserDto(user),
    };
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
