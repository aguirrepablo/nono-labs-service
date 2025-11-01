import { Injectable, NotFoundException } from '@nestjs/common';
import { ConversationRepository } from '../../common/repositories/conversation.repository';
import {
  CreateConversationDto,
  UpdateConversationDto,
} from '../../dto/conversation.dto';
import { ConversationDocument } from '../../schemas/conversation.schema';
import { Types } from 'mongoose';

@Injectable()
export class ConversationsService {
  constructor(
    private readonly conversationRepository: ConversationRepository,
  ) {}

  async create(
    tenantId: string,
    createDto: CreateConversationDto,
  ): Promise<ConversationDocument> {
    return this.conversationRepository.create(tenantId, createDto as any);
  }

  async findAll(tenantId: string): Promise<ConversationDocument[]> {
    return this.conversationRepository.find(tenantId);
  }

  async findOne(
    tenantId: string,
    id: string,
  ): Promise<ConversationDocument> {
    return this.conversationRepository.findByIdOrFail(tenantId, id);
  }

  async findByExternalId(
    tenantId: string,
    channelId: string,
    externalChannelId: string,
  ): Promise<ConversationDocument | null> {
    return this.conversationRepository.findByExternalId(
      tenantId,
      channelId,
      externalChannelId,
    );
  }

  async update(
    tenantId: string,
    id: string,
    updateDto: UpdateConversationDto,
  ): Promise<ConversationDocument> {
    return this.conversationRepository.updateOrFail(tenantId, id, updateDto);
  }

  async remove(
    tenantId: string,
    id: string,
  ): Promise<ConversationDocument> {
    return this.conversationRepository.deleteOrFail(tenantId, id);
  }

  /**
   * Updates conversation metadata after a new message
   */
  async updateOnNewMessage(
    tenantId: string,
    conversationId: string,
  ): Promise<void> {
    await this.conversationRepository.update(tenantId, conversationId, {
      lastMessageAt: new Date(),
      $inc: { messageCount: 1 } as any,
    });
  }
}
