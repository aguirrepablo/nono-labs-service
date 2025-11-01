import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsUrl,
  IsArray,
  Min,
  Max,
  MinLength,
  MaxLength,
  IsObject,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { VirtualAgentStatus, AIProvider } from '../schemas/virtual-agent.schema';

class ConfigParamsDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(2)
  temperature?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  maxTokens?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  topP?: number;

  @IsOptional()
  @IsNumber()
  @Min(-2)
  @Max(2)
  frequencyPenalty?: number;

  @IsOptional()
  @IsNumber()
  @Min(-2)
  @Max(2)
  presencePenalty?: number;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  systemPrompt?: string;

  @IsOptional()
  @IsArray()
  functions?: any[];

  @IsOptional()
  @IsArray()
  tools?: any[];
}

export class CreateVirtualAgentDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsString()
  @MinLength(3)
  model: string;

  @IsOptional()
  @IsEnum(AIProvider)
  provider?: AIProvider;

  @IsString()
  @MinLength(20)
  apiKey: string;

  @IsOptional()
  @IsUrl()
  endpointUrl?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => ConfigParamsDto)
  configParams?: ConfigParamsDto;

  @IsOptional()
  @IsEnum(VirtualAgentStatus)
  status?: VirtualAgentStatus;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class UpdateVirtualAgentDto {
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
  @IsString()
  @MinLength(3)
  model?: string;

  @IsOptional()
  @IsEnum(AIProvider)
  provider?: AIProvider;

  @IsOptional()
  @IsString()
  @MinLength(20)
  apiKey?: string;

  @IsOptional()
  @IsUrl()
  endpointUrl?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => ConfigParamsDto)
  configParams?: ConfigParamsDto;

  @IsOptional()
  @IsEnum(VirtualAgentStatus)
  status?: VirtualAgentStatus;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
