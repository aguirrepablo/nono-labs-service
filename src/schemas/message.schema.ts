import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type MessageDocument = Message & Document;

export enum MessageType {
  TEXT = 'text',
  DOCUMENT = 'document',
  IMAGE = 'image',
  VIDEO = 'video',
  AUDIO = 'audio',
  VOICE = 'voice',
  STICKER = 'sticker',
  LOCATION = 'location',
  COMMAND = 'command',
  SYSTEM = 'system',
}

export enum MessageStatus {
  PENDING = 'pending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  READ = 'read',
  FAILED = 'failed',
  DELETED = 'deleted',
}

export enum AuthorRole {
  USER = 'user',
  AGENT = 'agent',
  SYSTEM = 'system',
}

export interface Attachment {
  url: string;
  mimeType: string;
  fileName?: string;
  fileSize?: number;
  thumbnailUrl?: string;
  width?: number;
  height?: number;
  duration?: number;
}

@Schema({ timestamps: true })
export class Message {
  @Prop({
    type: Types.ObjectId,
    ref: 'Conversation',
    required: true,
    index: true,
  })
  conversationId: Types.ObjectId;

  @Prop({ required: true, index: true })
  authorId: string;

  @Prop()
  authorName?: string;

  @Prop({
    type: String,
    enum: Object.values(AuthorRole),
    required: true,
  })
  authorRole: AuthorRole;

  @Prop({
    type: String,
    enum: Object.values(MessageType),
    default: MessageType.TEXT,
  })
  type: MessageType;

  @Prop({ type: String })
  content?: string;

  @Prop({ type: [Object], default: [] })
  attachments: Attachment[];

  @Prop({
    type: String,
    enum: Object.values(MessageStatus),
    default: MessageStatus.PENDING,
  })
  status: MessageStatus;

  @Prop({ type: Types.ObjectId, ref: 'Message' })
  replyToMessageId?: Types.ObjectId;

  @Prop()
  externalMessageId?: string;

  @Prop({ type: Object })
  metadata?: {
    tokens?: {
      prompt?: number;
      completion?: number;
      total?: number;
    };
    model?: string;
    processingTime?: number;
    confidence?: number;
    // OpenAI response metadata (for tool_calls and other response data)
    openaiResponse?: {
      finishReason?: 'stop' | 'tool_calls' | 'length' | 'content_filter';
      toolCalls?: Array<{
        id: string;
        type: string;
        function: {
          name: string;
          arguments: string;
        };
      }>;
    };
    [key: string]: any;
  };

  @Prop()
  sentAt?: Date;

  @Prop()
  deliveredAt?: Date;

  @Prop()
  readAt?: Date;

  @Prop()
  failedAt?: Date;

  @Prop()
  errorMessage?: string;
}

export const MessageSchema = SchemaFactory.createForClass(Message);

// Indexes for efficient queries
MessageSchema.index({ conversationId: 1, createdAt: -1 });
MessageSchema.index({ conversationId: 1, authorRole: 1 });
MessageSchema.index({ authorId: 1, createdAt: -1 });
MessageSchema.index({ status: 1, createdAt: -1 });
MessageSchema.index({ externalMessageId: 1 });
MessageSchema.index({ type: 1, createdAt: -1 });
MessageSchema.index({ createdAt: -1 });
