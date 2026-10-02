import { Test, TestingModule } from '@nestjs/testing';
import { CryptoService } from './crypto.service';

describe('CryptoService', () => {
  let service: CryptoService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CryptoService],
    }).compile();

    service = module.get<CryptoService>(CryptoService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should hash a password using Argon2id and verify it correctly', async () => {
    const plainText = 'SecurePassword@2026!';
    const hash = await service.hashPassword(plainText);

    expect(hash).toBeDefined();
    expect(hash.startsWith('$argon2id$')).toBe(true);

    const isMatch = await service.comparePassword(plainText, hash);
    expect(isMatch).toBe(true);

    const isWrongMatch = await service.comparePassword('WrongPassword', hash);
    expect(isWrongMatch).toBe(false);
  });

  it('should generate valid SHA-256 hashes', () => {
    const input = 'sample-token-string';
    const hash1 = service.hashSha256(input);
    const hash2 = service.hashSha256(input);

    expect(hash1).toHaveLength(64);
    expect(hash1).toBe(hash2);
  });

  it('should generate secure tokens with matching SHA-256 hash', () => {
    const { token, tokenHash } = service.generateSecureToken(32);

    expect(token).toHaveLength(64); // 32 bytes in hex = 64 chars
    expect(tokenHash).toHaveLength(64);
    expect(service.hashSha256(token)).toBe(tokenHash);
  });
});
