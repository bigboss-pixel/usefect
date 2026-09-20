import { IsIn } from 'class-validator';

export class UpdateAdminRoleDto {
  @IsIn(['ADMIN', 'LIBRARIAN', 'SUPER_ADMIN'])
  role: 'ADMIN' | 'LIBRARIAN' | 'SUPER_ADMIN';
}
