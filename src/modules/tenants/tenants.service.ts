import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { TenantRepository } from '../../common/repositories/tenant.repository';
import { CreateTenantDto, UpdateTenantDto } from '../../dto/tenant.dto';
import { TenantDocument } from '../../schemas/tenant.schema';

@Injectable()
export class TenantsService {
  constructor(private readonly tenantRepository: TenantRepository) {}

  async create(createTenantDto: CreateTenantDto): Promise<TenantDocument> {
    // Check if tenant with slug already exists
    const existingTenant = await this.tenantRepository.findBySlug(
      createTenantDto.slug,
    );

    if (existingTenant) {
      throw new ConflictException(
        `Tenant with slug '${createTenantDto.slug}' already exists`,
      );
    }

    return this.tenantRepository.create(createTenantDto);
  }

  async findAll(): Promise<TenantDocument[]> {
    return this.tenantRepository.find();
  }

  async findOne(id: string): Promise<TenantDocument> {
    const tenant = await this.tenantRepository.findById(id);

    if (!tenant) {
      throw new NotFoundException(`Tenant with ID ${id} not found`);
    }

    return tenant;
  }

  async findBySlug(slug: string): Promise<TenantDocument> {
    const tenant = await this.tenantRepository.findBySlug(slug);

    if (!tenant) {
      throw new NotFoundException(`Tenant with slug '${slug}' not found`);
    }

    return tenant;
  }

  async update(
    id: string,
    updateTenantDto: UpdateTenantDto,
  ): Promise<TenantDocument> {
    const tenant = await this.tenantRepository.update(id, updateTenantDto);

    if (!tenant) {
      throw new NotFoundException(`Tenant with ID ${id} not found`);
    }

    return tenant;
  }

  async remove(id: string): Promise<TenantDocument> {
    const tenant = await this.tenantRepository.delete(id);

    if (!tenant) {
      throw new NotFoundException(`Tenant with ID ${id} not found`);
    }

    return tenant;
  }
}
