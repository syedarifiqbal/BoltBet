import { registerAs } from '@nestjs/config';

export interface DatabaseConfig {
  url: string;
  readUrl: string;
}

/**
 * Database connection config.
 *
 * Two URLs because writes and reads go to different hosts:
 *   url     → PgBouncer (port 6432) → postgres-primary
 *   readUrl → postgres-replica (port 5433) directly
 *
 * The application MUST enforce routing at the query level.
 * See docs/postgres.md §6 for rules on which operations must
 * always use the primary (wallet balance, bet debit, settlement).
 */
export default registerAs(
  'database',
  (): DatabaseConfig => ({
    url: process.env.DATABASE_URL!,
    readUrl: process.env.DATABASE_READ_URL!,
  }),
);
