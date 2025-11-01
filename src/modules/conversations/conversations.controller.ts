import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  ValidationPipe,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import { ConversationsService } from './conversations.service';
import {
  CreateConversationDto,
  UpdateConversationDto,
} from '../../dto/conversation.dto';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';

@Controller('conversations')
@UseGuards(TenantGuard)
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @CurrentTenant() tenantId: string,
    @Body(ValidationPipe) createDto: CreateConversationDto,
  ) {
    return this.conversationsService.create(tenantId, createDto);
  }

  @Get()
  findAll(@CurrentTenant() tenantId: string) {
    return this.conversationsService.findAll(tenantId);
  }

  @Get('external')
  findByExternalId(
    @CurrentTenant() tenantId: string,
    @Query('channelId') channelId: string,
    @Query('externalChannelId') externalChannelId: string,
  ) {
    return this.conversationsService.findByExternalId(
      tenantId,
      channelId,
      externalChannelId,
    );
  }

  @Get(':id')
  findOne(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.conversationsService.findOne(tenantId, id);
  }

  @Patch(':id')
  update(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body(ValidationPipe) updateDto: UpdateConversationDto,
  ) {
    return this.conversationsService.update(tenantId, id, updateDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.conversationsService.remove(tenantId, id);
  }
}
