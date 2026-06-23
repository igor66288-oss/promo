import { IsString, IsOptional, IsUrl, IsEnum, IsNumber } from 'class-validator';
import { Tariff, StoreStatus } from '@prisma/client';
import { Type } from 'class-transformer';

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

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  lat?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  lng?: number;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  city?: string;
}
