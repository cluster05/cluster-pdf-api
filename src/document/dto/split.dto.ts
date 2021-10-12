import { IsArray, IsNotEmpty, IsString, IsUrl } from 'class-validator';

export class SplitDTO {
  @IsNotEmpty()
  @IsUrl()
  url: string;

  @IsNotEmpty()
  @IsArray()
  pages: number[];

  @IsString()
  @IsNotEmpty()
  mongoId: string;
}
