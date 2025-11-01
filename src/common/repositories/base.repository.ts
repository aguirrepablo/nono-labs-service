import { Model, FilterQuery, UpdateQuery, QueryOptions, Types } from 'mongoose';
import { NotFoundException } from '@nestjs/common';

export interface MultitenantEntity {
  tenantId: Types.ObjectId;
}

/**
 * Base repository with automatic tenant filtering
 * CRITICAL: All queries automatically filter by tenantId to prevent data leaks
 */
export abstract class BaseRepository<T extends MultitenantEntity> {
  constructor(protected readonly model: Model<T>) {}

  /**
   * Creates tenant-scoped filter
   * @param tenantId - The tenant ID to scope queries to
   * @param filter - Additional filters
   * @returns Combined filter with tenantId
   */
  protected createTenantFilter(
    tenantId: string,
    filter: FilterQuery<T> = {},
  ): FilterQuery<T> {
    return {
      ...filter,
      tenantId: new Types.ObjectId(tenantId),
    } as FilterQuery<T>;
  }

  /**
   * Creates a new document for a tenant
   * @param tenantId - Tenant ID
   * @param data - Document data
   * @returns Created document
   */
  async create(tenantId: string, data: Partial<T>): Promise<T> {
    const document = new this.model({
      ...data,
      tenantId: new Types.ObjectId(tenantId),
    });
    return document.save();
  }

  /**
   * Finds documents for a tenant
   * @param tenantId - Tenant ID
   * @param filter - Additional filters
   * @param options - Query options
   * @returns Array of documents
   */
  async find(
    tenantId: string,
    filter: FilterQuery<T> = {},
    options?: QueryOptions,
  ): Promise<T[]> {
    return this.model
      .find(this.createTenantFilter(tenantId, filter), null, options)
      .exec();
  }

  /**
   * Finds one document for a tenant
   * @param tenantId - Tenant ID
   * @param filter - Filters
   * @returns Document or null
   */
  async findOne(
    tenantId: string,
    filter: FilterQuery<T>,
  ): Promise<T | null> {
    return this.model.findOne(this.createTenantFilter(tenantId, filter)).exec();
  }

  /**
   * Finds document by ID for a tenant
   * @param tenantId - Tenant ID
   * @param id - Document ID
   * @returns Document or null
   */
  async findById(tenantId: string, id: string): Promise<T | null> {
    return this.model
      .findOne(
        this.createTenantFilter(tenantId, { _id: new Types.ObjectId(id) } as FilterQuery<T>),
      )
      .exec();
  }

  /**
   * Finds document by ID for a tenant or throws
   * @param tenantId - Tenant ID
   * @param id - Document ID
   * @returns Document
   * @throws NotFoundException if not found
   */
  async findByIdOrFail(tenantId: string, id: string): Promise<T> {
    const document = await this.findById(tenantId, id);
    if (!document) {
      throw new NotFoundException(
        `${this.model.modelName} with id ${id} not found for tenant ${tenantId}`,
      );
    }
    return document;
  }

  /**
   * Updates a document for a tenant
   * @param tenantId - Tenant ID
   * @param id - Document ID
   * @param update - Update data
   * @returns Updated document or null
   */
  async update(
    tenantId: string,
    id: string,
    update: UpdateQuery<T>,
  ): Promise<T | null> {
    return this.model
      .findOneAndUpdate(
        this.createTenantFilter(tenantId, { _id: new Types.ObjectId(id) } as FilterQuery<T>),
        update,
        { new: true },
      )
      .exec();
  }

  /**
   * Updates a document for a tenant or throws
   * @param tenantId - Tenant ID
   * @param id - Document ID
   * @param update - Update data
   * @returns Updated document
   * @throws NotFoundException if not found
   */
  async updateOrFail(
    tenantId: string,
    id: string,
    update: UpdateQuery<T>,
  ): Promise<T> {
    const document = await this.update(tenantId, id, update);
    if (!document) {
      throw new NotFoundException(
        `${this.model.modelName} with id ${id} not found for tenant ${tenantId}`,
      );
    }
    return document;
  }

  /**
   * Deletes a document for a tenant
   * @param tenantId - Tenant ID
   * @param id - Document ID
   * @returns Deleted document or null
   */
  async delete(tenantId: string, id: string): Promise<T | null> {
    return this.model
      .findOneAndDelete(
        this.createTenantFilter(tenantId, { _id: new Types.ObjectId(id) } as FilterQuery<T>),
      )
      .exec();
  }

  /**
   * Deletes a document for a tenant or throws
   * @param tenantId - Tenant ID
   * @param id - Document ID
   * @returns Deleted document
   * @throws NotFoundException if not found
   */
  async deleteOrFail(tenantId: string, id: string): Promise<T> {
    const document = await this.delete(tenantId, id);
    if (!document) {
      throw new NotFoundException(
        `${this.model.modelName} with id ${id} not found for tenant ${tenantId}`,
      );
    }
    return document;
  }

  /**
   * Counts documents for a tenant
   * @param tenantId - Tenant ID
   * @param filter - Additional filters
   * @returns Document count
   */
  async count(tenantId: string, filter: FilterQuery<T> = {}): Promise<number> {
    return this.model.countDocuments(this.createTenantFilter(tenantId, filter)).exec();
  }

  /**
   * Checks if a document exists for a tenant
   * @param tenantId - Tenant ID
   * @param filter - Filters
   * @returns True if exists
   */
  async exists(tenantId: string, filter: FilterQuery<T>): Promise<boolean> {
    const count = await this.count(tenantId, filter);
    return count > 0;
  }
}
