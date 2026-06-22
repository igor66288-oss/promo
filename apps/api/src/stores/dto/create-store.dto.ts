import { IsString, IsOptional, IsUrl, IsEnum } from 'class-validator';
import { Tariff } from '@prisma/client';

export class CreateStoreDto {
  @IsString()
  name: string;

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
}
