import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, FilterQuery, Types } from 'mongoose';
import { Message, MessageDocument } from '../../schemas/message.schema';

/**
 * Message repository - Note: Messages don't have tenantId directly
 * Access control is enforced through conversationId validation
 */
@Injectable()
export class MessageRepository {
  constructor(
    @InjectModel(Message.name)
    private readonly messageModel: Model<MessageDocument>,
  ) {}

  async create(data: Partial<Message>): Promise<MessageDocument> {
    const message = new this.messageModel(data);
    return message.save();
  }

  async findByConversation(
    conversationId: string,
    limit?: number,
  ): Promise<MessageDocument[]> {
    const query = this.messageModel
      .find({ conversationId: new Types.ObjectId(conversationId) })
      .sort({ createdAt: -1 });

    if (limit) {
      query.limit(limit);
    }

    return query.exec();
  }

  async findById(id: string): Promise<MessageDocument | null> {
    return this.messageModel.findById(id).exec();
  }

  async update(
    id: string,
    data: Partial<Message>,
  ): Promise<MessageDocument | null> {
    return this.messageModel
      .findByIdAndUpdate(id, data, { new: true })
      .exec();
  }

  async delete(id: string): Promise<MessageDocument | null> {
    return this.messageModel.findByIdAndDelete(id).exec();
  }

  async countByConversation(conversationId: string): Promise<number> {
    return this.messageModel
      .countDocuments({ conversationId: new Types.ObjectId(conversationId) })
      .exec();
  }
}
