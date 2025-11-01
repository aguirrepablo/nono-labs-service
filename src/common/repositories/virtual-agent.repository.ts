import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  VirtualAgent,
  VirtualAgentDocument,
} from '../../schemas/virtual-agent.schema';
import { BaseRepository } from './base.repository';

@Injectable()
export class VirtualAgentRepository extends BaseRepository<VirtualAgentDocument> {
  constructor(
    @InjectModel(VirtualAgent.name)
    private readonly virtualAgentModel: Model<VirtualAgentDocument>,
  ) {
    super(virtualAgentModel);
  }
}
