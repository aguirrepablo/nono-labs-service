import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, FilterQuery } from 'mongoose';
import {
  Conversation,
  ConversationDocument,
} from '../../schemas/conversation.schema';
import { BaseRepository } from './base.repository';

@Injectable()
export class ConversationRepository extends BaseRepository<ConversationDocument> {
  constructor(
    @InjectModel(Conversation.name)
    private readonly conversationModel: Model<ConversationDocument>,
  ) {
    super(conversationModel);
  }

  /**
   * Finds conversation by channel and external channel ID
   */
  async findByExternalId(
    tenantId: string,
    channelId: string,
    externalChannelId: string,
  ): Promise<ConversationDocument | null> {
    return this.findOne(tenantId, {
      channelId,
      externalChannelId,
    } as FilterQuery<ConversationDocument>);
  }
}
