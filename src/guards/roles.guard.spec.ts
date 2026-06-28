import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import { RolesGuard } from './roles.guard';
import { ROLES_KEY } from './roles.decorator';

const createMockExecutionContext = (user: unknown): ExecutionContext => {
  const mockHandler = jest.fn();
  const mockClass = jest.fn();

  return {
    getHandler: () => mockHandler,
    getClass: () => mockClass,
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
  } as unknown as ExecutionContext;
};

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: jest.Mocked<Reflector>;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    } as unknown as jest.Mocked<Reflector>;

    guard = new RolesGuard(reflector);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('canActivate', () => {
    it('should return true when no roles metadata is set (getAllAndOverride returns undefined)', () => {
      reflector.getAllAndOverride.mockReturnValue(undefined);
      const context = createMockExecutionContext({ role: UserRole.CUSTOMER });

      const result = guard.canActivate(context);

      expect(result).toBe(true);
      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(ROLES_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);
    });

    it('should return true when roles metadata is an empty array', () => {
      reflector.getAllAndOverride.mockReturnValue([]);
      const context = createMockExecutionContext({ role: UserRole.CUSTOMER });

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should return true when the user has the required role', () => {
      reflector.getAllAndOverride.mockReturnValue([UserRole.RESTAURANT_ADMIN]);
      const context = createMockExecutionContext({ role: UserRole.RESTAURANT_ADMIN });

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should throw ForbiddenException with "Insufficient permissions" when the user does not have the required role', () => {
      reflector.getAllAndOverride.mockReturnValue([UserRole.PLATFORM_ADMIN]);
      const context = createMockExecutionContext({ role: UserRole.CUSTOMER });

      expect(() => guard.canActivate(context)).toThrow(
        new ForbiddenException('Insufficient permissions'),
      );
    });

    it('should throw ForbiddenException when user is undefined on the request', () => {
      reflector.getAllAndOverride.mockReturnValue([UserRole.PLATFORM_ADMIN]);
      const context = createMockExecutionContext(undefined);

      expect(() => guard.canActivate(context)).toThrow(
        new ForbiddenException('Insufficient permissions'),
      );
    });
  });
});
