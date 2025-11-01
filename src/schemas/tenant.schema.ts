import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type TenantDocument = Tenant & Document;

export enum TenantStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
}

@Schema({ timestamps: true })
export class Tenant {
  @Prop({ required: true, unique: true, trim: true })
  name: string;

  @Prop({ required: true, unique: true, trim: true })
  slug: string;

  @Prop({ type: Object, default: {} })
  config: {
    branding?: {
      logo?: string;
      primaryColor?: string;
      name?: string;
    };
    limits?: {
      maxConversations?: number;
      maxMessagesPerMonth?: number;
      maxVirtualAgents?: number;
    };
    settings?: Record<string, any>;
  };

  @Prop({
    type: String,
    enum: Object.values(TenantStatus),
    default: TenantStatus.ACTIVE,
  })
  status: TenantStatus;

  @Prop({ trim: true })
  contactEmail?: string;

  @Prop({ type: Object })
  metadata?: Record<string, any>;
}

export const TenantSchema = SchemaFactory.createForClass(Tenant);

// Indexes for performance
// Note: name and slug already have unique indexes from @Prop({ unique: true })
TenantSchema.index({ status: 1 });
TenantSchema.index({ createdAt: -1 });
