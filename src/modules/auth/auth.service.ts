import {
  Injectable,
  Inject,
  UnauthorizedException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { eq, and, isNull } from 'drizzle-orm';
import { DRIZZLE, type DrizzleDB } from '../../db/drizzle.provider';
import * as schema from '../../db/schema';
import { CryptoService } from '../../common/crypto/crypto.service';
import { TokenService } from './token.service';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import {
  AuthLoginResponseDto,
  ChangePasswordResponseDto,
  UserProfileResponseDto,
  SanitizedUserDto,
} from './dto/auth-response.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @Inject(DRIZZLE)
    private readonly db: DrizzleDB,
    private readonly cryptoService: CryptoService,
    private readonly tokenService: TokenService,
  ) {}

  /**
   * Sanitizes a user entity for safe client consumption (strips password hash)
   */
  sanitizeUser(user: schema.User): SanitizedUserDto {
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      mobileNumber: user.mobileNumber,
      city: user.city,
      postalCode: user.postalCode,
      countryId: user.countryId,
      languageId: user.languageId,
      accountType: user.accountType,
      status: user.status,
      systemRole: user.systemRole,
      mustChangePassword: user.mustChangePassword,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  /**
   * Resolves target destination route based on system role and account type
   */
  resolveDashboardRoute(systemRole: string, accountType: string): string {
    if (systemRole === 'system_admin') {
      return '/admin/dashboard';
    }
    if (accountType === 'business') {
      return '/company';
    }
    if (accountType === 'family') {
      return '/family';
    }
    return '/dashboard';
  }

  /**
   * Authenticates user credentials with temporary password interception (TASK-05)
   * @param dto Login credentials (email, password)
   * @param ipAddress Client IP address
   * @param userAgent Client User-Agent header
   */
  async login(
    dto: LoginDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<AuthLoginResponseDto> {
    const normalizedEmail = dto.email.trim().toLowerCase();

    // 1. Query user by email (WHERE deleted_at IS NULL)
    const [user] = await this.db
      .select()
      .from(schema.users)
      .where(and(eq(schema.users.email, normalizedEmail), isNull(schema.users.deletedAt)))
      .limit(1);

    if (!user) {
      this.logger.warn(`Failed login attempt for non-existent user: ${normalizedEmail}`);
      throw new UnauthorizedException('Invalid credentials');
    }

    // 2. Check user status
    if (user.status === 'suspended') {
      this.logger.warn(`Login blocked for suspended user: ${normalizedEmail} (ID: ${user.id})`);
      throw new ForbiddenException('Account suspended. Contact support.');
    }

    // 3. Verify password hash using Argon2 / Bcrypt
    const isPasswordValid = await this.cryptoService.comparePassword(
      dto.password,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      this.logger.warn(`Failed login attempt (wrong password) for user: ${normalizedEmail}`);
      throw new UnauthorizedException('Invalid credentials');
    }

    const sanitizedUser = this.sanitizeUser(user);

    // 4. Evaluate must_change_password flag
    if (user.mustChangePassword) {
      this.logger.log(
        `Temporary password detected for user: ${user.email} (ID: ${user.id}) - issuing password change token`,
      );

      // Issue temporary scoped token for password change
      const tempToken = await this.tokenService.generateAccessToken(
        {
          userId: user.id,
          email: user.email,
          systemRole: user.systemRole,
          scope: 'PASSWORD_CHANGE_REQUIRED',
        },
        { expiresIn: '15m' },
      );

      return {
        success: true,
        message: 'Temporary password must be changed before accessing the platform.',
        user: sanitizedUser,
        mustChangePassword: true,
        tempToken,
      };
    }

    // 5. Standard full login flow (must_change_password === false)
    const refreshData = this.tokenService.generateRefreshToken(7);

    // Record session in user_sessions
    await this.db.insert(schema.userSessions).values({
      userId: user.id,
      refreshTokenHash: refreshData.tokenHash,
      ipAddress: ipAddress || null,
      userAgent: userAgent || null,
      expiresAt: refreshData.expiresAt,
      lastUsedAt: new Date(),
    });

    // Generate 15-minute access token
    const accessToken = await this.tokenService.generateAccessToken({
      userId: user.id,
      email: user.email,
      systemRole: user.systemRole,
      sessionToken: refreshData.tokenHash,
    });

    // Record forensic audit log
    await this.db.insert(schema.auditLogs).values({
      actorUserId: user.id,
      action: 'user.login',
      entityType: 'user',
      entityId: user.id,
      actionData: {
        username: user.username,
        email: user.email,
        systemRole: user.systemRole,
        accountType: user.accountType,
        ipAddress,
        userAgent,
        loginAt: new Date().toISOString(),
      },
      ipAddress: ipAddress || null,
    });

    this.logger.log(`✅ User authenticated successfully: ${user.email} (Role: ${user.systemRole})`);

    return {
      success: true,
      message: 'Login successful',
      user: sanitizedUser,
      mustChangePassword: false,
      accessToken,
      refreshToken: refreshData.token,
    };
  }

  /**
   * Terminates active session and records audit log
   */
  async logout(userId?: number): Promise<{ success: boolean; message: string }> {
    if (userId) {
      await this.db
        .update(schema.userSessions)
        .set({ revokedAt: new Date() })
        .where(and(eq(schema.userSessions.userId, userId), isNull(schema.userSessions.revokedAt)));

      await this.db.insert(schema.auditLogs).values({
        actorUserId: userId,
        action: 'user.logout',
        entityType: 'user',
        entityId: userId,
        actionData: {
          logoutAt: new Date().toISOString(),
        },
      });
      this.logger.log(`🚪 User logged out: ID ${userId}`);
    }
    return { success: true, message: 'Logged out successfully' };
  }

  /**
   * Changes temporary password to permanent password and activates full session (TASK-06)
   * @param userId The ID of the authenticated user
   * @param dto Current and new password payload
   * @param ipAddress Client IP address
   * @param userAgent Client User-Agent header
   */
  async changePassword(
    userId: number,
    dto: ChangePasswordDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<ChangePasswordResponseDto> {
    // 1. Fetch user from database
    const [user] = await this.db
      .select()
      .from(schema.users)
      .where(and(eq(schema.users.id, userId), isNull(schema.users.deletedAt)))
      .limit(1);

    if (!user) {
      throw new UnauthorizedException('User not found or account deleted');
    }

    if (user.status === 'suspended') {
      throw new ForbiddenException('Account suspended. Contact support.');
    }

    // 2. Verify current/temporary password matches stored hash
    const isCurrentPasswordValid = await this.cryptoService.comparePassword(
      dto.currentPassword,
      user.passwordHash,
    );

    if (!isCurrentPasswordValid) {
      this.logger.warn(`Failed password change for user: ${user.email} (current password incorrect)`);
      throw new BadRequestException('Current password incorrect');
    }

    // 3. Hash new permanent password using Argon2id
    const newPasswordHash = await this.cryptoService.hashPassword(dto.newPassword);

    // 4. Generate fresh 7-day refresh token pair
    const refreshData = this.tokenService.generateRefreshToken(7);

    // 5. Execute atomic database transaction
    await this.db.transaction(async (tx) => {
      // Update password and reset must_change_password flag
      await tx
        .update(schema.users)
        .set({
          passwordHash: newPasswordHash,
          mustChangePassword: false,
          updatedAt: new Date(),
        })
        .where(eq(schema.users.id, user.id));

      // Revoke any previous active sessions
      await tx
        .update(schema.userSessions)
        .set({ revokedAt: new Date() })
        .where(and(eq(schema.userSessions.userId, user.id), isNull(schema.userSessions.revokedAt)));

      // Insert fresh active session
      await tx.insert(schema.userSessions).values({
        userId: user.id,
        refreshTokenHash: refreshData.tokenHash,
        ipAddress: ipAddress || null,
        userAgent: userAgent || null,
        expiresAt: refreshData.expiresAt,
        lastUsedAt: new Date(),
      });

      // Record in audit logs
      await tx.insert(schema.auditLogs).values({
        actorUserId: user.id,
        action: 'user.password_changed',
        entityType: 'user',
        entityId: user.id,
        actionData: {
          username: user.username,
          email: user.email,
          systemRole: user.systemRole,
          reason: 'temporary_password_resolved',
          changedAt: new Date().toISOString(),
        },
        ipAddress: ipAddress || null,
      });
    });

    // 6. Generate fresh Access Token
    const accessToken = await this.tokenService.generateAccessToken({
      userId: user.id,
      email: user.email,
      systemRole: user.systemRole,
      sessionToken: refreshData.tokenHash,
    });

    const sanitizedUser: SanitizedUserDto = {
      ...this.sanitizeUser(user),
      mustChangePassword: false,
      updatedAt: new Date(),
    };

    const redirectTo = this.resolveDashboardRoute(user.systemRole, user.accountType);

    this.logger.log(`🔑 Password changed and full session established for: ${user.email}`);

    return {
      success: true,
      message: 'Password updated successfully',
      user: sanitizedUser,
      accessToken,
      refreshToken: refreshData.token,
      redirectTo,
    };
  }

  /**
   * Retrieves full profile, localization, memberships, and subscription details for active user (TASK-07)
   * @param userId The ID of the authenticated user
   */
  async getProfile(userId: number): Promise<UserProfileResponseDto> {
    // 1. Fetch user by ID (WHERE deleted_at IS NULL)
    const [user] = await this.db
      .select()
      .from(schema.users)
      .where(and(eq(schema.users.id, userId), isNull(schema.users.deletedAt)))
      .limit(1);

    if (!user) {
      throw new UnauthorizedException('User not found or account deleted');
    }

    if (user.status === 'suspended') {
      throw new ForbiddenException('Account suspended. Contact support.');
    }

    // 2. Fetch country and language in parallel
    const countryPromise = user.countryId
      ? this.db
          .select()
          .from(schema.countries)
          .where(eq(schema.countries.id, user.countryId))
          .limit(1)
          .then((rows) => rows[0] || null)
      : Promise.resolve(null);

    const languagePromise = user.languageId
      ? this.db
          .select()
          .from(schema.languages)
          .where(eq(schema.languages.id, user.languageId))
          .limit(1)
          .then((rows) => rows[0] || null)
      : Promise.resolve(null);

    // 3. Fetch active user subscription and plan
    const subscriptionPromise = this.db
      .select({
        userSubscription: schema.userSubscriptions,
        plan: schema.subscriptions,
      })
      .from(schema.userSubscriptions)
      .leftJoin(
        schema.subscriptions,
        eq(schema.userSubscriptions.subscriptionId, schema.subscriptions.id),
      )
      .where(
        and(
          eq(schema.userSubscriptions.userId, user.id),
          isNull(schema.userSubscriptions.deletedAt),
        ),
      )
      .limit(1)
      .then((rows) => {
        if (!rows.length || !rows[0].userSubscription) return null;
        return {
          ...rows[0].userSubscription,
          plan: rows[0].plan || null,
        };
      });

    // 4. Fetch Stripe Customer record
    const stripeCustomerPromise = this.db
      .select()
      .from(schema.stripeCustomers)
      .where(
        and(
          eq(schema.stripeCustomers.userId, user.id),
          isNull(schema.stripeCustomers.deletedAt),
        ),
      )
      .limit(1)
      .then((rows) => rows[0] || null);

    // 5. Fetch Family memberships
    const familyMembershipsPromise = this.db
      .select({
        member: schema.familyMembers,
        family: schema.families,
      })
      .from(schema.familyMembers)
      .innerJoin(schema.families, eq(schema.familyMembers.familyId, schema.families.id))
      .where(
        and(
          eq(schema.familyMembers.userId, user.id),
          isNull(schema.familyMembers.deletedAt),
          isNull(schema.families.deletedAt),
        ),
      )
      .then((rows) =>
        rows.map((r) => ({
          ...r.family,
          memberRole: r.member.role,
          membershipStatus: r.member.status,
        })),
      );

    // 6. Fetch Company memberships
    const companyMembershipsPromise = this.db
      .select({
        companyUser: schema.companyUsers,
        company: schema.companies,
      })
      .from(schema.companyUsers)
      .innerJoin(schema.companies, eq(schema.companyUsers.companyId, schema.companies.id))
      .where(
        and(
          eq(schema.companyUsers.userId, user.id),
          isNull(schema.companyUsers.deletedAt),
          isNull(schema.companies.deletedAt),
        ),
      )
      .then((rows) =>
        rows.map((r) => ({
          ...r.company,
          employeeRole: r.companyUser.role,
          membershipStatus: r.companyUser.status,
        })),
      );

    const [country, language, subscription, stripeCustomer, families, companies] =
      await Promise.all([
        countryPromise,
        languagePromise,
        subscriptionPromise,
        stripeCustomerPromise,
        familyMembershipsPromise,
        companyMembershipsPromise,
      ]);

    // 7. Compute resolved roles list
    const resolvedRolesSet = new Set<string>();
    resolvedRolesSet.add(user.systemRole);

    for (const fam of families) {
      if (fam.membershipStatus === 'active') {
        resolvedRolesSet.add(fam.memberRole);
      }
    }

    for (const comp of companies) {
      if (comp.membershipStatus === 'active') {
        resolvedRolesSet.add(comp.employeeRole);
      }
    }

    const resolvedRoles = Array.from(resolvedRolesSet);

    return {
      success: true,
      user: {
        ...this.sanitizeUser(user),
        country,
        language,
        subscription,
        stripeCustomer,
        families,
        companies,
        resolvedRoles,
      },
    };
  }
}
