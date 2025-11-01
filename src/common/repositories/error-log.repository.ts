import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, FilterQuery } from 'mongoose';
import { ErrorLog, ErrorLogDocument } from '../../schemas/error-log.schema';

@Injectable()
export class ErrorLogRepository {
  constructor(
    @InjectModel(ErrorLog.name)
    private readonly errorLogModel: Model<ErrorLogDocument>,
  ) {}

  async create(data: Partial<ErrorLog>): Promise<ErrorLogDocument> {
    const errorLog = new this.errorLogModel(data);
    return errorLog.save();
  }

  async find(filter: FilterQuery<ErrorLog> = {}): Promise<ErrorLogDocument[]> {
    return this.errorLogModel.find(filter).sort({ createdAt: -1 }).exec();
  }

  async findById(id: string): Promise<ErrorLogDocument | null> {
    return this.errorLogModel.findById(id).exec();
  }

  async update(
    id: string,
    data: Partial<ErrorLog>,
  ): Promise<ErrorLogDocument | null> {
    return this.errorLogModel
      .findByIdAndUpdate(id, data, { new: true })
      .exec();
  }

  async markAsResolved(
    id: string,
    resolvedBy: string,
    resolutionNotes?: string,
  ): Promise<ErrorLogDocument | null> {
    return this.errorLogModel
      .findByIdAndUpdate(
        id,
        {
          resolved: true,
          resolvedAt: new Date(),
          resolvedBy,
          resolutionNotes,
        },
        { new: true },
      )
      .exec();
  }
}
