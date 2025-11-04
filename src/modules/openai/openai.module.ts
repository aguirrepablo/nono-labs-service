import { Module } from '@nestjs/common';
import { OpenAIService } from './openai.service';
import { AIProviderFactory } from './ai-provider.factory';
import { MediaProcessorService } from './media-processor.service';
import { MCPClientService } from './mcp-client.service';
import { MCPAdapterService } from './mcp-adapter.service';
import { MCPManagerService } from './mcp-manager.service';
import { VirtualAgentsModule } from '../virtual-agents/virtual-agents.module';
import { MessagesModule } from '../messages/messages.module';

@Module({
  imports: [VirtualAgentsModule, MessagesModule],
  providers: [
    OpenAIService,
    MediaProcessorService,
    AIProviderFactory,
    MCPClientService,
    MCPAdapterService,
    MCPManagerService,
  ],
  exports: [
    OpenAIService,
    MediaProcessorService,
    AIProviderFactory,
    MCPClientService,
    MCPAdapterService,
    MCPManagerService,
  ],
})
export class OpenAIModule {}
