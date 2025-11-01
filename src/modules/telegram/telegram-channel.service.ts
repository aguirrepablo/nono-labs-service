import { Injectable } from '@nestjs/common';
import TelegramBot from 'node-telegram-bot-api';
import { BaseChannelService } from '../../common/channels/base-channel.service';
import { Attachment } from '../../schemas/message.schema';

@Injectable()
export class TelegramChannelService extends BaseChannelService {
  constructor() {
    super('Telegram');
  }

  /**
   * Creates TelegramBot instance for a channel
   */
  private createBot(channelConfig: any): TelegramBot {
    this.validateConfig(channelConfig, ['apiToken']);
    return new TelegramBot(channelConfig.apiToken, { polling: false });
  }

  async sendMessage(
    channelConfig: any,
    recipientId: string,
    message: { content?: string; attachments?: Attachment[] },
  ): Promise<string> {
    try {
      const bot = this.createBot(channelConfig);

      // Send text message
      if (message.content) {
        const sentMessage = await bot.sendMessage(recipientId, message.content);
        return sentMessage.message_id.toString();
      }

      // Send attachments
      if (message.attachments && message.attachments.length > 0) {
        const attachment = message.attachments[0];

        if (attachment.mimeType?.startsWith('image/')) {
          const sentMessage = await bot.sendPhoto(recipientId, attachment.url);
          return sentMessage.message_id.toString();
        } else if (attachment.mimeType?.startsWith('video/')) {
          const sentMessage = await bot.sendVideo(recipientId, attachment.url);
          return sentMessage.message_id.toString();
        } else {
          const sentMessage = await bot.sendDocument(recipientId, attachment.url);
          return sentMessage.message_id.toString();
        }
      }

      throw new Error('No content or attachments to send');
    } catch (error) {
      return this.handleError('sendMessage', error);
    }
  }

  async receiveMessage(
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
  }> {
    try {
      const message = event.message || event.edited_message;

      if (!message) {
        throw new Error('No message in event');
      }

      console.log('message.chat.type', message.chat.type);

      const result: any = {
        externalChannelId: message.chat.id.toString(),
        authorId: message.from.id.toString(),
        authorName: message.from.username || message.from.first_name || 'User',
        externalMessageId: message.message_id.toString(),
        metadata: {
          chatType: message.chat.type,
          date: message.date,
          editDate: message.edit_date,
        },
      };

      // Text message
      if (message.text) {
        result.content = message.text;
        result.type = 'text';
      }

      // Photo
      if (message.photo && message.photo.length > 0) {
        const photo = message.photo[message.photo.length - 1]; // Largest photo
        result.attachments = [
          {
            url: photo.file_id, // Telegram file_id (will need to be resolved to URL)
            mimeType: 'image/jpeg',
            fileSize: photo.file_size,
            width: photo.width,
            height: photo.height,
          },
        ];
        result.type = 'image';
        result.content = message.caption || '';
      }

      // Document
      if (message.document) {
        result.attachments = [
          {
            url: message.document.file_id,
            mimeType: message.document.mime_type || 'application/octet-stream',
            fileName: message.document.file_name,
            fileSize: message.document.file_size,
          },
        ];
        result.type = 'document';
        result.content = message.caption || '';
      }

      // Voice/Audio
      if (message.voice || message.audio) {
        const audio = message.voice || message.audio;
        result.attachments = [
          {
            url: audio.file_id,
            mimeType: audio.mime_type || 'audio/ogg',
            fileSize: audio.file_size,
            duration: audio.duration,
          },
        ];
        result.type = message.voice ? 'voice' : 'audio';
      }

      // Video
      if (message.video) {
        result.attachments = [
          {
            url: message.video.file_id,
            mimeType: message.video.mime_type || 'video/mp4',
            fileSize: message.video.file_size,
            width: message.video.width,
            height: message.video.height,
            duration: message.video.duration,
          },
        ];
        result.type = 'video';
        result.content = message.caption || '';
      }

      return result;
    } catch (error) {
      return this.handleError('receiveMessage', error);
    }
  }

  async uploadDocument(
    channelConfig: any,
    recipientId: string,
    document: { url: string; fileName?: string; mimeType?: string },
  ): Promise<string> {
    try {
      const bot = this.createBot(channelConfig);

      const sentMessage = await bot.sendDocument(recipientId, document.url, {
        caption: document.fileName,
      });

      return sentMessage.message_id.toString();
    } catch (error) {
      return this.handleError('uploadDocument', error);
    }
  }

  /**
   * Detects member join/leave events in Telegram groups
   * Returns information about the member change event
   */
  async detectMemberEvent(
    event: any,
  ): Promise<{
    isMemberEvent: boolean;
    eventType?: 'join' | 'leave';
    member?: { id: string; name: string };
    chatId?: string;
  }> {
    try {
      const message = event.message || event.edited_message;

      if (!message) {
        return { isMemberEvent: false };
      }

      // Check for new members joining
      if (message.new_chat_members && message.new_chat_members.length > 0) {
        const newMembers = message.new_chat_members;
        this.logger.log(
          `New member(s) joined chat ${message.chat.id}: ${newMembers.map((m: any) => m.first_name).join(', ')}`,
        );

        return {
          isMemberEvent: true,
          eventType: 'join',
          member: {
            id: newMembers[0].id.toString(),
            name: newMembers[0].username || newMembers[0].first_name || 'Unknown',
          },
          chatId: message.chat.id.toString(),
        };
      }

      // Check for member leaving
      if (message.left_chat_member) {
        const leftMember = message.left_chat_member;
        this.logger.log(
          `Member left chat ${message.chat.id}: ${leftMember.first_name}`,
        );

        return {
          isMemberEvent: true,
          eventType: 'leave',
          member: {
            id: leftMember.id.toString(),
            name: leftMember.username || leftMember.first_name || 'Unknown',
          },
          chatId: message.chat.id.toString(),
        };
      }

      return { isMemberEvent: false };
    } catch (error) {
      this.logger.error('Error detecting member event:', error);
      return { isMemberEvent: false };
    }
  }

  async getChannelMetadata(channelConfig: any): Promise<{
    isHealthy: boolean;
    lastError?: string;
    metadata?: Record<string, any>;
  }> {
    try {
      const bot = this.createBot(channelConfig);

      // Test connection by getting bot info
      const botInfo = await bot.getMe();

      return {
        isHealthy: true,
        metadata: {
          botId: botInfo.id,
          botUsername: botInfo.username,
          botFirstName: botInfo.first_name,
        },
      };
    } catch (error) {
      this.logger.error('Health check failed:', error);
      return {
        isHealthy: false,
        lastError: error.message,
      };
    }
  }
}
