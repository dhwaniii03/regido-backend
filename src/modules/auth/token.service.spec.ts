import { Test, TestingModule } from '@nestjs/testing';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { TokenService } from './token.service';
import { CryptoService } from '../../common/crypto/crypto.service';
import { jwtConfig } from '../../config/jwt.config';

describe('TokenService', () => {
  let service: TokenService;
  let cryptoService: CryptoService;
  let jwtService: JwtService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [jwtConfig],
        }),
        JwtModule.register({
          secret: 'test-secret-key-12345',
          signOptions: { expiresIn: '15m' },
        }),
      ],
      providers: [TokenService, CryptoService],
    }).compile();

    service = module.get<TokenService>(TokenService);
    cryptoService = module.get<CryptoService>(CryptoService);
    jwtService = module.get<JwtService>(JwtService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateAccessToken & verifyAccessToken', () => {
    it('should generate and verify signed JWT access tokens with standard claims', async () => {
      const payload = {
        userId: 1,
        email: 'admin@regidoo.com',
        systemRole: 'system_admin',
        sessionToken: 'session-xyz',
      };

      const token = await service.generateAccessToken(payload);
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');

      const decoded = await service.verifyAccessToken(token);
      expect(decoded.sub).toBe(1);
      expect(decoded.email).toBe('admin@regidoo.com');
      expect(decoded.systemRole).toBe('system_admin');
      expect(decoded.sessionToken).toBe('session-xyz');
    });

    it('should support generating tokens with custom scope and expiresIn override', async () => {
      const payload = {
        userId: 2,
        email: 'temp@regidoo.com',
        systemRole: 'customer',
        scope: 'PASSWORD_CHANGE_REQUIRED',
      };

      const token = await service.generateAccessToken(payload, { expiresIn: '5m' });
      expect(token).toBeDefined();

      const decoded = await service.verifyAccessToken(token);
      expect(decoded.sub).toBe(2);
      expect(decoded.scope).toBe('PASSWORD_CHANGE_REQUIRED');
    });

    it('should throw UnauthorizedException when verifying an invalid or malformed token', async () => {
      await expect(service.verifyAccessToken('invalid.malformed.token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when verifying an expired token', async () => {
      // Create a token that expires in -1 second
      const expiredToken = await jwtService.signAsync(
        { sub: 1, email: 'admin@regidoo.com' },
        { secret: 'test-secret-key-12345', expiresIn: '0s' },
      );

      // Short pause to ensure expiration
      await new Promise((resolve) => setTimeout(resolve, 50));

      await expect(service.verifyAccessToken(expiredToken)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when verifying a token signed with wrong secret', async () => {
      const untrustedToken = await jwtService.signAsync(
        { sub: 99, email: 'attacker@example.com' },
        { secret: 'wrong-secret-key-67890' },
      );

      await expect(service.verifyAccessToken(untrustedToken)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('generateRefreshToken', () => {
    it('should generate 7-day refresh tokens with SHA-256 hash', () => {
      const { token, tokenHash, expiresAt } = service.generateRefreshToken(7);

      expect(token).toBeDefined();
      expect(tokenHash).toBeDefined();
      expect(cryptoService.hashSha256(token)).toBe(tokenHash);

      // Verify expiry is approximately 7 days from now
      const now = Date.now();
      const diffDays = (expiresAt.getTime() - now) / (1000 * 60 * 60 * 24);
      expect(diffDays).toBeGreaterThan(6.9);
      expect(diffDays).toBeLessThanOrEqual(7.1);
    });

    it('should generate refresh token with custom duration', () => {
      const { token, tokenHash, expiresAt } = service.generateRefreshToken(30);

      expect(token).toBeDefined();
      expect(tokenHash).toBeDefined();
      const now = Date.now();
      const diffDays = (expiresAt.getTime() - now) / (1000 * 60 * 60 * 24);
      expect(diffDays).toBeGreaterThan(29.9);
      expect(diffDays).toBeLessThanOrEqual(30.1);
    });
  });

  describe('generateSecureToken', () => {
    it('should generate secure setup tokens with matching SHA-256 hash', () => {
      const { token, tokenHash, expiresAt } = service.generateSecureToken(24);

      expect(token).toBeDefined();
      expect(tokenHash).toBeDefined();
      expect(service.hashSha256(token)).toBe(tokenHash);

      // Verify expiry is approximately 24 hours from now
      const now = Date.now();
      const diffHours = (expiresAt.getTime() - now) / (1000 * 60 * 60);
      expect(diffHours).toBeGreaterThan(23.9);
      expect(diffHours).toBeLessThanOrEqual(24.1);
    });
  });

  describe('Constructor fallback configurations', () => {
    it('should use default values when ConfigService returns null/undefined', () => {
      const emptyConfigService = {
        get: jest.fn().mockReturnValue(undefined),
      } as unknown as ConfigService;

      const defaultService = new TokenService(
        jwtService,
        emptyConfigService,
        cryptoService,
      );

      expect(defaultService).toBeDefined();
    });
  });
});
