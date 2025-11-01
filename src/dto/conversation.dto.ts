import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  IsMongoId,
  IsObject,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  ConversationType,
  ConversationStatus,
  Participant,
} from '../schemas/conversation.schema';

export class CreateConversationDto {
  @IsMongoId()
  channelId: string;

  @IsOptional()
  @IsMongoId()
  virtualAgentId?: string;

  @IsString()
  externalChannelId: string;

  @IsOptional()
  @IsEnum(ConversationType)
  type?: ConversationType;

  @IsOptional()
  @IsEnum(ConversationStatus)
  status?: ConversationStatus;

  @IsOptional()
  @IsArray()
  participants?: Participant[];

  @IsOptional()
  @IsObject()
  context?: Record<string, any>;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class UpdateConversationDto {
  @IsOptional()
  @IsMongoId()
  virtualAgentId?: string;

  @IsOptional()
  @IsEnum(ConversationType)
  type?: ConversationType;

  @IsOptional()
  @IsEnum(ConversationStatus)
  status?: ConversationStatus;

  @IsOptional()
  @IsArray()
  participants?: Participant[];

  @IsOptional()
  @IsObject()
  context?: Record<string, any>;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
