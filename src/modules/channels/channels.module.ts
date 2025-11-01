import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ChannelsService } from './channels.service';
import { ChannelsController } from './channels.controller';
import { Channel, ChannelSchema } from '../../schemas/channel.schema';
import { ChannelRepository } from '../../common/repositories/channel.repository';
import { TenantsModule } from '../tenants/tenants.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Channel.name, schema: ChannelSchema }]),
    TenantsModule,
  ],
  controllers: [ChannelsController],
  providers: [ChannelsService, ChannelRepository],
  exports: [ChannelsService, ChannelRepository],
})
export class ChannelsModule {}
