import { Test, TestingModule } from '@nestjs/testing';
import {
  UnauthorizedException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { TokenService } from './token.service';
import { CryptoService } from '../../common/crypto/crypto.service';
import { DRIZZLE } from '../../db/drizzle.provider';

describe('AuthService', () => {
  let authService: AuthService;
  let cryptoService: CryptoService;
  let tokenService: TokenService;
  let mockDb: any;

  const mockActiveUser = {
    id: 1,
    username: 'admin',
    email: 'admin@regidoo.com',
    passwordHash: '$argon2id$v=19$m=65536,t=3,p=4$mockhash',
    mobileNumber: '+46701234567',
    city: 'Stockholm',
    postalCode: '11122',
    countryId: 1,
    languageId: 1,
    accountType: 'personal' as const,
    status: 'active' as const,
    systemRole: 'system_admin' as const,
    mustChangePassword: false,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    deletedAt: null,
  };

  const mockCountry = {
    id: 1,
    code: 'SE',
    name: 'Sweden',
    isActive: true,
  };

  const mockLanguage = {
    id: 1,
    code: 'en',
    name: 'English',
    isActive: true,
  };

  function createMockQuery(results: any[]) {
    const chain: any = {
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      innerJoin: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue(results),
      then: (resolve: any, reject: any) => Promise.resolve(results).then(resolve, reject),
    };
    return chain;
  }

  beforeEach(async () => {
    mockDb = {
      select: jest.fn().mockImplementation(() => createMockQuery([mockActiveUser])),
      insert: jest.fn().mockReturnValue({
        values: jest.fn().mockResolvedValue([{ id: 1 }]),
      }),
      update: jest.fn().mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([{ id: 1 }]),
        }),
      }),
      transaction: jest.fn().mockImplementation(async (callback) => {
        return callback(mockDb);
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: DRIZZLE,
          useValue: mockDb,
        },
        {
          provide: CryptoService,
          useValue: {
            comparePassword: jest.fn().mockResolvedValue(true),
            hashPassword: jest.fn().mockResolvedValue('$argon2id$v=19$newhashedpassword'),
          },
        },
        {
          provide: TokenService,
          useValue: {
            generateAccessToken: jest.fn().mockResolvedValue('mock-access-token'),
            generateRefreshToken: jest.fn().mockReturnValue({
              token: 'mock-refresh-token',
              tokenHash: 'mock-refresh-hash',
              expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            }),
          },
        },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
    cryptoService = module.get<CryptoService>(CryptoService);
    tokenService = module.get<TokenService>(TokenService);
  });

  it('should be defined', () => {
    expect(authService).toBeDefined();
  });

  describe('sanitizeUser', () => {
    it('should strip passwordHash and deletedAt from the returned user object', () => {
      const sanitized = authService.sanitizeUser(mockActiveUser as any);

      expect(sanitized).toBeDefined();
      expect(sanitized.id).toBe(1);
      expect(sanitized.email).toBe('admin@regidoo.com');
      expect((sanitized as any).passwordHash).toBeUndefined();
      expect((sanitized as any).deletedAt).toBeUndefined();
      expect(sanitized.mustChangePassword).toBe(false);
      expect(sanitized.systemRole).toBe('system_admin');
    });
  });

  describe('resolveDashboardRoute', () => {
    it('should return /admin/dashboard for system_admin role', () => {
      expect(authService.resolveDashboardRoute('system_admin', 'personal')).toBe(
        '/admin/dashboard',
      );
      expect(authService.resolveDashboardRoute('system_admin', 'business')).toBe(
        '/admin/dashboard',
      );
    });

    it('should return /company for business accountType when not system_admin', () => {
      expect(authService.resolveDashboardRoute('company_admin', 'business')).toBe(
        '/company',
      );
      expect(authService.resolveDashboardRoute('company_staff', 'business')).toBe(
        '/company',
      );
    });

    it('should return /family for family accountType when not system_admin', () => {
      expect(authService.resolveDashboardRoute('family_head', 'family')).toBe(
        '/family',
      );
      expect(authService.resolveDashboardRoute('family_member', 'family')).toBe(
        '/family',
      );
    });

    it('should default to /dashboard for personal or other account types', () => {
      expect(authService.resolveDashboardRoute('customer', 'personal')).toBe(
        '/dashboard',
      );
      expect(authService.resolveDashboardRoute('user', 'custom')).toBe('/dashboard');
    });
  });

  describe('login', () => {
    it('should normalize and lowercase the email address before querying the database', async () => {
      mockDb.select.mockImplementationOnce(() => createMockQuery([mockActiveUser]));

      await authService.login({
        email: '  Admin@RegiDOO.com  ',
        password: 'Password123!',
      });

      expect(mockDb.select).toHaveBeenCalled();
    });

    it('should throw 401 Unauthorized if user is not found in database', async () => {
      mockDb.select.mockImplementationOnce(() => createMockQuery([]));

      await expect(
        authService.login({ email: 'nonexistent@example.com', password: 'password123' }),
      ).rejects.toThrow(new UnauthorizedException('Invalid credentials'));

      expect(cryptoService.comparePassword).not.toHaveBeenCalled();
      expect(mockDb.insert).not.toHaveBeenCalled();
    });

    it('should throw 403 Forbidden if user account is suspended', async () => {
      mockDb.select.mockImplementationOnce(() =>
        createMockQuery([{ ...mockActiveUser, status: 'suspended' }]),
      );

      await expect(
        authService.login({ email: 'admin@regidoo.com', password: 'password123' }),
      ).rejects.toThrow(new ForbiddenException('Account suspended. Contact support.'));

      expect(cryptoService.comparePassword).not.toHaveBeenCalled();
      expect(mockDb.insert).not.toHaveBeenCalled();
    });

    it('should throw 401 Unauthorized if password verification fails', async () => {
      mockDb.select.mockImplementationOnce(() => createMockQuery([mockActiveUser]));
      jest.spyOn(cryptoService, 'comparePassword').mockResolvedValueOnce(false);

      await expect(
        authService.login({ email: 'admin@regidoo.com', password: 'WrongPassword!' }),
      ).rejects.toThrow(new UnauthorizedException('Invalid credentials'));

      expect(mockDb.insert).not.toHaveBeenCalled();
      expect(tokenService.generateAccessToken).not.toHaveBeenCalled();
    });

    it('should return temporary scoped token when mustChangePassword is true without creating a session', async () => {
      mockDb.select.mockImplementationOnce(() =>
        createMockQuery([{ ...mockActiveUser, mustChangePassword: true }]),
      );
      jest.spyOn(cryptoService, 'comparePassword').mockResolvedValueOnce(true);
      jest
        .spyOn(tokenService, 'generateAccessToken')
        .mockResolvedValueOnce('mock-temp-scoped-token');

      const response = await authService.login({
        email: 'admin@regidoo.com',
        password: 'TempAdmin@2026!',
      });

      expect(response.success).toBe(true);
      expect(response.mustChangePassword).toBe(true);
      expect(response.tempToken).toBe('mock-temp-scoped-token');
      expect(response.accessToken).toBeUndefined();
      expect(response.refreshToken).toBeUndefined();
      expect(response.message).toBe(
        'Temporary password must be changed before accessing the platform.',
      );
      expect(tokenService.generateAccessToken).toHaveBeenCalledWith(
        {
          userId: 1,
          email: 'admin@regidoo.com',
          systemRole: 'system_admin',
          scope: 'PASSWORD_CHANGE_REQUIRED',
        },
        { expiresIn: '15m' },
      );
      // No active session in user_sessions or audit log should be inserted for temp login
      expect(mockDb.insert).not.toHaveBeenCalled();
    });

    it('should complete standard login, record session, create audit log, and return access/refresh tokens when mustChangePassword is false', async () => {
      mockDb.select.mockImplementationOnce(() =>
        createMockQuery([{ ...mockActiveUser, mustChangePassword: false }]),
      );
      jest.spyOn(cryptoService, 'comparePassword').mockResolvedValueOnce(true);

      const response = await authService.login(
        { email: 'admin@regidoo.com', password: 'PermanentPassword@2026!' },
        '192.168.1.100',
        'Mozilla/5.0 Chrome/122.0',
      );

      expect(response.success).toBe(true);
      expect(response.mustChangePassword).toBe(false);
      expect(response.accessToken).toBe('mock-access-token');
      expect(response.refreshToken).toBe('mock-refresh-token');
      expect(response.user.email).toBe('admin@regidoo.com');

      // Verify user_sessions and audit_logs DB inserts
      expect(mockDb.insert).toHaveBeenCalledTimes(2);
      expect(tokenService.generateRefreshToken).toHaveBeenCalledWith(7);
      expect(tokenService.generateAccessToken).toHaveBeenCalledWith({
        userId: 1,
        email: 'admin@regidoo.com',
        systemRole: 'system_admin',
        sessionToken: 'mock-refresh-hash',
      });
    });

    it('should handle optional clientIp and userAgent when missing', async () => {
      mockDb.select.mockImplementationOnce(() => createMockQuery([mockActiveUser]));

      const response = await authService.login({
        email: 'admin@regidoo.com',
        password: 'PermanentPassword@2026!',
      });

      expect(response.success).toBe(true);
      expect(mockDb.insert).toHaveBeenCalledTimes(2);
    });

    it('should propagate database select exceptions during login', async () => {
      mockDb.select.mockImplementationOnce(() => {
        throw new Error('Database connection lost');
      });

      await expect(
        authService.login({ email: 'admin@regidoo.com', password: 'password123' }),
      ).rejects.toThrow('Database connection lost');
    });

    it('should propagate database insert failure during session recording', async () => {
      mockDb.select.mockImplementationOnce(() => createMockQuery([mockActiveUser]));
      mockDb.insert.mockImplementationOnce(() => {
        throw new Error('Unique constraint violation on session token');
      });

      await expect(
        authService.login({ email: 'admin@regidoo.com', password: 'password123' }),
      ).rejects.toThrow('Unique constraint violation on session token');
    });
  });

  describe('logout', () => {
    it('should revoke active database sessions and record audit log when userId is provided', async () => {
      const response = await authService.logout(1);

      expect(response).toEqual({
        success: true,
        message: 'Logged out successfully',
      });
      expect(mockDb.update).toHaveBeenCalled();
      expect(mockDb.insert).toHaveBeenCalled();
    });

    it('should succeed cleanly and idempotently when userId is undefined', async () => {
      const response = await authService.logout(undefined);

      expect(response).toEqual({
        success: true,
        message: 'Logged out successfully',
      });
      expect(mockDb.update).not.toHaveBeenCalled();
      expect(mockDb.insert).not.toHaveBeenCalled();
    });

    it('should propagate database errors during session revocation', async () => {
      mockDb.update.mockReturnValueOnce({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockRejectedValue(new Error('DB Connection Timeout')),
        }),
      });

      await expect(authService.logout(1)).rejects.toThrow('DB Connection Timeout');
    });
  });

  describe('changePassword', () => {
    it('should throw 401 Unauthorized if user is not found or account deleted', async () => {
      mockDb.select.mockImplementationOnce(() => createMockQuery([]));

      await expect(
        authService.changePassword(999, {
          currentPassword: 'TempPassword123!',
          newPassword: 'NewPassword@2026!',
        }),
      ).rejects.toThrow(
        new UnauthorizedException('User not found or account deleted'),
      );
    });

    it('should throw 403 Forbidden if user account is suspended', async () => {
      mockDb.select.mockImplementationOnce(() =>
        createMockQuery([{ ...mockActiveUser, status: 'suspended' }]),
      );

      await expect(
        authService.changePassword(1, {
          currentPassword: 'TempPassword123!',
          newPassword: 'NewPassword@2026!',
        }),
      ).rejects.toThrow(new ForbiddenException('Account suspended. Contact support.'));
    });

    it('should throw 400 Bad Request if current temporary password is incorrect', async () => {
      mockDb.select.mockImplementationOnce(() => createMockQuery([mockActiveUser]));
      jest.spyOn(cryptoService, 'comparePassword').mockResolvedValueOnce(false);

      await expect(
        authService.changePassword(1, {
          currentPassword: 'WrongTempPassword',
          newPassword: 'NewSecurePassword@2026!',
        }),
      ).rejects.toThrow(new BadRequestException('Current password incorrect'));

      expect(mockDb.transaction).not.toHaveBeenCalled();
    });

    it('should update password atomically in transaction, revoke old sessions, insert fresh session, log audit, and return dashboard redirect', async () => {
      mockDb.select.mockImplementationOnce(() =>
        createMockQuery([{ ...mockActiveUser, mustChangePassword: true }]),
      );
      jest.spyOn(cryptoService, 'comparePassword').mockResolvedValueOnce(true);

      const response = await authService.changePassword(
        1,
        {
          currentPassword: 'TempAdmin@2026!',
          newPassword: 'NewPermanentPassword@2026!',
        },
        '127.0.0.1',
        'Mozilla/5.0',
      );

      expect(response.success).toBe(true);
      expect(response.message).toBe('Password updated successfully');
      expect(response.user.mustChangePassword).toBe(false);
      expect(response.accessToken).toBe('mock-access-token');
      expect(response.refreshToken).toBe('mock-refresh-token');
      expect(response.redirectTo).toBe('/admin/dashboard');

      expect(cryptoService.hashPassword).toHaveBeenCalledWith('NewPermanentPassword@2026!');
      expect(mockDb.transaction).toHaveBeenCalled();
    });

    it('should correctly set business dashboard redirect for business accountType users', async () => {
      mockDb.select.mockImplementationOnce(() =>
        createMockQuery([
          {
            ...mockActiveUser,
            systemRole: 'company_admin',
            accountType: 'business',
            mustChangePassword: true,
          },
        ]),
      );

      const response = await authService.changePassword(1, {
        currentPassword: 'TempAdmin@2026!',
        newPassword: 'NewPermanentPassword@2026!',
      });

      expect(response.redirectTo).toBe('/company');
    });

    it('should correctly set family dashboard redirect for family accountType users', async () => {
      mockDb.select.mockImplementationOnce(() =>
        createMockQuery([
          {
            ...mockActiveUser,
            systemRole: 'family_head',
            accountType: 'family',
            mustChangePassword: true,
          },
        ]),
      );

      const response = await authService.changePassword(1, {
        currentPassword: 'TempAdmin@2026!',
        newPassword: 'NewPermanentPassword@2026!',
      });

      expect(response.redirectTo).toBe('/family');
    });

    it('should propagate transaction failures and rollback', async () => {
      mockDb.select.mockImplementationOnce(() => createMockQuery([mockActiveUser]));
      mockDb.transaction.mockImplementationOnce(async () => {
        throw new Error('Transaction deadlocked');
      });

      await expect(
        authService.changePassword(1, {
          currentPassword: 'TempAdmin@2026!',
          newPassword: 'NewPermanentPassword@2026!',
        }),
      ).rejects.toThrow('Transaction deadlocked');
    });
  });

  describe('getProfile', () => {
    it('should throw 401 Unauthorized if user is not found or soft-deleted', async () => {
      mockDb.select.mockImplementationOnce(() => createMockQuery([]));

      await expect(authService.getProfile(999)).rejects.toThrow(
        new UnauthorizedException('User not found or account deleted'),
      );
    });

    it('should throw 403 Forbidden if user account is suspended', async () => {
      mockDb.select.mockImplementationOnce(() =>
        createMockQuery([{ ...mockActiveUser, status: 'suspended' }]),
      );

      await expect(authService.getProfile(1)).rejects.toThrow(
        new ForbiddenException('Account suspended. Contact support.'),
      );
    });

    it('should return complete user profile with country, language, subscription, stripeCustomer, family, and company memberships', async () => {
      const mockSubscription = {
        userSubscription: {
          id: 10,
          userId: 1,
          subscriptionId: 2,
          status: 'active',
        },
        plan: {
          id: 2,
          planName: 'Pro Plan',
          monthlyPrice: '29.00',
        },
      };

      const mockStripeCustomer = {
        id: 5,
        userId: 1,
        stripeCustomerId: 'cus_mock123',
        status: 'connected',
      };

      const mockFamilyRow = {
        member: { role: 'family_head', status: 'active' },
        family: { id: 3, name: 'Smith Family' },
      };

      const mockCompanyRow = {
        companyUser: { role: 'company_admin', status: 'active' },
        company: { id: 4, name: 'Acme Corp' },
      };

      mockDb.select
        .mockImplementationOnce(() => createMockQuery([mockActiveUser])) // user
        .mockImplementationOnce(() => createMockQuery([mockCountry])) // country
        .mockImplementationOnce(() => createMockQuery([mockLanguage])) // language
        .mockImplementationOnce(() => createMockQuery([mockSubscription])) // subscription
        .mockImplementationOnce(() => createMockQuery([mockStripeCustomer])) // stripeCustomer
        .mockImplementationOnce(() => createMockQuery([mockFamilyRow])) // familyMemberships
        .mockImplementationOnce(() => createMockQuery([mockCompanyRow])); // companyMemberships

      const response = await authService.getProfile(1);

      expect(response.success).toBe(true);
      expect(response.user).toBeDefined();
      expect(response.user.email).toBe('admin@regidoo.com');
      expect(response.user.country).toEqual(mockCountry);
      expect(response.user.language).toEqual(mockLanguage);
      expect(response.user.subscription).toBeDefined();
      expect(response.user.stripeCustomer).toEqual(mockStripeCustomer);
      expect(response.user.families).toHaveLength(1);
      expect(response.user.companies).toHaveLength(1);
      expect(response.user.resolvedRoles).toEqual(
        expect.arrayContaining(['system_admin', 'family_head', 'company_admin']),
      );
    });

    it('should handle null countryId and languageId gracefully without querying relational tables', async () => {
      const userWithoutLocalization = {
        ...mockActiveUser,
        countryId: null,
        languageId: null,
      };

      mockDb.select
        .mockImplementationOnce(() => createMockQuery([userWithoutLocalization])) // user
        .mockImplementationOnce(() => createMockQuery([])) // subscription
        .mockImplementationOnce(() => createMockQuery([])) // stripeCustomer
        .mockImplementationOnce(() => createMockQuery([])) // familyMemberships
        .mockImplementationOnce(() => createMockQuery([])); // companyMemberships

      const response = await authService.getProfile(1);

      expect(response.success).toBe(true);
      expect(response.user.country).toBeNull();
      expect(response.user.language).toBeNull();
      expect(response.user.resolvedRoles).toEqual(['system_admin']);
    });

    it('should exclude non-active family or company membership roles from resolvedRoles', async () => {
      const mockPendingFamily = {
        member: { role: 'family_member', status: 'pending' },
        family: { id: 3, name: 'Smith Family' },
      };

      const mockInactiveCompany = {
        companyUser: { role: 'company_staff', status: 'suspended' },
        company: { id: 4, name: 'Acme Corp' },
      };

      mockDb.select
        .mockImplementationOnce(() => createMockQuery([mockActiveUser])) // user
        .mockImplementationOnce(() => createMockQuery([mockCountry])) // country
        .mockImplementationOnce(() => createMockQuery([mockLanguage])) // language
        .mockImplementationOnce(() => createMockQuery([])) // subscription
        .mockImplementationOnce(() => createMockQuery([])) // stripeCustomer
        .mockImplementationOnce(() => createMockQuery([mockPendingFamily])) // familyMemberships
        .mockImplementationOnce(() => createMockQuery([mockInactiveCompany])); // companyMemberships

      const response = await authService.getProfile(1);

      expect(response.user.resolvedRoles).toEqual(['system_admin']);
      expect(response.user.resolvedRoles).not.toContain('family_member');
      expect(response.user.resolvedRoles).not.toContain('company_staff');
    });

    it('should propagate database select errors in getProfile', async () => {
      mockDb.select.mockImplementationOnce(() => {
        throw new Error('Database read replica unavailable');
      });

      await expect(authService.getProfile(1)).rejects.toThrow(
        'Database read replica unavailable',
      );
    });
  });
});
