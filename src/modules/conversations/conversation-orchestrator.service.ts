import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConversationsService } from './conversations.service';
import { MessagesService } from '../messages/messages.service';
import { AIProviderFactory } from '../openai/ai-provider.factory';
import { ChannelsService } from '../channels/channels.service';
import { VirtualAgentsService } from '../virtual-agents/virtual-agents.service';
import { ChannelFactory } from '../../common/factories/channel.factory';
import { AuthorRole, MessageType } from '../../schemas/message.schema';
import { ConversationType, ConversationStatus, ParticipantRole } from '../../schemas/conversation.schema';
import { Types } from 'mongoose';

/**
 * Orchestrates the complete message flow:
 * 1. Receive incoming message from channel
 * 2. Find or create conversation
 * 3. Save user message
 * 4. Generate AI response
 * 5. Save and send AI response
 */
@Injectable()
export class ConversationOrchestratorService {
  private readonly logger = new Logger(ConversationOrchestratorService.name);

  constructor(
    private readonly conversationsService: ConversationsService,
    private readonly messagesService: MessagesService,
    private readonly aiProviderFactory: AIProviderFactory,
    private readonly channelsService: ChannelsService,
    private readonly virtualAgentsService: VirtualAgentsService,
    private readonly channelFactory: ChannelFactory,
  ) {}

  /**
   * Handles incoming message from any channel
   */
  async handleIncomingMessage(
    tenantId: string,
    channelId: string,
    incomingEvent: any,
    type : string,
  ): Promise<void> {
    try {
      // 1. Get channel configuration
      const channel = await this.channelsService.findOne(tenantId, channelId);
      const channelService = this.channelFactory.getChannelService(
        channel.type,
      );

      // 2. Parse incoming message using channel-specific service
      const parsedMessage = await channelService.receiveMessage(
        channel.config,
        incomingEvent,
      );

      this.logger.log(
        `Received message from ${parsedMessage.externalChannelId} in channel ${channelId}`,
      );

      // 3. Find or create conversation
      let conversation =
        await this.conversationsService.findByExternalId(
          tenantId,
          channelId,
          parsedMessage.externalChannelId,
        );

      if (!conversation) {
        this.logger.log(
          `Creating new conversation for ${parsedMessage.externalChannelId}`,
        );

        // Get default virtual agent for the channel (from channel config or fallback)
        const virtualAgentId =
          channel.defaultVirtualAgentId ||
          (await this.getDefaultVirtualAgentForChannel(tenantId, channelId));

        // Determine conversation type from chat metadata (private or group)
        const conversationType = this.getConversationType(parsedMessage.metadata?.chatType);

        conversation = await this.conversationsService.create(tenantId, {
          channelId,
          virtualAgentId: virtualAgentId ? String(virtualAgentId) : undefined,
          externalChannelId: parsedMessage.externalChannelId,
          type: conversationType,
          participants: [
            {
              id: parsedMessage.authorId,
              role: ParticipantRole.USER,
              name: parsedMessage.authorName,
              joinedAt: new Date(),
            },
          ],
        });

        this.logger.log(
          `Created ${conversationType} conversation with initial participant: ${parsedMessage.authorName} (${parsedMessage.authorId})`,
        );
      } else {
        // For existing conversations, check if participant is new and add if needed (for groups)
        await this.addParticipantIfNew(tenantId, conversation, parsedMessage);
      }

      // 4. Save incoming user message (with multimedia support)
      const userMessage = await this.messagesService.create(tenantId, {
        conversationId: conversation._id as any, // Mongoose will convert ObjectId properly
        type: this.mapMessageType(parsedMessage.type || 'text'),
        authorRole: AuthorRole.USER,
        authorId: parsedMessage.authorId,
        authorName: parsedMessage.authorName,
        content: parsedMessage.content,
        attachments: parsedMessage.attachments || [],
        externalMessageId: parsedMessage.externalMessageId,
        channelMetadata: parsedMessage.metadata,
      });

      this.logger.log(
        `Saved user message: ${userMessage._id} - "${parsedMessage.content?.substring(0, 50)}..."`,
      );
      this.logger.debug(
        `User message saved in conversation: ${userMessage.conversationId}`,
      );

      // 5. Generate AI response (if conversation is not paused)
      this.logger.debug(
        `Conversation status: ${conversation.status}, virtualAgentId: ${conversation.virtualAgentId}, conversationId: ${conversation._id}`,
      );

      if ( conversation.status === ConversationStatus.OPEN && conversation.virtualAgentId ) {
        
        if(conversation.type === ConversationType.GROUP && !parsedMessage.content?.includes(`@${channel.name}`)) return;

        this.logger.debug(`Calling generateAndSendResponse with conversationId: ${conversation._id}`);
        await this.generateAndSendResponse(
          tenantId,
          String(conversation._id),
          String(conversation.virtualAgentId),
          channel,
          parsedMessage.externalChannelId,
        );
      } else {
        this.logger.log(
          `Conversation ${String(conversation._id)} is ${conversation.status}, virtualAgentId: ${conversation.virtualAgentId}, skipping AI response`,
        );
      }
    } catch (error) {
      this.logger.error('Error handling incoming message:', error);
      throw error;
    }
  }

  /**
   * Generates AI response and sends it back through the channel
   */
  private async generateAndSendResponse(
    tenantId: string,
    conversationId: string,
    virtualAgentId: string,
    channel: any,
    recipientId: string,
  ): Promise<void> {
    try {

      // Get last user message
      const messages = await this.messagesService.findByConversation(
        tenantId,
        conversationId,
        1,
      );
      const lastUserMessage = messages[0];

      // Debug logging
      this.logger.debug(
        `Retrieved ${messages.length} messages for conversation ${conversationId}`,
      );
      if (lastUserMessage) {
        this.logger.debug(
          `Last message content: "${lastUserMessage.content?.substring(0, 50) || 'EMPTY'}"`,
        );
      }

      if (!lastUserMessage || !lastUserMessage.content) {
        this.logger.warn(
          `No user message content to respond to. Messages count: ${messages.length}, HasMessage: ${!!lastUserMessage}, HasContent: ${!!lastUserMessage?.content}`,
        );
        return;
      }

      this.logger.log(`Generating AI response for conversation ${conversationId}`);

      // Get the virtual agent to determine the AI provider
      const virtualAgent = await this.virtualAgentsService.findOne(
        tenantId,
        virtualAgentId,
      );

      // Get the appropriate AI provider based on the agent's provider type
      const aiProvider = this.aiProviderFactory.getProvider(virtualAgent.provider);

      // Generate AI response (with multimedia support via channel config)
      const aiResponse = await aiProvider.generateChatCompletion({
        tenantId,
        virtualAgentId,
        conversationId,
        userMessage: lastUserMessage.content,
        contextLimit: channel.maxContextMessages || 20,
        channelId: String(channel._id),
        channelConfig: channel.config,
      });

      this.logger.log(
        `AI response generated: "${aiResponse.message.content?.substring(0, 50) || '[tool_calls]'}"`,
      );

      // Save AI response message
      const agentMessage = await this.messagesService.create(tenantId, {
        conversationId: new Types.ObjectId(conversationId) as any,
        type: MessageType.TEXT,
        authorRole: AuthorRole.AGENT,
        authorId: virtualAgentId,
        content: aiResponse.message.content || '',
        metadata: {
          model: aiResponse.model,
          tokens: aiResponse.tokens,
          openaiResponse: {
            finishReason: aiResponse.finishReason,
            toolCalls: aiResponse.message.toolCalls,
          },
        },
      });

      // Send response through channel
      const channelService = this.channelFactory.getChannelService(
        channel.type,
      );

      const externalMessageId = await channelService.sendMessage(
        channel.config,
        recipientId,
        {
          content: aiResponse.message.content || '',
        },
      );

      // Update message with external ID
      await this.messagesService.update(tenantId, String(agentMessage._id), {
        externalMessageId,
      });

      this.logger.log(
        `Response sent through channel with external ID: ${externalMessageId}`,
      );
    } catch (error) {
      this.logger.error('Error generating/sending AI response:', error);
      throw error;
    }
  }

  /**
   * Gets the default virtual agent for a channel
   * TODO: Make this configurable per channel
   */
  private async getDefaultVirtualAgentForChannel(
    tenantId: string,
    channelId: string,
  ): Promise<string | undefined> {
    try {
      // Get the first active virtual agent for the tenant
      // In production, you'd want to configure this per channel in the channel settings
      const agents = await this.virtualAgentsService.findAll(tenantId);

      if (agents.length > 0) {
        return String(agents[0]._id);
      }

      this.logger.warn(
        `No virtual agents found for tenant ${tenantId}. Create one to enable AI responses.`,
      );
      return undefined;
    } catch (error) {
      this.logger.error('Error getting default virtual agent:', error);
      return undefined;
    }
  }

  /**
   * Maps string message type from parser to MessageType enum
   */
  private mapMessageType(type: string): MessageType {
    const typeMap: Record<string, MessageType> = {
      text: MessageType.TEXT,
      image: MessageType.IMAGE,
      audio: MessageType.AUDIO,
      voice: MessageType.VOICE,
      video: MessageType.VIDEO,
      document: MessageType.DOCUMENT,
      sticker: MessageType.STICKER,
      location: MessageType.LOCATION,
      command: MessageType.COMMAND,
      system: MessageType.SYSTEM,
    };

    return typeMap[type.toLowerCase()] || MessageType.TEXT;
  }

  /**
   * Maps Telegram chat type to ConversationType enum
   */
  private getConversationType(chatType: string | undefined): ConversationType {
    if (!chatType) {
      return ConversationType.PRIVATE;
    }

    const typeMap: Record<string, ConversationType> = {
      private: ConversationType.PRIVATE,
      group: ConversationType.GROUP,
      supergroup: ConversationType.GROUP,
      channel: ConversationType.CHANNEL,
    };

    return typeMap[chatType.toLowerCase()] || ConversationType.PRIVATE;
  }

  /**
   * Adds a new participant to the conversation if they don't already exist
   * Used for group conversations where new members can join
   */
  private async addParticipantIfNew(
    tenantId: string,
    conversation: any,
    parsedMessage: any,
  ): Promise<void> {
    try {
      // Check if participant already exists
      const participantExists = conversation.participants?.some(
        (p: any) => p.id === parsedMessage.authorId,
      );

      if (!participantExists && conversation.type === ConversationType.GROUP) {
        this.logger.log(
          `Adding new participant to group: ${parsedMessage.authorName} (${parsedMessage.authorId})`,
        );

        // Add participant to conversation
        const updatedParticipants = [
          ...conversation.participants,
          {
            id: parsedMessage.authorId,
            role: ParticipantRole.USER,
            name: parsedMessage.authorName,
            joinedAt: new Date(),
          },
        ];

        await this.conversationsService.update(tenantId, String(conversation._id), {
          participants: updatedParticipants,
        });
      }
    } catch (error) {
      this.logger.error(
        `Error adding participant to conversation: ${error.message}`,
      );
      // Don't throw, just log - we don't want to break message processing
    }
  }
}
