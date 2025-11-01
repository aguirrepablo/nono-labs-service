import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ErrorLogDocument = ErrorLog & Document;

export enum ErrorType {
  VALIDATION = 'validation',
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  NOT_FOUND = 'not_found',
  EXTERNAL_API = 'external_api',
  DATABASE = 'database',
  NETWORK = 'network',
  INTERNAL = 'internal',
  RATE_LIMIT = 'rate_limit',
  TIMEOUT = 'timeout',
}

export enum EntityType {
  TENANT = 'tenant',
  VIRTUAL_AGENT = 'virtual_agent',
  CHANNEL = 'channel',
  CONVERSATION = 'conversation',
  MESSAGE = 'message',
  SYSTEM = 'system',
}

export enum Severity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

@Schema({ timestamps: true })
export class ErrorLog {
  @Prop({ type: Types.ObjectId, required: false })
  relatedEntityId?: Types.ObjectId;

  @Prop({
    type: String,
    enum: Object.values(EntityType),
    required: false,
  })
  entityType?: EntityType;

  @Prop({
    type: String,
    enum: Object.values(ErrorType),
    required: true,
  })
  errorType: ErrorType;

  @Prop({
    type: String,
    enum: Object.values(Severity),
    default: Severity.MEDIUM,
  })
  severity: Severity;

  @Prop({ required: true })
  description: string;

  @Prop({ type: String })
  stackTrace?: string;

  @Prop({ type: Object })
  context?: {
    tenantId?: string;
    userId?: string;
    requestId?: string;
    endpoint?: string;
    method?: string;
    statusCode?: number;
    [key: string]: any;
  };

  @Prop({ type: Object })
  metadata?: Record<string, any>;

  @Prop({ default: false })
  resolved: boolean;

  @Prop()
  resolvedAt?: Date;

  @Prop()
  resolvedBy?: string;

  @Prop()
  resolutionNotes?: string;
}

export const ErrorLogSchema = SchemaFactory.createForClass(ErrorLog);

// Indexes for querying and filtering
ErrorLogSchema.index({ errorType: 1, createdAt: -1 });
ErrorLogSchema.index({ severity: 1, resolved: 1 });
ErrorLogSchema.index({ relatedEntityId: 1, entityType: 1 });
ErrorLogSchema.index({ 'context.tenantId': 1, createdAt: -1 });
ErrorLogSchema.index({ resolved: 1, createdAt: -1 });
ErrorLogSchema.index({ createdAt: -1 });
