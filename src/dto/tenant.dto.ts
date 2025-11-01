import {
  IsString,
  IsEmail,
  IsOptional,
  IsEnum,
  IsObject,
  ValidateNested,
  IsNumber,
  Min,
  Matches,
  MinLength,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TenantStatus } from '../schemas/tenant.schema';

class BrandingConfigDto {
  @IsOptional()
  @IsString()
  logo?: string;

  @IsOptional()
  @IsString()
  @Matches(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, {
    message: 'Primary color must be a valid hex color',
  })
  primaryColor?: string;

  @IsOptional()
  @IsString()
  name?: string;
}

class LimitsConfigDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxConversations?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxMessagesPerMonth?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxVirtualAgents?: number;
}

class TenantConfigDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => BrandingConfigDto)
  branding?: BrandingConfigDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => LimitsConfigDto)
  limits?: LimitsConfigDto;

  @IsOptional()
  @IsObject()
  settings?: Record<string, any>;
}

export class CreateTenantDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @IsString()
  @MinLength(2)
  @MaxLength(50)
  @Matches(/^[a-z0-9-]+$/, {
    message: 'Slug must contain only lowercase letters, numbers, and hyphens',
  })
  slug: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => TenantConfigDto)
  config?: TenantConfigDto;

  @IsOptional()
  @IsEnum(TenantStatus)
  status?: TenantStatus;

  @IsOptional()
  @IsEmail()
  contactEmail?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class UpdateTenantDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => TenantConfigDto)
  config?: TenantConfigDto;

  @IsOptional()
  @IsEnum(TenantStatus)
  status?: TenantStatus;

  @IsOptional()
  @IsEmail()
  contactEmail?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
