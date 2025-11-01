import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type VirtualAgentDocument = VirtualAgent & Document;

export enum VirtualAgentStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
}

export enum AIProvider {
  OPENAI = 'openai',
}

@Schema({ timestamps: true })
export class VirtualAgent {
  @Prop({ type: Types.ObjectId, ref: 'Tenant', required: true, index: true })
  tenantId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ trim: true })
  description?: string;

  @Prop({ required: true, default: 'gpt-4' })
  model: string;

  @Prop({
    type: String,
    enum: Object.values(AIProvider),
    default: AIProvider.OPENAI,
  })
  provider: AIProvider;

  @Prop({ required: true })
  apiKeyEncrypted: string;

  @Prop({ default: 'https://api.openai.com/v1' })
  endpointUrl: string;

  @Prop({ type: Object, default: {} })
  configParams: {
    temperature?: number;
    maxTokens?: number;
    topP?: number;
    frequencyPenalty?: number;
    presencePenalty?: number;
    systemPrompt?: string;
    functions?: any[];
    tools?: any[];
  };

  @Prop({
    type: String,
    enum: Object.values(VirtualAgentStatus),
    default: VirtualAgentStatus.ACTIVE,
  })
  status: VirtualAgentStatus;

  @Prop({ type: Object })
  metadata?: Record<string, any>;
}

export const VirtualAgentSchema = SchemaFactory.createForClass(VirtualAgent);

// Compound indexes for multitenant queries
VirtualAgentSchema.index({ tenantId: 1, status: 1 });
VirtualAgentSchema.index({ tenantId: 1, name: 1 });
VirtualAgentSchema.index({ status: 1 });
VirtualAgentSchema.index({ createdAt: -1 });
