import { IsArray, IsNotEmpty, IsUrl } from "class-validator";

export class SplitDTO{

    @IsNotEmpty()
    @IsUrl()
    url : string;

    @IsNotEmpty()
    @IsArray()
    pages :number[];   
}