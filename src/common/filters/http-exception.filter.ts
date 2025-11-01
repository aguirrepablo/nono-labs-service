import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ErrorLogsService } from '../../modules/error-logs/error-logs.service';
import { ErrorType, Severity } from '../../schemas/error-log.schema';

/**
 * Global exception filter that:
 * 1. Logs errors to ErrorLog collection
 * 2. Returns consistent error responses
 * 3. Masks sensitive information in production
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  constructor(private readonly errorLogsService: ErrorLogsService) {}

  async catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.message
        : 'Internal server error';

    const exceptionResponse =
      exception instanceof HttpException
        ? exception.getResponse()
        : null;

    // Determine error type and severity
    let errorType: ErrorType = ErrorType.INTERNAL;
    let severity: Severity = Severity.HIGH;

    if (status === HttpStatus.BAD_REQUEST) {
      errorType = ErrorType.VALIDATION;
      severity = Severity.LOW;
    } else if (status === HttpStatus.UNAUTHORIZED) {
      errorType = ErrorType.AUTHENTICATION;
      severity = Severity.MEDIUM;
    } else if (status === HttpStatus.FORBIDDEN) {
      errorType = ErrorType.AUTHORIZATION;
      severity = Severity.MEDIUM;
    } else if (status === HttpStatus.NOT_FOUND) {
      errorType = ErrorType.NOT_FOUND;
      severity = Severity.LOW;
    } else if (status === HttpStatus.TOO_MANY_REQUESTS) {
      errorType = ErrorType.RATE_LIMIT;
      severity = Severity.MEDIUM;
    }

    // Log error to database
    try {
      await this.errorLogsService.logError({
        errorType,
        description: message,
        severity,
        stackTrace: exception instanceof Error ? exception.stack : undefined,
        context: {
          tenantId: (request as any).tenantId,
          userId: (request as any).userId,
          endpoint: request.url,
          method: request.method,
          statusCode: status,
          userAgent: request.headers['user-agent'],
          ip: request.ip,
        },
      });
    } catch (logError) {
      this.logger.error('Failed to log error to database:', logError);
    }

    // Build response
    const errorResponse: any = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message,
    };

    // Include validation errors if present
    if (
      exceptionResponse &&
      typeof exceptionResponse === 'object' &&
      'message' in exceptionResponse
    ) {
      errorResponse.details = (exceptionResponse as any).message;
    }

    // Include stack trace in development
    if (
      process.env.NODE_ENV === 'development' &&
      exception instanceof Error
    ) {
      errorResponse.stack = exception.stack;
    }

    response.status(status).json(errorResponse);
  }
}
