import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { VirtualAgentsService } from './virtual-agents.service';
import { VirtualAgentsController } from './virtual-agents.controller';
import {
  VirtualAgent,
  VirtualAgentSchema,
} from '../../schemas/virtual-agent.schema';
import { VirtualAgentRepository } from '../../common/repositories/virtual-agent.repository';
import { TenantsModule } from '../tenants/tenants.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: VirtualAgent.name, schema: VirtualAgentSchema },
    ]),
    TenantsModule,
  ],
  controllers: [VirtualAgentsController],
  providers: [VirtualAgentsService, VirtualAgentRepository],
  exports: [VirtualAgentsService, VirtualAgentRepository],
})
export class VirtualAgentsModule {}
