import { IsIn, IsNotEmpty, IsString, IsUrl } from "class-validator";

export class ConvertDTO {

  @IsString()
  @IsNotEmpty()
  @IsIn(['office','pdf'])
  from: string;

  @IsString()
  @IsNotEmpty()
  @IsIn(['office','pdf'])
  to: string;

  @IsString()
  @IsNotEmpty()
  @IsIn(['doc','docx','xlx','xlsx','ppt','png','pdf'])
  fromType : string;

  @IsString()
  @IsNotEmpty()
  @IsIn(['doc','docx','xlx','xlsx','ppt','png','pdf'])
  toType :string;

  pages : number | number[]

  @IsString()
  @IsNotEmpty()
  @IsUrl()
  url: string;
}
