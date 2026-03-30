import { registerAs } from '@nestjs/config';

export interface SecurityConfig {
  passwordPepper: string;
  totpEncryptionKey: string;
  hibpApiKey: string | undefined;
}

/**
 * Security-sensitive secrets that are separate from JWT config.
 *
 * passwordPepper   — prepended to passwords before bcrypt hashing.
 *                    Minimum 32 bytes. Generate: openssl rand -hex 32
 *                    A DB dump without the pepper cannot crack passwords.
 *
 * totpEncryptionKey — AES-256-GCM key for encrypting TOTP secrets at rest.
 *                     Exactly 32 bytes. Used in Phase 2 MFA implementation.
 *
 * hibpApiKey       — HaveIBeenPwned API key for k-anonymity password checks.
 *                    Optional — checks are skipped if not set.
 */
export default registerAs(
  'security',
  (): SecurityConfig => ({
    passwordPepper:    process.env.PASSWORD_PEPPER    ?? '',
    totpEncryptionKey: process.env.TOTP_ENCRYPTION_KEY ?? '',
    hibpApiKey:        process.env.HIBP_API_KEY,
  }),
);
