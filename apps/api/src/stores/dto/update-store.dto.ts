import { IsString, IsOptional, IsUrl, IsEnum } from 'class-validator';
import { Tariff, StoreStatus } from '@prisma/client';

export class UpdateStoreDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  logo?: string;

  @IsUrl()
  @IsOptional()
  website?: string;

  @IsEnum(Tariff)
  @IsOptional()
  tariff?: Tariff;

  @IsEnum(StoreStatus)
  @IsOptional()
  status?: StoreStatus;
}
