import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigType } from '@nestjs/config';
import { databaseConfig, appConfig } from '../config';
import type { DatabaseConfig } from '../config/database.config';
import type { AppConfig } from '../config/app.config';

/**
 * Global TypeORM module — two named data sources.
 *
 * default  — primary via PgBouncer (port 6432, transaction pool mode)
 *            Use for: all INSERT / UPDATE / DELETE, QueryRunner transactions
 *
 * 'replica' — read replica direct (port 5433)
 *             Use for: SELECT queries that don't need read-your-writes
 *             Inject with: @InjectRepository(Entity, 'replica')
 *
 * Why two sources instead of TypeORM's built-in replication option?
 * TypeORM's replication config routes reads to replicas automatically, but
 * it's not reliable inside transactions — everything goes to master during
 * a QueryRunner transaction. Explicit injection makes the routing obvious
 * and prevents accidental writes to the replica.
 *
 * synchronize: true on default only — the replica gets schema changes via
 * streaming replication, not TypeORM sync.
 */
@Global()
@Module({
  imports: [
    // ── Primary (writes) ──────────────────────────────────────────────────────
    TypeOrmModule.forRootAsync({
      imports: [
        ConfigModule.forFeature(databaseConfig),
        ConfigModule.forFeature(appConfig),
      ],
      useFactory: (dbCfg: DatabaseConfig, appCfg: AppConfig) => ({
        type:             'postgres' as const,
        url:              dbCfg.url,
        autoLoadEntities: true,
        synchronize:      !appCfg.isProduction,
        logging:          appCfg.nodeEnv === 'development',
        ssl:              appCfg.isProduction ? { rejectUnauthorized: true } : false,
      }),
      inject: [databaseConfig.KEY, appConfig.KEY],
    }),

    // ── Read replica (reads) ──────────────────────────────────────────────────
    TypeOrmModule.forRootAsync({
      name: 'replica',
      imports: [
        ConfigModule.forFeature(databaseConfig),
        ConfigModule.forFeature(appConfig),
      ],
      useFactory: (dbCfg: DatabaseConfig, appCfg: AppConfig) => ({
        type:             'postgres' as const,
        name:             'replica',
        url:              dbCfg.readUrl,
        autoLoadEntities: true,
        synchronize:      false, // never sync on replica — schema arrives via WAL replication
        logging:          false,
        ssl:              appCfg.isProduction ? { rejectUnauthorized: true } : false,
      }),
      inject: [databaseConfig.KEY, appConfig.KEY],
    }),
  ],
})
export class DatabaseModule {}
