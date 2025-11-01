import { MessageDocument } from '../../schemas/message.schema';
import { Attachment } from '../../schemas/message.schema';

/**
 * Standard interface for all channel implementations
 * Each channel (Telegram, WhatsApp, Slack, etc.) must implement this interface
 */
export interface IChannelService {
  /**
   * Sends a message through the channel
   * @param channelConfig - Decrypted channel configuration
   * @param recipientId - External ID of the recipient (chat_id, phone, etc.)
   * @param message - Message to send
   * @returns External message ID assigned by the channel
   */
  sendMessage(
    channelConfig: any,
    recipientId: string,
    message: {
      content?: string;
      attachments?: Attachment[];
    },
  ): Promise<string>;

  /**
   * Processes incoming message/event from the channel
   * @param channelConfig - Decrypted channel configuration
   * @param event - Raw event/webhook payload from the channel
   * @returns Normalized message data
   */
  receiveMessage(
    channelConfig: any,
    event: any,
  ): Promise<{
    externalChannelId: string;
    authorId: string;
    authorName?: string;
    content?: string;
    attachments?: Attachment[];
    type?: string;
    externalMessageId?: string;
    metadata?: Record<string, any>;
  }>;

  /**
   * Uploads a document/file to the channel
   * @param channelConfig - Decrypted channel configuration
   * @param recipientId - External ID of the recipient
   * @param document - Document to upload
   * @returns External file ID or URL
   */
  uploadDocument(
    channelConfig: any,
    recipientId: string,
    document: {
      url: string;
      fileName?: string;
      mimeType?: string;
    },
  ): Promise<string>;

  /**
   * Retrieves channel metadata (health check, status, etc.)
   * @param channelConfig - Decrypted channel configuration
   * @returns Channel metadata
   */
  getChannelMetadata(channelConfig: any): Promise<{
    isHealthy: boolean;
    lastError?: string;
    metadata?: Record<string, any>;
  }>;
}
