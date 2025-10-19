/**
 * Environment Configuration and Validation
 * 
 * This module validates all required environment variables at startup
 * and provides type-safe access to configuration values.
 */

interface AppConfig {
  // Core Application
  NODE_ENV: 'development' | 'production' | 'test';
  PORT: number;
  NEXTAUTH_URL: string;
  NEXTAUTH_SECRET: string;

  // Database Configuration
  DATABASE_URL: string;
  VECTOR_DB_URL: string;
  VECTOR_DB_API_KEY: string;
  VECTOR_DB_INDEX_NAME: string;

  // Authentication & Security
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  API_KEY_ENCRYPTION_KEY: string;

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: number;
  RATE_LIMIT_MAX_REQUESTS: number;

  // External API Keys
  OPENAI_API_KEY: string;
  OPENAI_ORG_ID?: string;
  GITHUB_TOKEN: string;
  GITHUB_APP_ID?: string;
  GITHUB_PRIVATE_KEY?: string;
  DROPBOX_APP_KEY?: string;
  DROPBOX_APP_SECRET?: string;
  DROPBOX_ACCESS_TOKEN?: string;
  SLACK_BOT_TOKEN?: string;
  SLACK_APP_TOKEN?: string;
  SLACK_SIGNING_SECRET?: string;
  AWS_ACCESS_KEY_ID?: string;
  AWS_SECRET_ACCESS_KEY?: string;
  AWS_REGION?: string;
  AWS_S3_BUCKET_NAME?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  GOOGLE_REFRESH_TOKEN?: string;
  WEB_SEARCH_API_KEY?: string;
  WEB_SEARCH_ENGINE_ID?: string;

  // Monitoring & Logging
  MONITORING_ENABLED: boolean;
  LOG_LEVEL: 'error' | 'warn' | 'info' | 'debug' | 'trace';
  DATADOG_API_KEY?: string;
  NEW_RELIC_LICENSE_KEY?: string;
  SENTRY_DSN?: string;
  METRICS_PORT: number;
  METRICS_ENDPOINT: string;

  // Caching & Performance
  REDIS_URL?: string;
  CACHE_TTL_SHORT: number;
  CACHE_TTL_MEDIUM: number;
  CACHE_TTL_LONG: number;

  // Agent Orchestration
  TASK_QUEUE_PROVIDER: 'memory' | 'redis' | 'postgres';
  MAX_CONCURRENT_AGENTS: number;
  AGENT_EXECUTION_TIMEOUT: number;
  MEMORY_CHUNK_SIZE: number;
  MEMORY_RETRIEVAL_COUNT: number;
  EMBEDDING_MODEL: string;

  // Development & Debug
  DEBUG_ENABLED: boolean;
  VERBOSE_LOGGING: boolean;
  API_RESPONSE_LOGGING: boolean;
  MOCK_EXTERNAL_APIS: boolean;
  ENABLE_PERFORMANCE_METRICS: boolean;
  SLOW_QUERY_THRESHOLD: number;
}

/**
 * Required environment variables that must be present
 */
const REQUIRED_ENV_VARS = [
  'DATABASE_URL',
  'VECTOR_DB_URL', 
  'VECTOR_DB_API_KEY',
  'VECTOR_DB_INDEX_NAME',
  'JWT_SECRET',
  'API_KEY_ENCRYPTION_KEY',
  'OPENAI_API_KEY',
  'GITHUB_TOKEN',
  'NEXTAUTH_SECRET'
] as const;

/**
 * Environment variables with default values
 */
const ENV_DEFAULTS = {
  NODE_ENV: 'development',
  PORT: 3000,
  NEXTAUTH_URL: 'http://localhost:3000',
  JWT_EXPIRES_IN: '24h',
  RATE_LIMIT_WINDOW_MS: 900000, // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: 100,
  MONITORING_ENABLED: true,
  LOG_LEVEL: 'info',
  METRICS_PORT: 9090,
  METRICS_ENDPOINT: '/metrics',
  CACHE_TTL_SHORT: 300, // 5 minutes
  CACHE_TTL_MEDIUM: 3600, // 1 hour
  CACHE_TTL_LONG: 86400, // 24 hours
  TASK_QUEUE_PROVIDER: 'memory',
  MAX_CONCURRENT_AGENTS: 10,
  AGENT_EXECUTION_TIMEOUT: 300000, // 5 minutes
  MEMORY_CHUNK_SIZE: 1000,
  MEMORY_RETRIEVAL_COUNT: 5,
  EMBEDDING_MODEL: 'text-embedding-3-small',
  DEBUG_ENABLED: false,
  VERBOSE_LOGGING: false,
  API_RESPONSE_LOGGING: false,
  MOCK_EXTERNAL_APIS: false,
  ENABLE_PERFORMANCE_METRICS: true,
  SLOW_QUERY_THRESHOLD: 1000
} as const;

/**
 * Parse and convert string environment variable to number
 */
function parseNumber(value: string | undefined, defaultValue: number): number {
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    throw new Error(`Invalid number value: ${value}`);
  }
  return parsed;
}

/**
 * Parse and convert string environment variable to boolean
 */
function parseBoolean(value: string | undefined, defaultValue: boolean): boolean {
  if (!value) return defaultValue;
  const normalized = value.toLowerCase().trim();
  if (normalized === 'true' || normalized === '1' || normalized === 'yes') {
    return true;
  }
  if (normalized === 'false' || normalized === '0' || normalized === 'no') {
    return false;
  }
  throw new Error(`Invalid boolean value: ${value}. Expected: true/false, 1/0, yes/no`);
}

/**
 * Validate required environment variables
 */
function validateRequiredEnvVars(): void {
  const missing: string[] = [];
  
  for (const envVar of REQUIRED_ENV_VARS) {
    if (!process.env[envVar]) {
      missing.push(envVar);
    }
  }

  if (missing.length > 0) {
    const errorMessage = [
      '❌ Missing required environment variables:',
      '',
      ...missing.map(var_ => `  • ${var_}`),
      '',
      '💡 Please copy .env.example to .env and populate the required values.',
      '📚 Check the documentation for more information about each variable.'
    ].join('\n');
    
    throw new Error(errorMessage);
  }
}

/**
 * Validate JWT secret strength
 */
function validateJwtSecret(secret: string): void {
  if (secret.length < 32) {
    throw new Error(
      '❌ JWT_SECRET must be at least 32 characters long for security. ' +
      'Generate a strong secret with: openssl rand -base64 32'
    );
  }
}

/**
 * Validate API key encryption key
 */
function validateEncryptionKey(key: string): void {
  if (key.length < 32) {
    throw new Error(
      '❌ API_KEY_ENCRYPTION_KEY must be at least 32 characters long. ' +
      'Generate with: openssl rand -base64 32'
    );
  }
}

/**
 * Validate database URL format
 */
function validateDatabaseUrl(url: string): void {
  try {
    new URL(url);
  } catch {
    throw new Error(
      '❌ DATABASE_URL must be a valid URL. ' +
      'Example: postgresql://username:password@localhost:5432/agentforge'
    );
  }
}

/**
 * Load and validate all environment configuration
 */
function loadEnvironmentConfig(): AppConfig {
  // Validate required variables first
  validateRequiredEnvVars();

  // Additional validations for critical values
  const jwtSecret = process.env.JWT_SECRET!;
  const encryptionKey = process.env.API_KEY_ENCRYPTION_KEY!;
  const databaseUrl = process.env.DATABASE_URL!;

  validateJwtSecret(jwtSecret);
  validateEncryptionKey(encryptionKey);
  validateDatabaseUrl(databaseUrl);

  // Build configuration object
  const config: AppConfig = {
    // Core Application
    NODE_ENV: (process.env.NODE_ENV as AppConfig['NODE_ENV']) || ENV_DEFAULTS.NODE_ENV,
    PORT: parseNumber(process.env.PORT, ENV_DEFAULTS.PORT),
    NEXTAUTH_URL: process.env.NEXTAUTH_URL || ENV_DEFAULTS.NEXTAUTH_URL,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET!,

    // Database Configuration
    DATABASE_URL: databaseUrl,
    VECTOR_DB_URL: process.env.VECTOR_DB_URL!,
    VECTOR_DB_API_KEY: process.env.VECTOR_DB_API_KEY!,
    VECTOR_DB_INDEX_NAME: process.env.VECTOR_DB_INDEX_NAME!,

    // Authentication & Security
    JWT_SECRET: jwtSecret,
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || ENV_DEFAULTS.JWT_EXPIRES_IN,
    API_KEY_ENCRYPTION_KEY: encryptionKey,

    // Rate Limiting
    RATE_LIMIT_WINDOW_MS: parseNumber(process.env.RATE_LIMIT_WINDOW_MS, ENV_DEFAULTS.RATE_LIMIT_WINDOW_MS),
    RATE_LIMIT_MAX_REQUESTS: parseNumber(process.env.RATE_LIMIT_MAX_REQUESTS, ENV_DEFAULTS.RATE_LIMIT_MAX_REQUESTS),

    // External API Keys
    OPENAI_API_KEY: process.env.OPENAI_API_KEY!,
    OPENAI_ORG_ID: process.env.OPENAI_ORG_ID,
    GITHUB_TOKEN: process.env.GITHUB_TOKEN!,
    GITHUB_APP_ID: process.env.GITHUB_APP_ID,
    GITHUB_PRIVATE_KEY: process.env.GITHUB_PRIVATE_KEY,
    DROPBOX_APP_KEY: process.env.DROPBOX_APP_KEY,
    DROPBOX_APP_SECRET: process.env.DROPBOX_APP_SECRET,
    DROPBOX_ACCESS_TOKEN: process.env.DROPBOX_ACCESS_TOKEN,
    SLACK_BOT_TOKEN: process.env.SLACK_BOT_TOKEN,
    SLACK_APP_TOKEN: process.env.SLACK_APP_TOKEN,
    SLACK_SIGNING_SECRET: process.env.SLACK_SIGNING_SECRET,
    AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
    AWS_REGION: process.env.AWS_REGION,
    AWS_S3_BUCKET_NAME: process.env.AWS_S3_BUCKET_NAME,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    GOOGLE_REFRESH_TOKEN: process.env.GOOGLE_REFRESH_TOKEN,
    WEB_SEARCH_API_KEY: process.env.WEB_SEARCH_API_KEY,
    WEB_SEARCH_ENGINE_ID: process.env.WEB_SEARCH_ENGINE_ID,

    // Monitoring & Logging
    MONITORING_ENABLED: parseBoolean(process.env.MONITORING_ENABLED, ENV_DEFAULTS.MONITORING_ENABLED),
    LOG_LEVEL: (process.env.LOG_LEVEL as AppConfig['LOG_LEVEL']) || ENV_DEFAULTS.LOG_LEVEL,
    DATADOG_API_KEY: process.env.DATADOG_API_KEY,
    NEW_RELIC_LICENSE_KEY: process.env.NEW_RELIC_LICENSE_KEY,
    SENTRY_DSN: process.env.SENTRY_DSN,
    METRICS_PORT: parseNumber(process.env.METRICS_PORT, ENV_DEFAULTS.METRICS_PORT),
    METRICS_ENDPOINT: process.env.METRICS_ENDPOINT || ENV_DEFAULTS.METRICS_ENDPOINT,

    // Caching & Performance
    REDIS_URL: process.env.REDIS_URL,
    CACHE_TTL_SHORT: parseNumber(process.env.CACHE_TTL_SHORT, ENV_DEFAULTS.CACHE_TTL_SHORT),
    CACHE_TTL_MEDIUM: parseNumber(process.env.CACHE_TTL_MEDIUM, ENV_DEFAULTS.CACHE_TTL_MEDIUM),
    CACHE_TTL_LONG: parseNumber(process.env.CACHE_TTL_LONG, ENV_DEFAULTS.CACHE_TTL_LONG),

    // Agent Orchestration
    TASK_QUEUE_PROVIDER: (process.env.TASK_QUEUE_PROVIDER as AppConfig['TASK_QUEUE_PROVIDER']) || ENV_DEFAULTS.TASK_QUEUE_PROVIDER,
    MAX_CONCURRENT_AGENTS: parseNumber(process.env.MAX_CONCURRENT_AGENTS, ENV_DEFAULTS.MAX_CONCURRENT_AGENTS),
    AGENT_EXECUTION_TIMEOUT: parseNumber(process.env.AGENT_EXECUTION_TIMEOUT, ENV_DEFAULTS.AGENT_EXECUTION_TIMEOUT),
    MEMORY_CHUNK_SIZE: parseNumber(process.env.MEMORY_CHUNK_SIZE, ENV_DEFAULTS.MEMORY_CHUNK_SIZE),
    MEMORY_RETRIEVAL_COUNT: parseNumber(process.env.MEMORY_RETRIEVAL_COUNT, ENV_DEFAULTS.MEMORY_RETRIEVAL_COUNT),
    EMBEDDING_MODEL: process.env.EMBEDDING_MODEL || ENV_DEFAULTS.EMBEDDING_MODEL,

    // Development & Debug
    DEBUG_ENABLED: parseBoolean(process.env.DEBUG_ENABLED, ENV_DEFAULTS.DEBUG_ENABLED),
    VERBOSE_LOGGING: parseBoolean(process.env.VERBOSE_LOGGING, ENV_DEFAULTS.VERBOSE_LOGGING),
    API_RESPONSE_LOGGING: parseBoolean(process.env.API_RESPONSE_LOGGING, ENV_DEFAULTS.API_RESPONSE_LOGGING),
    MOCK_EXTERNAL_APIS: parseBoolean(process.env.MOCK_EXTERNAL_APIS, ENV_DEFAULTS.MOCK_EXTERNAL_APIS),
    ENABLE_PERFORMANCE_METRICS: parseBoolean(process.env.ENABLE_PERFORMANCE_METRICS, ENV_DEFAULTS.ENABLE_PERFORMANCE_METRICS),
    SLOW_QUERY_THRESHOLD: parseNumber(process.env.SLOW_QUERY_THRESHOLD, ENV_DEFAULTS.SLOW_QUERY_THRESHOLD)
  };

  return config;
}

// Load and validate configuration at module import
let appConfig: AppConfig;

try {
  appConfig = loadEnvironmentConfig();
  
  // Log successful configuration load in development
  if (appConfig.NODE_ENV === 'development' && appConfig.DEBUG_ENABLED) {
    console.log('✅ Environment configuration loaded successfully');
    console.log(`🚀 Running in ${appConfig.NODE_ENV} mode on port ${appConfig.PORT}`);
  }
} catch (error) {
  console.error('\n🚨 Environment Configuration Error:\n');
  console.error((error as Error).message);
  console.error('\n💡 Please check your .env file and ensure all required variables are set.\n');
  process.exit(1);
}

export default appConfig;
export type { AppConfig };
