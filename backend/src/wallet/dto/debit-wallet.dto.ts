import { IsNumber, IsPositive, IsString, IsOptional } from 'class-validator';

export class DebitWalletDto {
  @IsNumber()
  @IsPositive()
  amount: number;

  @IsString()
  reference: string;

  @IsOptional()
  @IsString()
  description?: string;
}
