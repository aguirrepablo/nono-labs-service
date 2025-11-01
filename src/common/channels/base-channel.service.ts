import { Logger } from '@nestjs/common';
import { IChannelService } from '../interfaces/channel-service.interface';

/**
 * Abstract base class for channel implementations
 * Provides common functionality and logging
 */
export abstract class BaseChannelService implements IChannelService {
  protected readonly logger: Logger;

  constructor(channelType: string) {
    this.logger = new Logger(`${channelType}ChannelService`);
  }

  abstract sendMessage(
    channelConfig: any,
    recipientId: string,
    message: { content?: string; attachments?: any[] },
  ): Promise<string>;

  abstract receiveMessage(
    channelConfig: any,
    event: any,
  ): Promise<{
    externalChannelId: string;
    authorId: string;
    content?: string;
    attachments?: any[];
    type?: string;
  }>;

  abstract uploadDocument(
    channelConfig: any,
    recipientId: string,
    document: { url: string; fileName?: string; mimeType?: string },
  ): Promise<string>;

  abstract getChannelMetadata(channelConfig: any): Promise<{
    isHealthy: boolean;
    lastError?: string;
    metadata?: Record<string, any>;
  }>;

  /**
   * Validates that required config fields are present
   */
  protected validateConfig(
    config: any,
    requiredFields: string[],
  ): void {
    for (const field of requiredFields) {
      if (!config[field]) {
        throw new Error(`Missing required config field: ${field}`);
      }
    }
  }

  /**
   * Handles errors consistently across channels
   */
  protected handleError(operation: string, error: any): never {
    this.logger.error(`${operation} failed:`, error);
    throw new Error(`${operation} failed: ${error.message}`);
  }
}
