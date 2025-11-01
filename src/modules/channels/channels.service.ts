import { Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import { ChannelRepository } from '../../common/repositories/channel.repository';
import { EncryptionService } from '../../common/encryption/encryption.service';
import { CreateChannelDto, UpdateChannelDto } from '../../dto/channel.dto';
import { ChannelDocument } from '../../schemas/channel.schema';

@Injectable()
export class ChannelsService {
  constructor(
    private readonly channelRepository: ChannelRepository,
    private readonly encryptionService: EncryptionService,
  ) {}

  /**
   * Encrypts sensitive fields in channel config
   */
  private encryptSensitiveConfig(config: any): any {
    const encryptedConfig = { ...config };
    const sensitiveFields = ['apiToken', 'apiKey', 'webhookSecret'];

    for (const field of sensitiveFields) {
      if (config[field]) {
        encryptedConfig[field] = this.encryptionService.encrypt(config[field]);
      }
    }

    return encryptedConfig;
  }

  /**
   * Converts string defaultVirtualAgentId to ObjectId if provided
   */
  private convertAgentIdToObjectId(
    data: any,
  ): any {
    if (data.defaultVirtualAgentId && typeof data.defaultVirtualAgentId === 'string') {
      return {
        ...data,
        defaultVirtualAgentId: new Types.ObjectId(data.defaultVirtualAgentId),
      };
    }
    return data;
  }

  async create(
    tenantId: string,
    createDto: CreateChannelDto,
  ): Promise<ChannelDocument> {
    const data = {
      ...createDto,
      config: this.encryptSensitiveConfig(createDto.config),
    };

    const convertedData = this.convertAgentIdToObjectId(data);
    return this.channelRepository.create(tenantId, convertedData);
  }

  async findAll(tenantId: string): Promise<ChannelDocument[]> {
    return this.channelRepository.find(tenantId);
  }

  async findOne(tenantId: string, id: string): Promise<ChannelDocument> {
    return this.channelRepository.findByIdOrFail(tenantId, id);
  }

  async update(
    tenantId: string,
    id: string,
    updateDto: UpdateChannelDto,
  ): Promise<ChannelDocument> {
    const data: any = { ...updateDto };

    // Encrypt sensitive config fields if updating config
    if (updateDto.config) {
      data.config = this.encryptSensitiveConfig(updateDto.config);
    }

    // Convert defaultVirtualAgentId from string to ObjectId if provided
    const convertedData = this.convertAgentIdToObjectId(data);
    return this.channelRepository.updateOrFail(tenantId, id, convertedData);
  }

  async remove(tenantId: string, id: string): Promise<ChannelDocument> {
    return this.channelRepository.deleteOrFail(tenantId, id);
  }

  /**
   * Decrypts sensitive config for internal use
   * USE WITH CAUTION - Only for service-to-service calls
   */
  async getDecryptedConfig(tenantId: string, id: string): Promise<any> {
    const channel = await this.channelRepository.findByIdOrFail(tenantId, id);
    const config = { ...channel.config };
    const sensitiveFields = ['apiToken', 'apiKey', 'webhookSecret'];

    for (const field of sensitiveFields) {
      if (config[field]) {
        config[field] = this.encryptionService.decrypt(config[field]);
      }
    }

    return config;
  }
}
