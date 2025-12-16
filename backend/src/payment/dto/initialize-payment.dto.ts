import { IsNumber, IsPositive, IsString, IsOptional } from 'class-validator';

export class InitializePaymentDto {
  @IsNumber()
  @IsPositive()
  amount: number;

  @IsOptional()
  @IsString()
  callbackUrl?: string;
}
