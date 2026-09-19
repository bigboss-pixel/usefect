import {
  IsInt,
  IsNotEmpty,
} from 'class-validator';

export class AssignPermissionDto {
  @IsInt()
  @IsNotEmpty()
  permissionId: number;
}
