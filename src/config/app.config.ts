import { registerAs } from '@nestjs/config';

export interface AppConfig {
  port: number;
  nodeEnv: string;
  isProduction: boolean;
}

/**
 * registerAs('app', ...) namespaces this config under the 'app' key.
 * Inject it with @Inject(appConfig.KEY) and type it as ConfigType<typeof appConfig>.
 * process.env is ONLY read here — never in services or controllers.
 */
export default registerAs(
  'app',
  (): AppConfig => ({
    port: parseInt(process.env.PORT ?? '3000', 10),
    nodeEnv: process.env.NODE_ENV ?? 'development',
    isProduction: process.env.NODE_ENV === 'production',
  }),
);
