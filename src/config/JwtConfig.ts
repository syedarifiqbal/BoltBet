import { registerAs } from '@nestjs/config';

export interface JwtConfig {
  privateKey: string;
  publicKey: string;
  accessTtl: number;  // seconds
  refreshTtl: number; // seconds
}

/**
 * RS256 asymmetric JWT configuration.
 *
 * Private key: Identity Service only — used to sign tokens.
 * Public key:  every service that verifies tokens.
 *
 * Keys are stored in env vars as single-line strings where newlines are
 * escaped as literal "\n". The .replace() calls restore real newlines,
 * which the PEM format requires.
 *
 * Generate keys:  make keys
 */
export default registerAs(
  'jwt',
  (): JwtConfig => ({
    privateKey: (process.env.JWT_PRIVATE_KEY ?? '').replace(/\\n/g, '\n'),
    publicKey:  (process.env.JWT_PUBLIC_KEY  ?? '').replace(/\\n/g, '\n'),
    accessTtl:  parseInt(process.env.JWT_ACCESS_TTL  ?? '900',    10),
    refreshTtl: parseInt(process.env.JWT_REFRESH_TTL ?? '604800', 10),
  }),
);
