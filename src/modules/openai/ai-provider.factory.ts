import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { AIProvider } from '../../schemas/virtual-agent.schema';
import { IAIProvider } from './ai-provider.interface';
import { OpenAIService } from './openai.service';

/**
 * Factory for selecting the appropriate AI provider service
 */
@Injectable()
export class AIProviderFactory {
  private readonly logger = new Logger(AIProviderFactory.name);

  constructor(private readonly openaiService: OpenAIService) {}

  /**
   * Gets the appropriate AI provider service based on the provider type
   */
  getProvider(provider: AIProvider): IAIProvider {
    switch (provider) {
      case AIProvider.OPENAI:
        this.logger.debug('Using OpenAI provider');
        return this.openaiService;
      default:
        throw new BadRequestException(
          `Unsupported AI provider: ${provider}. Supported providers are: ${Object.values(AIProvider).join(', ')}`,
        );
    }
  }
}
