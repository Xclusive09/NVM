import { IsString, IsNumber, IsPositive, IsOptional, IsEnum, IsArray, ArrayMinSize } from 'class-validator';

export enum Network {
  MTN = 'MTN',
  AIRTEL = 'AIRTEL',
  GLO = 'GLO',
  NINE_MOBILE = 'NINE_MOBILE',
}

export enum ValueType {
  AIRTIME = 'AIRTIME',
  DATA = 'DATA',
}

export class CreateDistributionDto {
  @IsEnum(Network)
  network: Network;

  @IsEnum(ValueType)
  valueType: ValueType;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  amount?: number; // For airtime

  @IsOptional()
  @IsString()
  dataPlanId?: string; // For data

  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  phoneNumbers: string[];
}
