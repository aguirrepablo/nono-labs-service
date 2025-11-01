import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TenantRepository } from '../repositories/tenant.repository';
import { TenantStatus } from '../../schemas/tenant.schema';

/**
 * Guard that validates tenant from request headers
 * Extracts tenant ID from x-tenant-id header and validates:
 * 1. Header is present
 * 2. Tenant exists in database
 * 3. Tenant is active
 *
 * Injects tenantId into request object for use in controllers
 */
@Injectable()
export class TenantGuard implements CanActivate {
  private readonly tenantIdHeader: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly tenantRepository: TenantRepository,
  ) {
    this.tenantIdHeader =
      this.configService.get<string>('security.tenantIdHeader') ||
      'x-tenant-id';
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    // Extract tenant ID from header
    const tenantId = request.headers[this.tenantIdHeader];

    if (!tenantId) {
      throw new UnauthorizedException(
        `Missing ${this.tenantIdHeader} header. Tenant identification is required.`,
      );
    }

    // Validate tenant ID format (MongoDB ObjectId)
    if (!/^[0-9a-fA-F]{24}$/.test(tenantId)) {
      throw new UnauthorizedException(
        'Invalid tenant ID format. Must be a valid MongoDB ObjectId.',
      );
    }

    // Fetch tenant from database
    const tenant = await this.tenantRepository.findById(tenantId);

    if (!tenant) {
      throw new UnauthorizedException(
        `Tenant with ID ${tenantId} not found.`,
      );
    }

    // Check tenant status
    if (tenant.status !== TenantStatus.ACTIVE) {
      throw new ForbiddenException(
        `Tenant is ${tenant.status}. Access denied.`,
      );
    }

    // Inject tenant information into request
    request.tenantId = tenantId;
    request.tenant = tenant;

    return true;
  }
}
