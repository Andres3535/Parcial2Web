import { AuthUserDto } from './dto/auth-user.dto';
import { User } from '../users/entities/user.entity';

export function toAuthUserDto(user: User): AuthUserDto {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    isActive: user.isActive,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}
