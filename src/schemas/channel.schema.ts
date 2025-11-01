import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ChannelDocument = Channel & Document;

export enum ChannelType {
  TELEGRAM = 'telegram',
  WHATSAPP = 'whatsapp',
  SLACK = 'slack',
  WEB = 'web',
  API = 'api',
}

export enum ChannelStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ERROR = 'error',
  CONFIGURING = 'configuring',
}

@Schema({ timestamps: true })
export class Channel {
  @Prop({ type: Types.ObjectId, ref: 'Tenant', required: true, index: true })
  tenantId: Types.ObjectId;

  @Prop({
    type: String,
    enum: Object.values(ChannelType),
    required: true,
  })
  type: ChannelType;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ trim: true })
  description?: string;

  @Prop({ type: Object, required: true })
  config: {
    apiToken?: string; // Encrypted
    webhookUrl?: string;
    phoneNumber?: string;
    apiKey?: string; // Encrypted
    webhookSecret?: string; // Encrypted
    [key: string]: any;
  };

  @Prop({
    type: String,
    enum: Object.values(ChannelStatus),
    default: ChannelStatus.CONFIGURING,
  })
  status: ChannelStatus;

  @Prop()
  lastHealthCheckAt?: Date;

  @Prop()
  lastErrorMessage?: string;

  @Prop({ type: Types.ObjectId, ref: 'VirtualAgent' })
  defaultVirtualAgentId?: Types.ObjectId;

  @Prop({ type: Number, default: 20, min: 1, max: 100 })
  maxContextMessages: number;

  @Prop({ type: Object })
  metadata?: Record<string, any>;
}

export const ChannelSchema = SchemaFactory.createForClass(Channel);

// Compound indexes for multitenant queries
ChannelSchema.index({ tenantId: 1, type: 1 });
ChannelSchema.index({ tenantId: 1, status: 1 });
ChannelSchema.index({ status: 1 });
ChannelSchema.index({ type: 1 });
ChannelSchema.index({ createdAt: -1 });
