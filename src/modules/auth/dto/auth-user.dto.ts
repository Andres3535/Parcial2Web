import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../../users/entities/user.entity';

export class AuthUserDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'ada.lovelace@example.com' })
  email: string;

  @ApiProperty({ example: 'Ada' })
  firstName: string;

  @ApiProperty({ example: 'Lovelace' })
  lastName: string;

  @ApiProperty({ enum: UserRole, example: UserRole.MEMBER })
  role: UserRole;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt: Date;
}
