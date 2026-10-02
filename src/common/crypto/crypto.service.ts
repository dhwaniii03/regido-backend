import { Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';
import * as crypto from 'crypto';

@Injectable()
export class CryptoService {
  /**
   * Hashes a plain-text password using Argon2id (OWASP recommended parameters)
   * @param plainText The plain-text password
   * @returns The Argon2id encoded hash string
   */
  async hashPassword(plainText: string): Promise<string> {
    return argon2.hash(plainText, {
      type: argon2.argon2id,
      memoryCost: 65536, // 64 MB
      timeCost: 3,
      parallelism: 4,
    });
  }

  /**
   * Compares a plain-text password against an Argon2 / Bcrypt hash
   * @param plainText The candidate plain-text password
   * @param hash The stored hash
   * @returns True if password matches, false otherwise
   */
  async comparePassword(plainText: string, hash: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, plainText);
    } catch {
      return false;
    }
  }

  /**
   * Computes a SHA-256 hexadecimal hash of any input string
   * @param data The input string to hash
   * @returns The 64-character SHA-256 hex string
   */
  hashSha256(data: string): string {
    return crypto.createHash('sha256').update(data, 'utf8').digest('hex');
  }

  /**
   * Generates a cryptographically secure random hexadecimal token
   * @param bytes Number of random bytes (default 32 bytes = 64 hex chars)
   * @returns The hex string token
   */
  generateRandomToken(bytes = 32): string {
    return crypto.randomBytes(bytes).toString('hex');
  }

  /**
   * Generates a raw secure random token and its SHA-256 hash for database storage
   * @param bytes Number of random bytes (default 32)
   * @returns Object containing raw token (to send in email/link) and tokenHash (to save in DB)
   */
  generateSecureToken(bytes = 32): { token: string; tokenHash: string } {
    const token = this.generateRandomToken(bytes);
    const tokenHash = this.hashSha256(token);
    return { token, tokenHash };
  }
}
