import {
  IsString,
  IsOptional,
  IsEnum,
  IsInt,
  IsBoolean,
  IsDateString,
  Min,
} from 'class-validator';
import { DiscountType, CampaignStatus } from '@prisma/client';

export class UpdateCampaignDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(DiscountType)
  @IsOptional()
  discountType?: DiscountType;

  @IsInt()
  @Min(0)
  @IsOptional()
  discountValue?: number;

  @IsString()
  @IsOptional()
  conditions?: string;

  @IsDateString()
  @IsOptional()
  startsAt?: string;

  @IsDateString()
  @IsOptional()
  endsAt?: string;

  @IsInt()
  @IsOptional()
  totalLimit?: number;

  @IsInt()
  @IsOptional()
  perUserLimit?: number;

  @IsEnum(CampaignStatus)
  @IsOptional()
  status?: CampaignStatus;

  @IsBoolean()
  @IsOptional()
  promoted?: boolean;

  @IsBoolean()
  @IsOptional()
  inPartnerRoulette?: boolean;
}
