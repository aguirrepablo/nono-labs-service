import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MessagesService } from './messages.service';
import { MessagesController } from './messages.controller';
import { Message, MessageSchema } from '../../schemas/message.schema';
import { MessageRepository } from '../../common/repositories/message.repository';
import { ConversationsModule } from '../conversations/conversations.module';
import { TenantsModule } from '../tenants/tenants.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Message.name, schema: MessageSchema }]),
    forwardRef(() => ConversationsModule),
    TenantsModule,
  ],
  controllers: [MessagesController],
  providers: [MessagesService, MessageRepository],
  exports: [MessagesService, MessageRepository],
})
export class MessagesModule {}
