import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { TokenService } from './token.service';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;
  let tokenService: TokenService;

  const mockUser = {
    id: 1,
    username: 'admin',
    email: 'admin@regidoo.com',
    mobileNumber: null,
    city: 'Stockholm',
    postalCode: null,
    countryId: 1,
    languageId: 1,
    accountType: 'personal' as const,
    status: 'active' as const,
    systemRole: 'system_admin' as const,
    mustChangePassword: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const createMockRequest = (overrides: Partial<Request> = {}): Request => {
    return {
      headers: {},
      cookies: {},
      ip: '127.0.0.1',
      socket: { remoteAddress: '127.0.0.1' } as any,
      ...overrides,
    } as unknown as Request;
  };

  const createMockResponse = (): { res: Response; cookieSpy: jest.Mock; clearCookieSpy: jest.Mock } => {
    const cookieSpy = jest.fn();
    const clearCookieSpy = jest.fn();
    const res = {
      cookie: cookieSpy,
      clearCookie: clearCookieSpy,
    } as unknown as Response;
    return { res, cookieSpy, clearCookieSpy };
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            login: jest.fn(),
            logout: jest.fn(),
            changePassword: jest.fn(),
            getProfile: jest.fn(),
          },
        },
        {
          provide: TokenService,
          useValue: {
            verifyAccessToken: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
    tokenService = module.get<TokenService>(TokenService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('login', () => {
    it('should set HttpOnly accessToken and refreshToken cookies for standard login', async () => {
      const loginDto = { email: 'admin@regidoo.com', password: 'Password123!' };
      const req = createMockRequest({
        headers: {
          'x-forwarded-for': '203.0.113.195, 70.41.3.18',
          'user-agent': 'Mozilla/5.0 TestBrowser',
        },
      });
      const { res, cookieSpy } = createMockResponse();

      const serviceResult = {
        success: true,
        message: 'Login successful',
        user: mockUser,
        mustChangePassword: false,
        accessToken: 'mock-access-token-123',
        refreshToken: 'mock-refresh-token-456',
      };

      jest.spyOn(authService, 'login').mockResolvedValueOnce(serviceResult);

      const result = await controller.login(loginDto, req, res);

      expect(authService.login).toHaveBeenCalledWith(
        loginDto,
        '203.0.113.195',
        'Mozilla/5.0 TestBrowser',
      );
      expect(cookieSpy).toHaveBeenCalledTimes(2);
      expect(cookieSpy).toHaveBeenCalledWith(
        'accessToken',
        'mock-access-token-123',
        expect.objectContaining({
          httpOnly: true,
          sameSite: 'lax',
          path: '/',
          maxAge: 15 * 60 * 1000,
        }),
      );
      expect(cookieSpy).toHaveBeenCalledWith(
        'refreshToken',
        'mock-refresh-token-456',
        expect.objectContaining({
          httpOnly: true,
          sameSite: 'lax',
          path: '/',
          maxAge: 7 * 24 * 60 * 60 * 1000,
        }),
      );
      expect(result).toEqual(serviceResult);
    });

    it('should NOT set session cookies when user mustChangePassword is true', async () => {
      const loginDto = { email: 'admin@regidoo.com', password: 'TempPassword!' };
      const req = createMockRequest();
      const { res, cookieSpy } = createMockResponse();

      const serviceResult = {
        success: true,
        message: 'Temporary password must be changed',
        user: { ...mockUser, mustChangePassword: true },
        mustChangePassword: true,
        tempToken: 'scoped-temp-jwt',
      };

      jest.spyOn(authService, 'login').mockResolvedValueOnce(serviceResult);

      const result = await controller.login(loginDto, req, res);

      expect(authService.login).toHaveBeenCalled();
      expect(cookieSpy).not.toHaveBeenCalled();
      expect(result).toEqual(serviceResult);
      expect(result.tempToken).toBe('scoped-temp-jwt');
    });

    it('should fallback to socket.remoteAddress or req.ip when x-forwarded-for is missing', async () => {
      const loginDto = { email: 'admin@regidoo.com', password: 'Password123!' };
      const req = createMockRequest({
        headers: {},
        ip: '10.0.0.1',
        socket: { remoteAddress: '10.0.0.1' } as any,
      });
      const { res } = createMockResponse();

      jest.spyOn(authService, 'login').mockResolvedValueOnce({
        success: true,
        message: 'Login successful',
        user: mockUser,
        mustChangePassword: false,
        accessToken: 'token',
        refreshToken: 'refresh',
      });

      await controller.login(loginDto, req, res);

      expect(authService.login).toHaveBeenCalledWith(loginDto, '10.0.0.1', undefined);
    });
  });

  describe('logout', () => {
    it('should extract userId from Authorization Bearer header, clear cookies, and call authService.logout', async () => {
      const req = createMockRequest({
        headers: { authorization: 'Bearer valid-access-token' },
      });
      const { res, clearCookieSpy } = createMockResponse();

      jest.spyOn(tokenService, 'verifyAccessToken').mockResolvedValueOnce({
        sub: 1,
        email: 'admin@regidoo.com',
        systemRole: 'system_admin',
      });
      jest.spyOn(authService, 'logout').mockResolvedValueOnce({
        success: true,
        message: 'Logged out successfully',
      });

      const result = await controller.logout(req, res);

      expect(tokenService.verifyAccessToken).toHaveBeenCalledWith('valid-access-token');
      expect(clearCookieSpy).toHaveBeenCalledTimes(2);
      expect(clearCookieSpy).toHaveBeenCalledWith(
        'accessToken',
        expect.objectContaining({ httpOnly: true, path: '/' }),
      );
      expect(clearCookieSpy).toHaveBeenCalledWith(
        'refreshToken',
        expect.objectContaining({ httpOnly: true, path: '/' }),
      );
      expect(authService.logout).toHaveBeenCalledWith(1);
      expect(result.success).toBe(true);
    });

    it('should extract userId from cookie when Authorization header is absent', async () => {
      const req = createMockRequest({
        headers: {},
        cookies: { accessToken: 'cookie-access-token' },
      });
      const { res, clearCookieSpy } = createMockResponse();

      jest.spyOn(tokenService, 'verifyAccessToken').mockResolvedValueOnce({
        sub: 42,
        email: 'user@regidoo.com',
        systemRole: 'customer',
      });
      jest.spyOn(authService, 'logout').mockResolvedValueOnce({
        success: true,
        message: 'Logged out successfully',
      });

      const result = await controller.logout(req, res);

      expect(tokenService.verifyAccessToken).toHaveBeenCalledWith('cookie-access-token');
      expect(clearCookieSpy).toHaveBeenCalledTimes(2);
      expect(authService.logout).toHaveBeenCalledWith(42);
      expect(result.success).toBe(true);
    });

    it('should continue clearing cookies and call authService.logout(undefined) if token is expired or invalid', async () => {
      const req = createMockRequest({
        headers: { authorization: 'Bearer expired-token' },
      });
      const { res, clearCookieSpy } = createMockResponse();

      jest
        .spyOn(tokenService, 'verifyAccessToken')
        .mockRejectedValueOnce(new * ('Token expired'));
      jest.spyOn(authService, 'logout').mockResolvedValueOnce({
        success: true,
        message: 'Logged out successfully',
      });

      const result = await controller.logout(req, res);

      expect(clearCookieSpy).toHaveBeenCalledTimes(2);
      expect(authService.logout).toHaveBeenCalledWith(undefined);
      expect(result.success).toBe(true);
    });

    it('should clear cookies and succeed when no token is present in request', async () => {
      const req = createMockRequest({ headers: {}, cookies: {} });
      const { res, clearCookieSpy } = createMockResponse();

      jest.spyOn(authService, 'logout').mockResolvedValueOnce({
        success: true,
        message: 'Logged out successfully',
      });

      const result = await controller.logout(req, res);

      expect(tokenService.verifyAccessToken).not.toHaveBeenCalled();
      expect(clearCookieSpy).toHaveBeenCalledTimes(2);
      expect(authService.logout).toHaveBeenCalledWith(undefined);
      expect(result.success).toBe(true);
    });
  });

  describe('changePassword', () => {
    it('should accept token from Authorization Bearer header, update password, and provision fresh cookies', async () => {
      const dto = {
        currentPassword: 'TempPassword123!',
        newPassword: 'NewSecurePassword@2026!',
      };
      const req = createMockRequest({
        headers: { authorization: 'Bearer scoped-temp-token' },
      });
      const { res, cookieSpy } = createMockResponse();

      jest.spyOn(tokenService, 'verifyAccessToken').mockResolvedValueOnce({
        sub: 1,
        email: 'admin@regidoo.com',
        systemRole: 'system_admin',
      });

      const serviceResult = {
        success: true,
        message: 'Password updated successfully',
        user: { ...mockUser, mustChangePassword: false },
        accessToken: 'fresh-access-token',
        refreshToken: 'fresh-refresh-token',
        redirectTo: '/admin/dashboard',
      };
      jest.spyOn(authService, 'changePassword').mockResolvedValueOnce(serviceResult);

      const result = await controller.changePassword(dto, req, res);

      expect(tokenService.verifyAccessToken).toHaveBeenCalledWith('scoped-temp-token');
      expect(authService.changePassword).toHaveBeenCalledWith(1, dto, '127.0.0.1', undefined);
      expect(cookieSpy).toHaveBeenCalledTimes(2);
      expect(cookieSpy).toHaveBeenCalledWith(
        'accessToken',
        'fresh-access-token',
        expect.objectContaining({ httpOnly: true, path: '/' }),
      );
      expect(cookieSpy).toHaveBeenCalledWith(
        'refreshToken',
        'fresh-refresh-token',
        expect.objectContaining({ httpOnly: true, path: '/' }),
      );
      expect(result).toEqual(serviceResult);
    });

    it('should accept tempToken provided directly inside the body DTO', async () => {
      const dto = {
        currentPassword: 'TempPassword123!',
        newPassword: 'NewSecurePassword@2026!',
        tempToken: 'body-temp-token-xyz',
      };
      const req = createMockRequest({ headers: {} });
      const { res, cookieSpy } = createMockResponse();

      jest.spyOn(tokenService, 'verifyAccessToken').mockResolvedValueOnce({
        sub: 5,
        email: 'user@regidoo.com',
        systemRole: 'customer',
      });

      jest.spyOn(authService, 'changePassword').mockResolvedValueOnce({
        success: true,
        message: 'Password updated successfully',
        user: { ...mockUser, id: 5, mustChangePassword: false },
        accessToken: 'fresh-access-token',
        refreshToken: 'fresh-refresh-token',
        redirectTo: '/dashboard',
      });

      const result = await controller.changePassword(dto, req, res);

      expect(tokenService.verifyAccessToken).toHaveBeenCalledWith('body-temp-token-xyz');
      expect(authService.changePassword).toHaveBeenCalledWith(5, dto, '127.0.0.1', undefined);
      expect(cookieSpy).toHaveBeenCalledTimes(2);
      expect(result.redirectTo).toBe('/dashboard');
    });

    it('should accept token provided in cookies.accessToken if header and body are empty', async () => {
      const dto = {
        currentPassword: 'TempPassword123!',
        newPassword: 'NewSecurePassword@2026!',
      };
      const req = createMockRequest({
        headers: {},
        cookies: { accessToken: 'cookie-temp-token' },
      });
      const { res } = createMockResponse();

      jest.spyOn(tokenService, 'verifyAccessToken').mockResolvedValueOnce({
        sub: 1,
        email: 'admin@regidoo.com',
        systemRole: 'system_admin',
      });

      jest.spyOn(authService, 'changePassword').mockResolvedValueOnce({
        success: true,
        message: 'Password updated successfully',
        user: { ...mockUser, mustChangePassword: false },
        accessToken: 'fresh-access-token',
        refreshToken: 'fresh-refresh-token',
        redirectTo: '/admin/dashboard',
      });

      await controller.changePassword(dto, req, res);

      expect(tokenService.verifyAccessToken).toHaveBeenCalledWith('cookie-temp-token');
      expect(authService.changePassword).toHaveBeenCalled();
    });

    it('should throw 401 Unauthorized if no token is found in header, body, or cookies', async () => {
      const dto = {
        currentPassword: 'TempPassword123!',
        newPassword: 'NewSecurePassword@2026!',
      };
      const req = createMockRequest({ headers: {}, cookies: {} });
      const { res } = createMockResponse();

      await expect(controller.changePassword(dto, req, res)).rejects.toThrow(
        new UnauthorizedException(
          'Authentication token is required to change password',
        ),
      );

      expect(tokenService.verifyAccessToken).not.toHaveBeenCalled();
      expect(authService.changePassword).not.toHaveBeenCalled();
    });
  });

  describe('getProfile', () => {
    it('should return aggregated profile from authService for authenticated user ID', async () => {
      const mockProfile = {
        success: true,
        user: {
          ...mockUser,
          country: { id: 1, code: 'SE', name: 'Sweden', isActive: true },
          language: { id: 1, code: 'en', name: 'English', isActive: true },
          subscription: null,
          stripeCustomer: null,
          families: [],
          companies: [],
          resolvedRoles: ['system_admin'],
        },
      };

      jest.spyOn(authService, 'getProfile').mockResolvedValueOnce(mockProfile);

      const result = await controller.getProfile(1);

      expect(authService.getProfile).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockProfile);
      expect(result.user.resolvedRoles).toContain('system_admin');
    });
  });
});
