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

export class CreateCampaignDto {
  @IsString()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(DiscountType)
  discountType: DiscountType;

  @IsInt()
  @Min(0)
  discountValue: number;

  @IsString()
  @IsOptional()
  conditions?: string;

  @IsDateString()
  startsAt: string;

  @IsDateString()
  endsAt: string;

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
}
