import { Module } from '@nestjs/common';
import { OpenAIService } from './openai.service';
import { AIProviderFactory } from './ai-provider.factory';
import { MediaProcessorService } from './media-processor.service';
import { VirtualAgentsModule } from '../virtual-agents/virtual-agents.module';
import { MessagesModule } from '../messages/messages.module';

@Module({
  imports: [VirtualAgentsModule, MessagesModule],
  providers: [OpenAIService, MediaProcessorService, AIProviderFactory],
  exports: [OpenAIService, MediaProcessorService, AIProviderFactory],
})
export class OpenAIModule {}
