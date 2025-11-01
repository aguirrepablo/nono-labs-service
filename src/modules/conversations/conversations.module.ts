import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConversationsService } from './conversations.service';
import { ConversationsController } from './conversations.controller';
import { ConversationOrchestratorService } from './conversation-orchestrator.service';
import {
  Conversation,
  ConversationSchema,
} from '../../schemas/conversation.schema';
import { ConversationRepository } from '../../common/repositories/conversation.repository';
import { TenantsModule } from '../tenants/tenants.module';
import { MessagesModule } from '../messages/messages.module';
import { OpenAIModule } from '../openai/openai.module';
import { ChannelsModule } from '../channels/channels.module';
import { VirtualAgentsModule } from '../virtual-agents/virtual-agents.module';
import { TelegramChannelService } from '../telegram/telegram-channel.service';
import { ChannelFactory } from '../../common/factories/channel.factory';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Conversation.name, schema: ConversationSchema },
    ]),
    TenantsModule,
    forwardRef(() => MessagesModule),
    OpenAIModule,
    ChannelsModule,
    VirtualAgentsModule,
  ],
  controllers: [ConversationsController],
  providers: [
    ConversationsService,
    ConversationRepository,
    ConversationOrchestratorService,
    TelegramChannelService,
    ChannelFactory,
  ],
  exports: [
    ConversationsService,
    ConversationRepository,
    ConversationOrchestratorService,
  ],
})
export class ConversationsModule {}
