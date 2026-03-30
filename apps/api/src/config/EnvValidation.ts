import * as Joi from 'joi';

/**
 * Joi schema that validates all environment variables at startup.
 * The app will refuse to start if any required variable is missing
 * or has the wrong type — catching config mistakes before they become
 * runtime errors in production.
 *
 * Rules:
 *   .required()  — must be present in the environment
 *   .optional()  — not yet needed (future phases), but validated if present
 *   .default()   — used if the variable is absent (development convenience only)
 *
 * Add new variables here the moment they are added to .env.example.
 */
export const validationSchema = Joi.object({
  // ── App ────────────────────────────────────────────────────────────────────
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().default(3000),

  // ── RabbitMQ ───────────────────────────────────────────────────────────────
  RABBITMQ_URL: Joi.string().uri({ scheme: ['amqp', 'amqps'] }).required(),

  // ── Postgres (Phase 1) ─────────────────────────────────────────────────────
  DATABASE_URL: Joi.string().uri({ scheme: ['postgresql', 'postgres'] }).required(),
  DATABASE_READ_URL: Joi.string().uri({ scheme: ['postgresql', 'postgres'] }).required(),

  // ── Redis (Phase 1) ────────────────────────────────────────────────────────
  REDIS_URL: Joi.string().uri({ scheme: ['redis', 'rediss'] }).required(),
  REDIS_EPHEMERAL_URL: Joi.string().uri({ scheme: ['redis', 'rediss'] }).required(),

  // ── JWT / Auth (Phase 2) ───────────────────────────────────────────────────
  // RS256 asymmetric keys. Generate with: make keys
  // Store as single-line env vars with literal \n for newlines.
  JWT_PRIVATE_KEY: Joi.string().required(),
  JWT_PUBLIC_KEY:  Joi.string().required(),
  JWT_ACCESS_TTL:  Joi.number().default(900),        // seconds — 15 minutes
  JWT_REFRESH_TTL: Joi.number().default(604800),     // seconds — 7 days

  // ── Password security (Phase 2) ────────────────────────────────────────────
  // Generate with: openssl rand -hex 32
  PASSWORD_PEPPER:     Joi.string().min(32).required(),
  TOTP_ENCRYPTION_KEY: Joi.string().length(32).optional(), // Phase 2 MFA
  HIBP_API_KEY:        Joi.string().optional(),            // optional — checks skipped if absent
});

export const validationOptions = {
  allowUnknown: true,   // don't error on variables not listed here (e.g. system vars)
  abortEarly: false,    // report ALL validation errors at once, not just the first
};
