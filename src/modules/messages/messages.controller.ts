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
import { MessagesService } from './messages.service';
import { CreateMessageDto, UpdateMessageDto } from '../../dto/message.dto';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';

@Controller('messages')
@UseGuards(TenantGuard)
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @CurrentTenant() tenantId: string,
    @Body(ValidationPipe) createDto: CreateMessageDto,
  ) {
    return this.messagesService.create(tenantId, createDto);
  }

  @Get('conversation/:conversationId')
  findByConversation(
    @CurrentTenant() tenantId: string,
    @Param('conversationId') conversationId: string,
    @Query('limit') limit?: number,
  ) {
    return this.messagesService.findByConversation(
      tenantId,
      conversationId,
      limit,
    );
  }

  @Get(':id')
  findOne(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.messagesService.findOne(tenantId, id);
  }

  @Patch(':id')
  update(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body(ValidationPipe) updateDto: UpdateMessageDto,
  ) {
    return this.messagesService.update(tenantId, id, updateDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.messagesService.remove(tenantId, id);
  }
}
