import { Module, forwardRef } from '@nestjs/common';
import { TelegramChannelService } from './telegram-channel.service';
import { TelegramBotManagerService } from './telegram-bot-manager.service';
import { TenantsModule } from '../tenants/tenants.module';
import { ChannelsModule } from '../channels/channels.module';
import { ConversationsModule } from '../conversations/conversations.module';

@Module({
  imports: [TenantsModule, ChannelsModule, forwardRef(() => ConversationsModule)],
  providers: [TelegramChannelService, TelegramBotManagerService],
  exports: [TelegramChannelService, TelegramBotManagerService],
})
export class TelegramModule {}
