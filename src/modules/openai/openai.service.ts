import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { VirtualAgentsService } from '../virtual-agents/virtual-agents.service';
import { MessagesService } from '../messages/messages.service';
import { AuthorRole, MessageType } from '../../schemas/message.schema';
import { MediaProcessorService } from './media-processor.service';
import {
  IAIProvider,
  ChatCompletionRequest,
  ChatCompletionResponse,
} from './ai-provider.interface';

export interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content?: string | OpenAIContentBlock[] | null;
  tool_calls?: Array<{
    id: string;
    type: string;
    function: {
      name: string;
      arguments: string;
    };
  }>;
  tool_call_id?: string; // For role 'tool'
  name?: string; // For role 'tool' (function name)
}

export interface OpenAIContentBlock {
  type: 'text' | 'image_url' | 'image';
  text?: string;
  image_url?: {
    url: string;
  };
  image_data?: {
    data: string;
    media_type: string;
  };
}

@Injectable()
export class OpenAIService implements IAIProvider {
  private readonly logger = new Logger(OpenAIService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly virtualAgentsService: VirtualAgentsService,
    private readonly messagesService: MessagesService,
    private readonly mediaProcessorService: MediaProcessorService,
  ) {}

  /**
   * Creates OpenAI client for a specific virtual agent
   */
  private async getOpenAIClient(
    tenantId: string,
    virtualAgentId: string,
  ): Promise<{ client: OpenAI; agent: any }> {
    const agent = await this.virtualAgentsService.findOne(
      tenantId,
      virtualAgentId,
    );

    // Decrypt API key
    try {
      const apiKey = await this.virtualAgentsService.getDecryptedApiKey(
        tenantId,
        virtualAgentId,
      );

      const client = new OpenAI({
        apiKey,
        baseURL: agent.endpointUrl || 'https://api.openai.com/v1',
      });

      return { client, agent };
    } catch (error) {
      this.logger.error(
        `Failed to decrypt API key for virtual agent ${virtualAgentId} in tenant ${tenantId}`,
        error,
      );
      throw new Error(
        `Cannot initialize AI service for agent "${agent.name}". ` +
        `The API key is either missing or encrypted with a different key. ` +
        `Please update the virtual agent's API key in the settings.`,
      );
    }
  }

  /**
   * Builds conversation context from previous messages
   * Supports multimodal content (text, images, transcribed audio, extracted documents)
   */
  private async buildContext(
    tenantId: string,
    conversationId: string,
    systemPrompt?: string,
    contextLimit: number = 20,
    channelConfig?: any,
  ): Promise<OpenAIMessage[]> {
    const messages: OpenAIMessage[] = [];

    // Add system prompt if exists
    if (systemPrompt) {
      messages.push({
        role: 'system',
        content: systemPrompt,
      });
    }

    // Fetch recent messages
    const conversationMessages = await this.messagesService.findByConversation(
      tenantId,
      conversationId,
      contextLimit,
    );

    // Convert to OpenAI format (reverse to get chronological order)
    for (const msg of conversationMessages.reverse()) {
      let role: 'user' | 'assistant' = 'user';
      if (msg.authorRole === AuthorRole.AGENT) {
        role = 'assistant';
      }

      // For agent messages, reconstruct with tool_calls if they exist
      if (role === 'assistant') {
        const openaiResponse = msg.metadata?.openaiResponse;
        const assistantMessage: OpenAIMessage = {
          role: 'assistant',
        };

        // If agent used tools
        if (openaiResponse?.toolCalls && openaiResponse.toolCalls.length > 0) {
          assistantMessage.content = msg.content || null;
          assistantMessage.tool_calls = openaiResponse.toolCalls;
        } else {
          // Normal text response
          assistantMessage.content = msg.content;
        }

        messages.push(assistantMessage);
        continue;
      }

      // For user messages, process multimedia attachments
      const content: OpenAIContentBlock[] = [];

      // Format message with author and role for clarity in conversations
      const formattedPrefix = `@${msg.authorName}`;

      // Always add the text content first (with author/role prefix)
      if (msg.content) {
        const formattedContent = `${formattedPrefix}: ${msg.content}`;
        content.push({
          type: 'text',
          text: formattedContent,
        });
      }

      // Process attachments if any and channel config is available
      if (msg.attachments && msg.attachments.length > 0 && channelConfig?.apiToken) {
        for (const attachment of msg.attachments) {
          try {
            const processedMedia = await this.mediaProcessorService.processMedia(
              attachment.url,  // file_id from Telegram
              channelConfig.apiToken,
              this.inferMediaType(msg.type, attachment.mimeType),
              attachment.fileName,
              attachment.mimeType,
            );

            if (!processedMedia) {
              this.logger.warn(`Failed to process media: ${attachment.url}`);
              continue;
            }

            // Add processed media to content
            if (processedMedia.type === 'image' && processedMedia.imageBase64) {
              content.push({
                type: 'image_url',
                image_url: {
                  url: `data:${processedMedia.imageMimeType};base64,${processedMedia.imageBase64}`,
                },
              });
            } else if (processedMedia.type === 'audio' && processedMedia.content) {
              // For audio, add transcription as text
              content.push({
                type: 'text',
                text: `[Transcripción de audio]: ${processedMedia.content}`,
              });
            } else if (processedMedia.type === 'document' && processedMedia.content) {
              // For documents, add extracted text
              content.push({
                type: 'text',
                text: `[Documento: ${processedMedia.originalFileName}]\n${processedMedia.content}`,
              });
            }
          } catch (error) {
            this.logger.error(
              `Error processing attachment ${attachment.url}: ${error.message}`,
            );
            // Continue processing other attachments on error
          }
        }
      }

      // Add message with processed content
      if (content.length > 0) {
        messages.push({
          role,
          content: content.length === 1 && content[0].type === 'text'
            ? content[0].text || ''
            : content,
        });
      }
    }

    return messages;
  }

  /**
   * Infer media type from message type and MIME type
   */
  private inferMediaType(
    messageType: MessageType,
    mimeType?: string,
  ): 'image' | 'audio' | 'document' | 'video' {
    if (messageType === MessageType.IMAGE) return 'image';
    if (messageType === MessageType.AUDIO || messageType === MessageType.VOICE) {
      return 'audio';
    }
    if (messageType === MessageType.DOCUMENT) return 'document';
    if (messageType === MessageType.VIDEO) return 'video';

    // Fallback to MIME type detection
    if (mimeType?.startsWith('image/')) return 'image';
    if (mimeType?.startsWith('audio/')) return 'audio';
    if (mimeType?.startsWith('video/')) return 'video';

    return 'document';
  }

  /**
   * Generates AI response using OpenAI API
   */
  async generateChatCompletion(
    request: ChatCompletionRequest,
  ): Promise<ChatCompletionResponse> {
    const { tenantId, virtualAgentId, conversationId, userMessage, contextLimit, channelConfig } =
      request;

    try {
      // Get agent config and client
      const { client, agent } = await this.getOpenAIClient(
        tenantId,
        virtualAgentId,
      );

      // Build conversation context (with multimedia support)
      const messages = await this.buildContext(
        tenantId,
        conversationId,
        agent.configParams?.systemPrompt,
        contextLimit,
        channelConfig,
      );

      // Add current user message (avoid duplicates if it's already in context)
      const lastMessage = messages[messages.length - 1];
      if (!lastMessage || lastMessage.role !== 'user' || lastMessage.content !== userMessage) {
        messages.push({
          role: 'user',
          content: userMessage,
        });
      }

      this.logger.log(
        `Generating completion for conversation ${conversationId} with ${messages.length} messages using ${agent.model}`,
      );

      // Call OpenAI-compatible API
      this.logger.debug(`Messages context: ${JSON.stringify(messages)}`);

      const completion = await client.chat.completions.create({
        model: agent.model || this.configService.get('openai.defaultModel'),
        messages: messages as any,
        temperature: agent.configParams?.temperature ?? 0.7,
        max_tokens: agent.configParams?.maxTokens,
        top_p: agent.configParams?.topP,
        presence_penalty: agent.configParams?.presencePenalty,
        
        // // --- CAMBIO AQUÍ ---
        // // functions: agent.configParams?.functions, // <-- Comenta esto (obsoleto)
        tools: agent.configParams?.tools, // <-- Usa esto
        // tool_choice: agent.configParams?.tools ? 'auto' : undefined, // <-- Añade esto si usas tools
      });

      const choice = completion.choices[0];
      const usage = completion.usage;

      // Extract tool_calls if present
      const toolCalls = (choice.message as any).tool_calls;

      return {
        message: {
          content: choice.message.content || null,
          toolCalls: toolCalls
            ? toolCalls.map((tc: any) => ({
                id: tc.id,
                type: tc.type,
                function: {
                  name: tc.function.name,
                  arguments: tc.function.arguments,
                },
              }))
            : undefined,
        },
        finishReason: (choice.finish_reason as 'stop' | 'tool_calls' | 'length' | 'content_filter') || 'stop',
        model: completion.model,
        tokens: {
          prompt: usage?.prompt_tokens || 0,
          completion: usage?.completion_tokens || 0,
          total: usage?.total_tokens || 0,
        },
      };
    } catch (error) {
      this.logger.error(
        `AI API error for conversation ${conversationId}:`,
        error,
      );
      throw new Error(`Failed to generate AI response: ${error.message}`);
    }
  }

  /**
   * Streams AI response (for future real-time implementations)
   */
  async generateChatCompletionStream(
    request: ChatCompletionRequest,
  ): Promise<AsyncIterable<any>> {
    const { tenantId, virtualAgentId, conversationId, userMessage, contextLimit, channelConfig } =
      request;

    const { client, agent } = await this.getOpenAIClient(
      tenantId,
      virtualAgentId,
    );

    const messages = await this.buildContext(
      tenantId,
      conversationId,
      agent.configParams?.systemPrompt,
      contextLimit,
      channelConfig,
    );

    // Add current user message (avoid duplicates if it's already in context)
    const lastMessage = messages[messages.length - 1];
    if (!lastMessage || lastMessage.role !== 'user' || lastMessage.content !== userMessage) {
      messages.push({
        role: 'user',
        content: userMessage,
      });
    }

    return client.chat.completions.create({
      model: agent.model || this.configService.get('openai.defaultModel'),
      messages: messages as any,  // Cast to any for multimodal content support
      temperature: agent.configParams?.temperature ?? 0.7,
      stream: true,
    });
  }
}
