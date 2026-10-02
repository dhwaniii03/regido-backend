import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { CryptoService } from '../../common/crypto/crypto.service';

export interface JwtAccessPayload {
  sub: number; // User ID
  email: string;
  systemRole: string;
  sessionToken?: string;
  scope?: string;
  [key: string]: any;
}

export interface GeneratedTokenPair {
  accessToken: string;
  refreshToken: string;
  refreshTokenHash: string;
  refreshExpiresAt: Date;
}

export interface GeneratedSecureToken {
  token: string;
  tokenHash: string;
  expiresAt: Date;
}

@Injectable()
export class TokenService {
  private readonly jwtSecret: string;
  private readonly accessTtl: string;
  private readonly refreshTtl: string;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly cryptoService: CryptoService,
  ) {
    this.jwtSecret =
      this.configService.get<string>('jwt.secret') ||
      this.configService.get<string>('JWT_SECRET') ||
      'regidoo-super-secret-jwt-key-change-in-production-2026';

    this.accessTtl =
      this.configService.get<string>('jwt.accessTtl') ||
      this.configService.get<string>('JWT_ACCESS_TTL') ||
      '15m';

    this.refreshTtl =
      this.configService.get<string>('jwt.refreshTtl') ||
      this.configService.get<string>('JWT_REFRESH_TTL') ||
      '7d';
  }

  /**
   * Generates a signed Access Token (15-minute default TTL)
   * @param userPayload The user identification details
   * @param options Optional overrides for JWT sign options
   * @returns Signed JWT string
   */
  async generateAccessToken(
    userPayload: {
      userId: number;
      email: string;
      systemRole: string;
      sessionToken?: string;
      scope?: string;
    },
    options?: JwtSignOptions,
  ): Promise<string> {
    const payload: JwtAccessPayload = {
      sub: userPayload.userId,
      email: userPayload.email,
      systemRole: userPayload.systemRole,
      sessionToken: userPayload.sessionToken,
      scope: userPayload.scope,
    };

    return this.jwtService.signAsync(payload, {
      secret: this.jwtSecret,
      expiresIn: (this.accessTtl as any) || '15m',
      ...options,
    });
  }

  /**
   * Verifies and decodes a signed Access Token
   * @param token The raw JWT access token string
   * @returns Decoded typed payload
   */
  async verifyAccessToken<T extends JwtAccessPayload = JwtAccessPayload>(
    token: string,
  ): Promise<T> {
    try {
      return await this.jwtService.verifyAsync<T>(token, {
        secret: this.jwtSecret,
      });
    } catch (error) {
      throw new UnauthorizedException(
        error instanceof Error ? `Invalid or expired access token: ${error.message}` : 'Invalid access token',
      );
    }
  }

  /**
   * Generates a secure Refresh Token with a 7-day TTL and its SHA-256 hash for user_sessions
   * @param days Validity duration in days (default: 7)
   * @returns Raw token (sent to client in HttpOnly cookie), SHA-256 hash (saved to DB), and expiry Date
   */
  generateRefreshToken(days = 7): {
    token: string;
    tokenHash: string;
    expiresAt: Date;
  } {
    const { token, tokenHash } = this.cryptoService.generateSecureToken(32);
    const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

    return {
      token,
      tokenHash,
      expiresAt,
    };
  }

  /**
   * Generates a one-time secure link token for password resets / initial invitations / setup links
   * @param hours Validity duration in hours (default: 24h, or 168h / 7d for invites)
   * @returns Raw token (for email URL query param), SHA-256 hash (for password_resets table), and expiry Date
   */
  generateSecureToken(hours = 24): GeneratedSecureToken {
    const { token, tokenHash } = this.cryptoService.generateSecureToken(32);
    const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);

    return {
      token,
      tokenHash,
      expiresAt,
    };
  }

  /**
   * Computes SHA-256 hexadecimal hash
   * @param data Raw token string
   * @returns SHA-256 hex string
   */
  hashSha256(data: string): string {
    return this.cryptoService.hashSha256(data);
  }
}
