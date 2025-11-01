import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, FilterQuery } from 'mongoose';
import { Tenant, TenantDocument } from '../../schemas/tenant.schema';

/**
 * Special repository for Tenant entity
 * Does not require tenant scoping since Tenant IS the tenant
 */
@Injectable()
export class TenantRepository {
  constructor(
    @InjectModel(Tenant.name)
    private readonly tenantModel: Model<TenantDocument>,
  ) {}

  async create(data: Partial<Tenant>): Promise<TenantDocument> {
    const tenant = new this.tenantModel(data);
    return tenant.save();
  }

  async findById(id: string): Promise<TenantDocument | null> {
    return this.tenantModel.findById(id).exec();
  }

  async findBySlug(slug: string): Promise<TenantDocument | null> {
    return this.tenantModel.findOne({ slug }).exec();
  }

  async find(filter: FilterQuery<Tenant> = {}): Promise<TenantDocument[]> {
    return this.tenantModel.find(filter).exec();
  }

  async update(
    id: string,
    data: Partial<Tenant>,
  ): Promise<TenantDocument | null> {
    return this.tenantModel
      .findByIdAndUpdate(id, data, { new: true })
      .exec();
  }

  async delete(id: string): Promise<TenantDocument | null> {
    return this.tenantModel.findByIdAndDelete(id).exec();
  }

  async exists(filter: FilterQuery<Tenant>): Promise<boolean> {
    const count = await this.tenantModel.countDocuments(filter).exec();
    return count > 0;
  }
}
