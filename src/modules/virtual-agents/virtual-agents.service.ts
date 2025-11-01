import { Injectable, Logger } from '@nestjs/common';
import { VirtualAgentRepository } from '../../common/repositories/virtual-agent.repository';
import { EncryptionService } from '../../common/encryption/encryption.service';
import {
  CreateVirtualAgentDto,
  UpdateVirtualAgentDto,
} from '../../dto/virtual-agent.dto';
import { VirtualAgentDocument, AIProvider } from '../../schemas/virtual-agent.schema';

@Injectable()
export class VirtualAgentsService {
  private readonly logger = new Logger(VirtualAgentsService.name);

  constructor(
    private readonly virtualAgentRepository: VirtualAgentRepository,
    private readonly encryptionService: EncryptionService,
  ) {}

  async create(
    tenantId: string,
    createDto: CreateVirtualAgentDto,
  ): Promise<VirtualAgentDocument> {
    // Validate API key
    if (!createDto.apiKey || createDto.apiKey.trim().length === 0) {
      throw new Error('API key is required for virtual agent creation');
    }

    // Encrypt the API key before storing
    let encryptedApiKey: string;
    try {
      encryptedApiKey = this.encryptionService.encrypt(createDto.apiKey);
    } catch (error) {
      this.logger.error('Failed to encrypt API key during virtual agent creation', error);
      throw new Error(`Failed to encrypt API key: ${error.message}`);
    }

    const data: any = {
      name: createDto.name,
      description: createDto.description,
      model: createDto.model,
      provider: createDto.provider || AIProvider.OPENAI,
      apiKeyEncrypted: encryptedApiKey,
      endpointUrl: createDto.endpointUrl,
      configParams: createDto.configParams,
      status: createDto.status,
      metadata: createDto.metadata,
    };

    return this.virtualAgentRepository.create(tenantId, data);
  }

  async findAll(tenantId: string): Promise<VirtualAgentDocument[]> {
    return this.virtualAgentRepository.find(tenantId);
  }

  async findOne(tenantId: string, id: string): Promise<VirtualAgentDocument> {
    return this.virtualAgentRepository.findByIdOrFail(tenantId, id);
  }

  async update(
    tenantId: string,
    id: string,
    updateDto: UpdateVirtualAgentDto,
  ): Promise<VirtualAgentDocument> {
    const data: any = { ...updateDto };

    // If updating API key, encrypt it
    if (updateDto.apiKey) {
      if (updateDto.apiKey.trim().length === 0) {
        throw new Error('API key cannot be empty');
      }

      try {
        data.apiKeyEncrypted = this.encryptionService.encrypt(updateDto.apiKey);
      } catch (error) {
        this.logger.error('Failed to encrypt API key during virtual agent update', error);
        throw new Error(`Failed to encrypt API key: ${error.message}`);
      }
      delete data.apiKey;
    }

    // Set provider if not already set in the update
    if (!data.provider) {
      const existing = await this.virtualAgentRepository.findByIdOrFail(
        tenantId,
        id,
      );
      data.provider = existing.provider;
    }

    return this.virtualAgentRepository.updateOrFail(tenantId, id, data);
  }

  async remove(tenantId: string, id: string): Promise<VirtualAgentDocument> {
    return this.virtualAgentRepository.deleteOrFail(tenantId, id);
  }

  /**
   * Decrypts and returns the API key for a virtual agent
   * USE WITH CAUTION - Only for internal service-to-service calls
   */
  async getDecryptedApiKey(tenantId: string, id: string): Promise<string> {
    const agent = await this.virtualAgentRepository.findByIdOrFail(tenantId, id);

    // Validate that the encrypted key exists
    if (!agent.apiKeyEncrypted) {
      this.logger.warn(
        `Virtual agent ${id} for tenant ${tenantId} has no encrypted API key. ` +
        `The agent needs to be reconfigured with a valid API key.`,
      );
      throw new Error(
        `Virtual agent "${agent.name}" is missing an API key. ` +
        `Please update the agent's configuration with a valid API key.`,
      );
    }

    try {
      return this.encryptionService.decrypt(agent.apiKeyEncrypted);
    } catch (error) {
      this.logger.error(
        `Failed to decrypt API key for virtual agent ${id} in tenant ${tenantId}. ` +
        `This may indicate the ENCRYPTION_KEY has changed or the data is corrupted.`,
        error,
      );
      throw error;
    }
  }
}
