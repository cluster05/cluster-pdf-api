import { IsIn, IsNotEmpty, IsString, IsUrl } from 'class-validator';

export class ConvertDTO {
  @IsString()
  @IsNotEmpty()
  @IsIn(['office', 'pdf', 'image'])
  from: string;

  @IsString()
  @IsNotEmpty()
  @IsIn(['office', 'pdf', 'image'])
  to: string;

  @IsString()
  @IsNotEmpty()
  @IsIn(['doc', 'docx', 'xlx', 'xlsx', 'ppt', 'png', 'jpeg', 'pdf'])
  fromType: string;

  @IsString()
  @IsNotEmpty()
  @IsIn(['doc', 'docx', 'xlx', 'xlsx', 'ppt', 'png', 'jpeg', 'pdf'])
  toType: string;

  pages: number | number[];

  @IsString()
  @IsNotEmpty()
  @IsUrl()
  url: string;

  @IsString()
  @IsNotEmpty()
  mongoId: string;
}
