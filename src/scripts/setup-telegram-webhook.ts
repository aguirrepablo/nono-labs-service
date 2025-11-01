import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from '../app.module';
import { ChannelsService } from '../modules/channels/channels.service';
import { ChannelType } from '../schemas/channel.schema';

/**
 * Script to setup Telegram webhook
 *
 * Usage:
 *   npm run setup-webhook <tenantId> <channelId> <webhookUrl>
 *
 * Example:
 *   npm run setup-webhook 690418f8373d261bc922a9fd 690418f8373d261bc922aa09 https://yourapp.com
 */
async function setupWebhook() {
  const logger = new Logger('SetupTelegramWebhook');

  // Get command line arguments
  const args = process.argv.slice(2);

  if (args.length < 3) {
    logger.error('❌ Missing arguments');
    logger.log('');
    logger.log('Usage: npm run setup-webhook <tenantId> <channelId> <webhookUrl>');
    logger.log('');
    logger.log('Example:');
    logger.log('  npm run setup-webhook 690418f8373d261bc922a9fd 690418f8373d261bc922aa09 https://yourapp.com');
    logger.log('');
    logger.log('The webhook URL will be: https://yourapp.com/webhooks/telegram/{channelId}');
    process.exit(1);
  }

  const [tenantId, channelId, baseUrl] = args;

  logger.log('🔧 Setting up Telegram webhook...');
  logger.log(`   Tenant ID: ${tenantId}`);
  logger.log(`   Channel ID: ${channelId}`);
  logger.log(`   Base URL: ${baseUrl}`);

  const app = await NestFactory.createApplicationContext(AppModule);

  try {
    const channelsService = app.get(ChannelsService);

    // Get channel
    const channel = await channelsService.findOne(tenantId, channelId);

    if (channel.type !== ChannelType.TELEGRAM) {
      throw new Error(`Channel ${channelId} is not a Telegram channel`);
    }

    const botToken = channel.config.apiToken;
    if (!botToken) {
      throw new Error('Telegram bot token not found in channel config');
    }

    // Build webhook URL
    const webhookUrl = `${baseUrl}/webhooks/telegram/${channelId}`;

    logger.log(`📡 Setting webhook URL: ${webhookUrl}`);

    // Call Telegram API to set webhook
    const telegramApiUrl = `https://api.telegram.org/bot${botToken}/setWebhook`;
    const response = await fetch(telegramApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: webhookUrl,
        allowed_updates: ['message', 'edited_message'],
      }),
    });

    const result = await response.json();

    if (result.ok) {
      logger.log('✅ Webhook configured successfully!');
      logger.log('');
      logger.log('📋 Configuration:');
      logger.log(`   Webhook URL: ${webhookUrl}`);
      logger.log(`   Telegram will send updates to this endpoint`);
      logger.log('');
      logger.log('🧪 Test your bot:');
      logger.log(`   1. Open Telegram and find your bot`);
      logger.log(`   2. Send a message to your bot`);
      logger.log(`   3. Check your server logs for incoming webhooks`);
      logger.log('');
      logger.log('⚠️  Remember to:');
      logger.log(`   - Include 'x-tenant-id: ${tenantId}' header in webhook requests`);
      logger.log('   - Ensure your server is publicly accessible via HTTPS');
      logger.log('   - Telegram requires HTTPS for webhooks');
    } else {
      logger.error('❌ Failed to set webhook:', result.description);
      process.exit(1);
    }
  } catch (error) {
    logger.error('❌ Error setting up webhook:', error.message);
    throw error;
  } finally {
    await app.close();
  }
}

// Run setup
setupWebhook()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
