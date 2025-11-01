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
} from '@nestjs/common';
import { VirtualAgentsService } from './virtual-agents.service';
import {
  CreateVirtualAgentDto,
  UpdateVirtualAgentDto,
} from '../../dto/virtual-agent.dto';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';

@Controller('virtual-agents')
@UseGuards(TenantGuard)
export class VirtualAgentsController {
  constructor(private readonly virtualAgentsService: VirtualAgentsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @CurrentTenant() tenantId: string,
    @Body(ValidationPipe) createDto: CreateVirtualAgentDto,
  ) {
    return this.virtualAgentsService.create(tenantId, createDto);
  }

  @Get()
  findAll(@CurrentTenant() tenantId: string) {
    return this.virtualAgentsService.findAll(tenantId);
  }

  @Get(':id')
  findOne(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.virtualAgentsService.findOne(tenantId, id);
  }

  @Patch(':id')
  update(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body(ValidationPipe) updateDto: UpdateVirtualAgentDto,
  ) {
    return this.virtualAgentsService.update(tenantId, id, updateDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.virtualAgentsService.remove(tenantId, id);
  }
}
