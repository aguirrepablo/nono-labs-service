import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { MessageRepository } from '../../common/repositories/message.repository';
import { ConversationRepository } from '../../common/repositories/conversation.repository';
import { CreateMessageDto, UpdateMessageDto } from '../../dto/message.dto';
import { MessageDocument } from '../../schemas/message.schema';
import { Types } from 'mongoose';

@Injectable()
export class MessagesService {
  constructor(
    private readonly messageRepository: MessageRepository,
    private readonly conversationRepository: ConversationRepository,
  ) {}

  /**
   * Validates that conversation belongs to tenant
   */
  private async validateConversationAccess(
    tenantId: string,
    conversationId: string,
  ): Promise<void> {
    const conversation = await this.conversationRepository.findById(
      tenantId,
      conversationId,
    );

    if (!conversation) {
      throw new ForbiddenException(
        'Conversation not found or does not belong to tenant',
      );
    }
  }

  async create(
    tenantId: string,
    createDto: CreateMessageDto,
  ): Promise<MessageDocument> {
    // Validate tenant has access to this conversation
    await this.validateConversationAccess(tenantId, createDto.conversationId);

    return this.messageRepository.create(createDto as any);
  }

  async findByConversation(
    tenantId: string,
    conversationId: string,
    limit?: number,
  ): Promise<MessageDocument[]> {
    // Validate tenant has access to this conversation
    await this.validateConversationAccess(tenantId, conversationId);

    return this.messageRepository.findByConversation(conversationId, limit);
  }

  async findOne(tenantId: string, id: string): Promise<MessageDocument> {
    const message = await this.messageRepository.findById(id);

    if (!message) {
      throw new NotFoundException(`Message with ID ${id} not found`);
    }

    // Validate tenant has access to this message's conversation
    await this.validateConversationAccess(
      tenantId,
      message.conversationId.toString(),
    );

    return message;
  }

  async update(
    tenantId: string,
    id: string,
    updateDto: UpdateMessageDto,
  ): Promise<MessageDocument> {
    const message = await this.findOne(tenantId, id);

    const updated = await this.messageRepository.update(id, updateDto as any);

    if (!updated) {
      throw new NotFoundException(`Message with ID ${id} not found`);
    }

    return updated;
  }

  async remove(tenantId: string, id: string): Promise<MessageDocument> {
    const message = await this.findOne(tenantId, id);

    const deleted = await this.messageRepository.delete(id);

    if (!deleted) {
      throw new NotFoundException(`Message with ID ${id} not found`);
    }

    return deleted;
  }
}
