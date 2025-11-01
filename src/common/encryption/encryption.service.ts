import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class EncryptionService {
  private readonly algorithm: string;
  private readonly key: Buffer;

  constructor(private configService: ConfigService) {
    const algorithm = this.configService.get<string>('encryption.algorithm');
    if (!algorithm) {
      throw new Error('ENCRYPTION_ALGORITHM must be defined in your configuration.');
    }
    this.algorithm = algorithm;

    const keyString = this.configService.get<string>('encryption.key');
    if (!keyString) {
      throw new Error('ENCRYPTION_KEY must be defined in your configuration.');
    }

    if (keyString.length < 32) {
      throw new Error(
        'ENCRYPTION_KEY must be at least 32 characters long. Generate one with: openssl rand -hex 32',
      );
    }

    // Derive a 32-byte key from the provided key string
    this.key = crypto.scryptSync(keyString, 'salt', 32);
  }

  /**
   * Encrypts sensitive data using AES-256-GCM
   * @param plaintext - The text to encrypt
   * @returns Encrypted string with IV and auth tag (format: iv:authTag:encrypted)
   */
  encrypt(plaintext: string): string {
    if (!plaintext) {
      throw new Error('Cannot encrypt empty or null value');
    }

    // Generate a random initialization vector (IV)
    const iv = crypto.randomBytes(16);

    // Create cipher
    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);

    // Encrypt the data
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    // Get the authentication tag (GCM mode)
    const authTag = (cipher as crypto.CipherGCM).getAuthTag();

    // Return IV:authTag:encrypted format
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  /**
   * Decrypts data encrypted with the encrypt method
   * @param encryptedData - Encrypted string in format: iv:authTag:encrypted
   * @returns Decrypted plaintext
   */
  decrypt(encryptedData: string): string {
    if (!encryptedData) {
      throw new Error('Cannot decrypt empty or null value. The API key appears to be missing.');
    }

    try {
      // Split the encrypted data into components
      const parts = encryptedData.split(':');
      if (parts.length !== 3) {
        throw new Error(
          `Invalid encrypted data format. Expected 3 parts (iv:authTag:encrypted), got ${parts.length}. ` +
          `Data appears to be in an old format or corrupted.`,
        );
      }

      const iv = Buffer.from(parts[0], 'hex');
      const authTag = Buffer.from(parts[1], 'hex');
      const encrypted = parts[2];

      // Create decipher
      const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);
      (decipher as crypto.DecipherGCM).setAuthTag(authTag);

      // Decrypt the data
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      throw new Error(
        `Decryption failed: ${error.message}. ` +
        `This usually means the ENCRYPTION_KEY environment variable has changed or the data was encrypted with a different key.`,
      );
    }
  }

  /**
   * Hashes a string using SHA-256 (one-way, for passwords/tokens)
   * @param data - The data to hash
   * @returns Hex-encoded hash
   */
  hash(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Compares a plaintext value with a hash
   * @param plaintext - The original value
   * @param hash - The hash to compare against
   * @returns True if they match
   */
  compareHash(plaintext: string, hash: string): boolean {
    const plaintextHash = this.hash(plaintext);
    return crypto.timingSafeEqual(
      Buffer.from(plaintextHash),
      Buffer.from(hash),
    );
  }
}
