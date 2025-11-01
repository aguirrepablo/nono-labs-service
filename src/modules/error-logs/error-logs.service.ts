import { Injectable, Logger } from '@nestjs/common';
import { ErrorLogRepository } from '../../common/repositories/error-log.repository';
import {
  ErrorType,
  EntityType,
  Severity,
  ErrorLogDocument,
} from '../../schemas/error-log.schema';
import { Types } from 'mongoose';

export interface LogErrorOptions {
  errorType: ErrorType;
  description: string;
  severity?: Severity;
  relatedEntityId?: string;
  entityType?: EntityType;
  stackTrace?: string;
  context?: Record<string, any>;
  metadata?: Record<string, any>;
}

@Injectable()
export class ErrorLogsService {
  private readonly logger = new Logger(ErrorLogsService.name);

  constructor(private readonly errorLogRepository: ErrorLogRepository) {}

  /**
   * Logs an error to the database
   */
  async logError(options: LogErrorOptions): Promise<ErrorLogDocument> {
    this.logger.error(
      `[${options.errorType}] ${options.description}`,
      options.stackTrace,
    );

    return this.errorLogRepository.create({
      errorType: options.errorType,
      description: options.description,
      severity: options.severity || Severity.MEDIUM,
      relatedEntityId: options.relatedEntityId
        ? new Types.ObjectId(options.relatedEntityId)
        : undefined,
      entityType: options.entityType,
      stackTrace: options.stackTrace,
      context: options.context,
      metadata: options.metadata,
      resolved: false,
    });
  }

  /**
   * Finds all error logs, optionally filtered
   */
  async findAll(filters?: {
    errorType?: ErrorType;
    severity?: Severity;
    resolved?: boolean;
    tenantId?: string;
  }): Promise<ErrorLogDocument[]> {
    const query: any = {};

    if (filters?.errorType) {
      query.errorType = filters.errorType;
    }

    if (filters?.severity) {
      query.severity = filters.severity;
    }

    if (filters?.resolved !== undefined) {
      query.resolved = filters.resolved;
    }

    if (filters?.tenantId) {
      query['context.tenantId'] = filters.tenantId;
    }

    return this.errorLogRepository.find(query);
  }

  /**
   * Marks an error log as resolved
   */
  async markAsResolved(
    id: string,
    resolvedBy: string,
    resolutionNotes?: string,
  ): Promise<ErrorLogDocument | null> {
    return this.errorLogRepository.markAsResolved(
      id,
      resolvedBy,
      resolutionNotes,
    );
  }

  /**
   * Utility: Log exception with full context
   */
  async logException(
    error: Error,
    context?: Record<string, any>,
  ): Promise<ErrorLogDocument> {
    return this.logError({
      errorType: ErrorType.INTERNAL,
      description: error.message,
      severity: Severity.HIGH,
      stackTrace: error.stack,
      context,
    });
  }
}
