import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  IsMongoId,
  IsObject,
  ValidateNested,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  MessageType,
  MessageStatus,
  AuthorRole,
  Attachment,
} from '../schemas/message.schema';

class AttachmentDto implements Attachment {
  @IsString()
  url: string;

  @IsString()
  mimeType: string;

  @IsOptional()
  @IsString()
  fileName?: string;

  @IsOptional()
  fileSize?: number;

  @IsOptional()
  @IsString()
  thumbnailUrl?: string;

  @IsOptional()
  width?: number;

  @IsOptional()
  height?: number;

  @IsOptional()
  duration?: number;
}

export class CreateMessageDto {
  @IsMongoId()
  conversationId: string;

  @IsString()
  authorId: string;

  @IsEnum(AuthorRole)
  authorRole: AuthorRole;

  @IsOptional()
  @IsString()
  authorName?: string;

  @IsOptional()
  @IsEnum(MessageType)
  type?: MessageType;

  @IsOptional()
  @IsString()
  @MaxLength(10000)
  content?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttachmentDto)
  attachments?: Attachment[];

  @IsOptional()
  @IsEnum(MessageStatus)
  status?: MessageStatus;

  @IsOptional()
  @IsMongoId()
  replyToMessageId?: string;

  @IsOptional()
  @IsString()
  externalMessageId?: string;

  @IsOptional()
  @IsObject()
  channelMetadata?: Record<string, any>;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class UpdateMessageDto {
  @IsOptional()
  @IsString()
  @MaxLength(10000)
  content?: string;

  @IsOptional()
  @IsEnum(MessageStatus)
  status?: MessageStatus;

  @IsOptional()
  @IsString()
  externalMessageId?: string;

  @IsOptional()
  @IsObject()
  channelMetadata?: Record<string, any>;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @IsOptional()
  @IsString()
  errorMessage?: string;
}
