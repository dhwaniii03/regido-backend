import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';
import { TokenService } from '../../modules/auth/token.service';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let mockTokenService: Partial<Record<keyof TokenService, jest.Mock>>;

  const mockPayload = {
    sub: 1,
    email: 'admin@regidoo.com',
    systemRole: 'system_admin',
    sessionToken: 'valid-session-hash',
  };

  const createMockExecutionContext = (headers: Record<string, string> = {}, cookies: Record<string, string> = {}) => {
    const request = {
      headers,
      cookies,
      user: null as any,
    };

    return {
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => ({}),
        getNext: () => ({}),
      }),
    } as unknown as ExecutionContext;
  };

  beforeEach(() => {
    mockTokenService = {
      verifyAccessToken: jest.fn().mockResolvedValue(mockPayload),
    };
    guard = new JwtAuthGuard(mockTokenService as unknown as TokenService);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('canActivate', () => {
    it('should successfully authenticate when a valid Bearer token is provided in Authorization header', async () => {
      const context = createMockExecutionContext({
        authorization: 'Bearer valid-jwt-token-123',
      });

      const canActivate = await guard.canActivate(context);

      expect(canActivate).toBe(true);
      expect(mockTokenService.verifyAccessToken).toHaveBeenCalledWith('valid-jwt-token-123');
      const req = context.switchToHttp().getRequest();
      expect(req.user).toEqual(mockPayload);
    });

    it('should successfully authenticate when token is provided in HttpOnly cookie', async () => {
      const context = createMockExecutionContext(
        {},
        { accessToken: 'cookie-jwt-token-456' },
      );

      const canActivate = await guard.canActivate(context);

      expect(canActivate).toBe(true);
      expect(mockTokenService.verifyAccessToken).toHaveBeenCalledWith('cookie-jwt-token-456');
      const req = context.switchToHttp().getRequest();
      expect(req.user).toEqual(mockPayload);
    });

    it('should prioritize Authorization header over cookie token if both are provided', async () => {
      const context = createMockExecutionContext(
        { authorization: 'Bearer header-token' },
        { accessToken: 'cookie-token' },
      );

      const canActivate = await guard.canActivate(context);

      expect(canActivate).toBe(true);
      expect(mockTokenService.verifyAccessToken).toHaveBeenCalledWith('header-token');
    });

    it('should throw UnauthorizedException if neither header nor cookie token is present', async () => {
      const context = createMockExecutionContext({}, {});

      await expect(guard.canActivate(context)).rejects.toThrow(
        new UnauthorizedException('Authentication token is required'),
      );
      expect(mockTokenService.verifyAccessToken).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException if Authorization header does not start with "Bearer "', async () => {
      const context = createMockExecutionContext({
        authorization: 'Basic dXNlcjpwYXNz',
      });

      await expect(guard.canActivate(context)).rejects.toThrow(
        new UnauthorizedException('Authentication token is required'),
      );
      expect(mockTokenService.verifyAccessToken).not.toHaveBeenCalled();
    });

    it('should block temporary password tokens with scope PASSWORD_CHANGE_REQUIRED from protected routes', async () => {
      mockTokenService.verifyAccessToken = jest.fn().mockResolvedValue({
        sub: 1,
        email: 'temp@regidoo.com',
        systemRole: 'system_admin',
        scope: 'PASSWORD_CHANGE_REQUIRED',
      });

      const context = createMockExecutionContext({
        authorization: 'Bearer temp-scoped-token',
      });

      await expect(guard.canActivate(context)).rejects.toThrow(
        new UnauthorizedException(
          'Temporary password change required before accessing this endpoint',
        ),
      );
    });

    it('should throw UnauthorizedException if token verification fails with an error', async () => {
      mockTokenService.verifyAccessToken = jest
        .fn()
        .mockRejectedValue(new Error('jwt expired'));

      const context = createMockExecutionContext({
        authorization: 'Bearer expired-jwt-token',
      });

      await expect(guard.canActivate(context)).rejects.toThrow(
        new UnauthorizedException('Invalid or expired authentication session'),
      );
    });

    it('should rethrow existing UnauthorizedException if already thrown during verification', async () => {
      mockTokenService.verifyAccessToken = jest
        .fn()
        .mockRejectedValue(new UnauthorizedException('Custom unauthorized message'));

      const context = createMockExecutionContext({
        authorization: 'Bearer custom-error-token',
      });

      await expect(guard.canActivate(context)).rejects.toThrow(
        new UnauthorizedException('Custom unauthorized message'),
      );
    });
  });
});
