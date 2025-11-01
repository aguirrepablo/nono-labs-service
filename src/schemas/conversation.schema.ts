import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ConversationDocument = Conversation & Document;

export enum ConversationType {
  PRIVATE = 'private',
  GROUP = 'group',
  CHANNEL = 'channel',
}

export enum ConversationStatus {
  OPEN = 'open',
  CLOSED = 'closed',
  ARCHIVED = 'archived',
  PAUSED = 'paused',
}

export enum ParticipantRole {
  USER = 'user',
  AGENT = 'agent',
  SYSTEM = 'system',
  ADMIN = 'admin',
}

export interface Participant {
  id: string;
  role: ParticipantRole;
  name?: string;
  joinedAt: Date;
  leftAt?: Date;
}

@Schema({ timestamps: true })
export class Conversation {
  @Prop({ type: Types.ObjectId, ref: 'Tenant', required: true, index: true })
  tenantId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Channel', required: true, index: true })
  channelId: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'VirtualAgent',
    required: false,
    index: true,
  })
  virtualAgentId?: Types.ObjectId;

  @Prop({ required: true, index: true })
  externalChannelId: string;

  @Prop({
    type: String,
    enum: Object.values(ConversationType),
    default: ConversationType.PRIVATE,
  })
  type: ConversationType;

  @Prop({
    type: String,
    enum: Object.values(ConversationStatus),
    default: ConversationStatus.OPEN,
  })
  status: ConversationStatus;

  @Prop({ type: [Object], default: [] })
  participants: Participant[];

  @Prop({ type: Object, default: {} })
  context: {
    language?: string;
    timezone?: string;
    userPreferences?: Record<string, any>;
    conversationSummary?: string;
    [key: string]: any;
  };

  @Prop({ type: Object })
  metadata?: Record<string, any>;

  @Prop()
  lastMessageAt?: Date;

  @Prop({ default: 0 })
  messageCount: number;
}

export const ConversationSchema = SchemaFactory.createForClass(Conversation);

// Critical compound indexes for multitenant and channel queries
// Note: tenantId, channelId, virtualAgentId, and externalChannelId already have single-field indexes from @Prop({ index: true })
ConversationSchema.index({ tenantId: 1, channelId: 1 });
ConversationSchema.index({ tenantId: 1, status: 1 });
ConversationSchema.index({ tenantId: 1, externalChannelId: 1 });
ConversationSchema.index({ channelId: 1, externalChannelId: 1 }, { unique: true });
ConversationSchema.index({ status: 1, lastMessageAt: -1 });
ConversationSchema.index({ createdAt: -1 });
