import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import TelegramBot from 'node-telegram-bot-api';
import { TenantsService } from '../tenants/tenants.service';
import { ChannelsService } from '../channels/channels.service';
import { ConversationOrchestratorService } from '../conversations/conversation-orchestrator.service';
import { ChannelType, ChannelStatus } from '../../schemas/channel.schema';
import { TenantStatus } from '../../schemas/tenant.schema';

/**
 * Telegram Bot Manager
 * Automatically starts Telegram bots for all active channels when the app starts
 */
@Injectable()
export class TelegramBotManagerService implements OnModuleInit {
  private readonly logger = new Logger(TelegramBotManagerService.name);
  private bots: Map<string, TelegramBot> = new Map();

  constructor(
    private readonly tenantsService: TenantsService,
    private readonly channelsService: ChannelsService,
    private readonly orchestrator: ConversationOrchestratorService,
  ) {}

  /**
   * Called when the module is initialized
   * Starts all Telegram bots for active channels
   */
  async onModuleInit() {
    this.logger.log('🤖 Initializing Telegram Bot Manager...');

    try {
      await this.startAllBots();
      this.logger.log(
        `✅ Successfully started ${this.bots.size} Telegram bot(s)`,
      );
    } catch (error) {
      this.logger.error('❌ Error starting bots:', error);
    }
  }

  /**
   * Starts all Telegram bots for all active tenants and channels
   */
  private async startAllBots() {
    // Get all active tenants
    const tenants = await this.tenantsService.findAll();
    const activeTenants = tenants.filter(
      (tenant) => tenant.status === TenantStatus.ACTIVE,
    );

    this.logger.log(`Found ${activeTenants.length} active tenant(s)`);

    // For each tenant, get their Telegram channels
    for (const tenant of activeTenants) {
      try {
        const channels = await this.channelsService.findAll(
          String(tenant._id),
        );

        const telegramChannels = channels.filter(
          (channel) =>
            channel.type === ChannelType.TELEGRAM &&
            channel.status === ChannelStatus.ACTIVE,
        );

        this.logger.log(
          `Tenant "${tenant.name}" has ${telegramChannels.length} active Telegram channel(s)`,
        );

        // Start a bot for each channel
        for (const channel of telegramChannels) {
          await this.startBot(String(tenant._id), channel);
        }
      } catch (error) {
        this.logger.error(
          `Error loading channels for tenant ${tenant.name}:`,
          error,
        );
      }
    }
  }

  /**
   * Starts a single Telegram bot for a channel
   */
  private async startBot(tenantId: string, channel: any) {
    try {
      const botToken = channel.config?.apiToken;

      if (!botToken) {
        this.logger.warn(
          `Channel ${channel.name} (${channel._id}) has no bot token, skipping`,
        );
        return;
      }

      // Create bot with polling enabled
      const bot = new TelegramBot(botToken, {
        polling: {
          interval: 300, // Check for new messages every 300ms
          autoStart: true,
          params: {
            timeout: 10, // Long polling timeout
          },
        },
      });

      const channelId = channel._id.toString();
      const botKey = `${tenantId}:${channelId}`;

      // Register message handler
      bot.on('message', async (msg) => {
        await this.handleMessage(tenantId, channelId, msg);
      });

      // Register error handler
      bot.on('polling_error', (error) => {
        this.logger.error(`Polling error for channel ${channel.name}:`, error);
      });

      // Store bot reference
      this.bots.set(botKey, bot);

      // Get bot info
      const botInfo = await bot.getMe();

      this.logger.log(
        `✅ Started bot @${botInfo.username} for channel "${channel.name}" (${channelId})`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to start bot for channel ${channel.name}:`,
        error,
      );
    }
  }

  /**
   * Handles incoming Telegram messages
   */
  private async handleMessage(
    tenantId: string,
    channelId: string,
    msg: TelegramBot.Message,
  ) {
    try {
      // Log incoming message
      this.logger.debug(
        `📨 Message from chat ${msg.chat.id}: "${msg.text?.substring(0, 50)}..."`,
      );

      // Create Telegram event object compatible with our interface
      const telegramEvent = {
        message: msg,
      };

      // Pass to orchestrator (which will handle conversation, save message, and respond)
      await this.orchestrator.handleIncomingMessage(
        tenantId,
        channelId,
        telegramEvent,
        msg.chat.type == 'group' ? 'group' : 'private',
      );
    } catch (error) {
      this.logger.error('Error handling message:', error);

      // Send error message back to user
      const bot = this.bots.get(`${tenantId}:${channelId}`);
      if (bot) {
        try {
          await bot.sendMessage(
            msg.chat.id,
            'Lo siento, ocurrió un error procesando tu mensaje. Por favor intenta de nuevo.',
          );
        } catch (sendError) {
          this.logger.error('Error sending error message:', sendError);
        }
      }
    }
  }

  /**
   * Stops a specific bot
   */
  async stopBot(tenantId: string, channelId: string) {
    const botKey = `${tenantId}:${channelId}`;
    const bot = this.bots.get(botKey);

    if (bot) {
      try {
        await bot.stopPolling();
        this.bots.delete(botKey);
        this.logger.log(`Stopped bot for channel ${channelId}`);
      } catch (error) {
        this.logger.error(`Error stopping bot for channel ${channelId}:`, error);
      }
    }
  }

  /**
   * Stops all bots
   */
  async stopAllBots() {
    this.logger.log('Stopping all bots...');

    for (const [botKey, bot] of this.bots.entries()) {
      try {
        await bot.stopPolling();
        this.logger.log(`Stopped bot ${botKey}`);
      } catch (error) {
        this.logger.error(`Error stopping bot ${botKey}:`, error);
      }
    }

    this.bots.clear();
    this.logger.log('All bots stopped');
  }

  /**
   * Restarts all bots (useful when channels are updated)
   */
  async restartAllBots() {
    this.logger.log('Restarting all bots...');
    await this.stopAllBots();
    await this.startAllBots();
  }

  /**
   * Gets active bot count
   */
  getActiveBotCount(): number {
    return this.bots.size;
  }

  /**
   * Checks if a bot is running for a specific channel
   */
  isBotRunning(tenantId: string, channelId: string): boolean {
    return this.bots.has(`${tenantId}:${channelId}`);
  }
}
