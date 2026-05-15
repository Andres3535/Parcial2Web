import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'ada.lovelace@example.com', maxLength: 255 })
  @IsEmail()
  @MaxLength(255)
  email: string;

  @ApiProperty({ example: 'plain-text-password' })
  @IsString()
  @IsNotEmpty()
  password: string;

  @ApiProperty({ example: 'Ada', maxLength: 100 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  firstName: string;

  @ApiProperty({ example: 'Lovelace', maxLength: 100 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  lastName: string;
}
