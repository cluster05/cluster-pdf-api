import { IsNotEmpty, IsString, IsUrl } from 'class-validator';

export class CompressDTO {
  @IsString()
  @IsNotEmpty()
  @IsUrl()
  url: string;

  @IsString()
  @IsNotEmpty()
  mongoId: string;

  compressType: string;
  compressPercentage: number;
}
