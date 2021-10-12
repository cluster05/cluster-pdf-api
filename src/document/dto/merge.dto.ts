import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsNotEmpty,
  IsString,
} from 'class-validator';

export class MergeDTO {
  @IsNotEmpty()
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(5)
  urls: string[];

  @IsString()
  @IsNotEmpty()
  mongoId: string;
}
