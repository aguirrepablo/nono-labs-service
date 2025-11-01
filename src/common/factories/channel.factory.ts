import { Injectable, BadRequestException, Inject, Optional } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { IChannelService } from '../interfaces/channel-service.interface';
import { ChannelType } from '../../schemas/channel.schema';
import { TelegramChannelService } from '../../modules/telegram/telegram-channel.service';

/**
 * Factory for dynamically instantiating channel services
 * Direct injection for implemented channel services, with fallback to ModuleRef for others
 */
@Injectable()
export class ChannelFactory {
  // Mapping of channel types to service instances
  private readonly channelServiceMap: Map<ChannelType, IChannelService>;

  constructor(
    private readonly moduleRef: ModuleRef,
    @Optional() private readonly telegramChannelService?: TelegramChannelService,
  ) {
    // Initialize the map with available services
    this.channelServiceMap = new Map();

    if (this.telegramChannelService) {
      this.channelServiceMap.set(ChannelType.TELEGRAM, this.telegramChannelService);
    }

    // Placeholders for future channel implementations
    // [ChannelType.WHATSAPP, 'WhatsAppChannelService'],
    // [ChannelType.SLACK, 'SlackChannelService'],
    // [ChannelType.WEB, 'WebChannelService'],
    // [ChannelType.API, 'ApiChannelService'],
  }

  /**
   * Returns appropriate channel service for the given channel type
   * @param channelType - Type of channel
   * @returns Channel service implementation
   */
  getChannelService(channelType: ChannelType): IChannelService {
    const service = this.channelServiceMap.get(channelType);

    if (!service) {
      throw new BadRequestException(
        `Unsupported or unavailable channel type: ${channelType}. Only Telegram is currently implemented.`,
      );
    }

    return service;
  }

  /**
   * Checks if a channel type is supported
   */
  isChannelSupported(channelType: ChannelType): boolean {
    return this.channelServiceMap.has(channelType);
  }

  /**
   * Returns list of all available and implemented channel types
   */
  getSupportedChannels(): ChannelType[] {
    return Array.from(this.channelServiceMap.keys());
  }
}
