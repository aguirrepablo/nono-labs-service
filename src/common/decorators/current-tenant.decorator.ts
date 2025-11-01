import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Decorator to extract the current tenant ID from the request
 * Must be used with TenantGuard to ensure tenant is validated
 *
 * @example
 * @Get()
 * @UseGuards(TenantGuard)
 * findAll(@CurrentTenant() tenantId: string) {
 *   return this.service.findAll(tenantId);
 * }
 */
export const CurrentTenant = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    return request.tenantId;
  },
);
