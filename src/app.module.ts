import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { APP_FILTER } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import configuration from './config/configuration';
import { validationSchema } from './config/env.validation';
import { EncryptionModule } from './common/encryption/encryption.module';
import { TenantsModule } from './modules/tenants/tenants.module';
import { VirtualAgentsModule } from './modules/virtual-agents/virtual-agents.module';
import { ChannelsModule } from './modules/channels/channels.module';
import { ConversationsModule } from './modules/conversations/conversations.module';
import { MessagesModule } from './modules/messages/messages.module';
import { OpenAIModule } from './modules/openai/openai.module';
import { TelegramModule } from './modules/telegram/telegram.module';
import { ErrorLogsModule } from './modules/error-logs/error-logs.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema,
      validationOptions: {
        allowUnknown: true,
        abortEarly: false,
      },
    }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('database.uri'),
        ...configService.get('database.options'),
      }),
    }),
    EncryptionModule,
    ErrorLogsModule,
    TenantsModule,
    VirtualAgentsModule,
    ChannelsModule,
    ConversationsModule,
    MessagesModule,
    OpenAIModule,
    TelegramModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
  ],
})
export class AppModule {}
