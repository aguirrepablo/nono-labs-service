import {
  IsString,
  IsOptional,
  IsEnum,
  IsObject,
  IsMongoId,
  IsNumber,
  Min,
  Max,
  MinLength,
  MaxLength,
} from 'class-validator';
import { ChannelType, ChannelStatus } from '../schemas/channel.schema';

export class CreateChannelDto {
  @IsEnum(ChannelType)
  type: ChannelType;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsObject()
  config: {
    apiToken?: string;
    webhookUrl?: string;
    phoneNumber?: string;
    apiKey?: string;
    webhookSecret?: string;
    [key: string]: any;
  };

  @IsOptional()
  @IsEnum(ChannelStatus)
  status?: ChannelStatus;

  @IsOptional()
  @IsMongoId()
  defaultVirtualAgentId?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  maxContextMessages?: number;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class UpdateChannelDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsObject()
  config?: {
    apiToken?: string;
    webhookUrl?: string;
    phoneNumber?: string;
    apiKey?: string;
    webhookSecret?: string;
    [key: string]: any;
  };

  @IsOptional()
  @IsEnum(ChannelStatus)
  status?: ChannelStatus;

  @IsOptional()
  @IsMongoId()
  defaultVirtualAgentId?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  maxContextMessages?: number;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
