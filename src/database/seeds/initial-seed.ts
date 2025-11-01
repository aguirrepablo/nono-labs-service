import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from '../../app.module';
import { TenantsService } from '../../modules/tenants/tenants.service';
import { VirtualAgentsService } from '../../modules/virtual-agents/virtual-agents.service';
import { ChannelsService } from '../../modules/channels/channels.service';
import { TenantStatus } from '../../schemas/tenant.schema';
import { VirtualAgentStatus, AIProvider } from '../../schemas/virtual-agent.schema';
import { ChannelType, ChannelStatus } from '../../schemas/channel.schema';

/**
 * Initial database seed
 * Creates:
 * - Demo Tenant with configuration
 * - Virtual Agent (OpenAI GPT-4)
 * - Optional: Telegram Channel
 *
 * IMPORTANT: This seed uses example/placeholder values.
 * Replace with your real API keys in the .env file:
 * - OPENAI_API_KEY
 * - TELEGRAM_BOT_TOKEN (optional, for Telegram channel)
 */
async function seed() {
  const logger = new Logger('DatabaseSeed');

  logger.log('🌱 Starting database seed...');

  const app = await NestFactory.createApplicationContext(AppModule);

  try {
    const tenantsService = app.get(TenantsService);
    const virtualAgentsService = app.get(VirtualAgentsService);
    const channelsService = app.get(ChannelsService);

    // Get API keys from environment (with example placeholders)
    const openaiApiKey = process.env.OPENAI_API_KEY || 'sk-placeholder-key-with-at-least-20-characters-here';
    const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN || '';

    // Warn if using placeholders
    if (openaiApiKey.startsWith('sk-placeholder')) {
      logger.warn('⚠️  Using placeholder OpenAI API key. Set OPENAI_API_KEY in .env file.');
      logger.warn('   Get one at: https://platform.openai.com/api-keys');
    }

    if (telegramBotToken && telegramBotToken === '') {
      logger.warn('⚠️  TELEGRAM_BOT_TOKEN not set. Telegram channel will not be created.');
      logger.warn('   Get one from @BotFather on Telegram: https://t.me/BotFather');
    }

    // 1. Create Demo Tenant
    logger.log('📦 Creating demo tenant...');
    const tenant = await tenantsService.create({
      name: 'Demo Organization',
      slug: 'demo-org',
      contactEmail: 'admin@demo.com',
      status: TenantStatus.ACTIVE,
      config: {
        branding: {
          name: 'Demo Bot',
          primaryColor: '#4285F4',
          logo: 'https://via.placeholder.com/150',
        },
        limits: {
          maxConversations: 1000,
          maxMessagesPerMonth: 10000,
          maxVirtualAgents: 5,
        },
        settings: {
          language: 'es',
          timezone: 'America/Mexico_City',
        },
      },
      metadata: {
        environment: 'development',
        createdBy: 'seed-script',
      },
    });
    logger.log(`✅ Tenant created: ${tenant.name} (ID: ${tenant._id})`);

    // 2. Create Virtual Agent with OpenAI (GPT-4)
    logger.log('🤖 Creating virtual agent with OpenAI...');
    const virtualAgent = await virtualAgentsService.create(
      String(tenant._id),
      {
        name: 'GPT-4 Assistant',
        description: 'AI assistant powered by OpenAI GPT-4 model',
        model: 'gpt-4',
        provider: AIProvider.OPENAI,
        apiKey: openaiApiKey,
        endpointUrl: 'https://api.openai.com/v1',
        configParams: {
          temperature: 0.7,
          maxTokens: 2048,
          topP: 0.9,
          frequencyPenalty: 0,
          presencePenalty: 0,
          systemPrompt:
            'Eres un asistente AI útil y amigable. Respondes en español de manera clara y concisa. Ayudas a los usuarios con sus preguntas y tareas.',
        },
        status: VirtualAgentStatus.ACTIVE,
        metadata: {
          provider_version: '1.0',
          model_capability: 'general',
        },
      },
    );
    logger.log(
      `✅ Virtual Agent created: ${virtualAgent.name} (ID: ${virtualAgent._id})`,
    );

    // 3. Create Telegram Channel (only if token provided)
    let channel: any = null;
    if (telegramBotToken) {
      logger.log('📱 Creating Telegram channel...');
      channel = await channelsService.create(String(tenant._id), {
        type: ChannelType.TELEGRAM,
        name: 'Demo Telegram Bot',
        description: 'Main Telegram channel for demo bot',
        config: {
          apiToken: telegramBotToken,
          webhookUrl: process.env.TELEGRAM_WEBHOOK_URL || '',
        },
        status: ChannelStatus.ACTIVE,
        metadata: {
          channel_type: 'messaging',
          integration_status: 'pending',
        },
      });
      logger.log(`✅ Channel created: ${channel.name} (ID: ${channel._id})`);
    }

    // Print summary
    logger.log('\n' + '='.repeat(70));
    logger.log('🎉 Database seed completed successfully!');
    logger.log('='.repeat(70));
    logger.log('\n📋 Summary:');
    logger.log(`   Tenant ID:            ${tenant._id}`);
    logger.log(`   Tenant Slug:          ${tenant.slug}`);
    logger.log(`   Virtual Agent ID:     ${virtualAgent._id}`);
    if (channel) {
      logger.log(`   Channel ID:           ${channel._id}`);
    }
    logger.log('\n🔑 Usage Instructions:');
    logger.log('   1. Use the tenant ID in API requests with x-tenant-id header:');
    logger.log(`      curl -H "x-tenant-id: ${tenant._id}" http://localhost:3000/virtual-agents`);
    logger.log('\n   2. Environment variables needed:');
    logger.log('      - OPENAI_API_KEY (required, 20+ chars)');
    logger.log('      - TELEGRAM_BOT_TOKEN (optional, for Telegram integration)');
    logger.log('      - TELEGRAM_WEBHOOK_URL (optional, for webhook setup)');
    logger.log('\n   3. Test the API:');
    logger.log(`      curl -H "x-tenant-id: ${tenant._id}" \\`);
    logger.log('           http://localhost:3000/virtual-agents');
    logger.log('\n   4. To create a conversation:');
    logger.log(`      POST /conversations with tenantId: ${tenant._id}`);
    if (channel) {
      logger.log(`      Link to channel: ${channel._id}`);
    }
    logger.log('\n');
  } catch (error) {
    logger.error('❌ Seed failed:', error.message);
    logger.error(error.stack);
    throw error;
  } finally {
    await app.close();
  }
}

// Run seed
seed()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error during seed:', error);
    process.exit(1);
  });
