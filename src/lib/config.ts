/**
 * Application Configuration
 * Centralized configuration management with environment variable validation
 */

import { z } from 'zod';

// Configuration schema validation
const configSchema = z.object({
  // Application
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3000').transform((val) => parseInt(val, 10)),
  
  // Database
  DATABASE_URL: z.string().min(1, 'Database URL is required'),
  
  // Authentication
  JWT_SECRET: z.string().min(32, 'JWT secret must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('24h'),
  BCRYPT_ROUNDS: z.string().default('12').transform((val) => parseInt(val, 10)),
  
  // File Upload
  MAX_FILE_SIZE: z.string().default('52428800').transform((val) => parseInt(val, 10)), // 50MB
  UPLOAD_DIR: z.string().default('./uploads'),
  ALLOWED_FILE_TYPES: z.string().default('pdf,png,jpg,jpeg,gif,webp,txt,csv,doc,docx,xls,xlsx,zip,rar,7z,tar,gz,ppt,pptx,md'),
  
  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.string().default('900000').transform((val) => parseInt(val, 10)), // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: z.string().default('1000').transform((val) => parseInt(val, 10)),
  AUTH_RATE_LIMIT_MAX: z.string().default('5').transform((val) => parseInt(val, 10)),
  UPLOAD_RATE_LIMIT_MAX: z.string().default('10').transform((val) => parseInt(val, 10)),
  
  // Caching
  CACHE_CLEANUP_INTERVAL_MS: z.string().default('300000').transform((val) => parseInt(val, 10)), // 5 minutes
  CACHE_DEFAULT_TTL_MS: z.string().default('1800000').transform((val) => parseInt(val, 10)), // 30 minutes
  
  // Logging
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  
  // Security
  AUDIT_LOG_RETENTION_DAYS: z.string().default('90').transform((val) => parseInt(val, 10)),
  SECURITY_EVENT_THRESHOLD: z.string().default('5').transform((val) => parseInt(val, 10)),
  
  // Background Jobs
  JOB_QUEUE_POLL_INTERVAL_MS: z.string().default('5000').transform((val) => parseInt(val, 10)),
  JOB_CLEANUP_INTERVAL_MS: z.string().default('3600000').transform((val) => parseInt(val, 10)), // 1 hour
  
  // Redis (optional)
  REDIS_URL: z.string().optional(),
  REDIS_HOST: z.string().optional(),
  REDIS_PORT: z.string().optional().transform((val) => val ? parseInt(val, 10) : undefined),
  REDIS_PASSWORD: z.string().optional(),
  
  // External Services
  CDN_URL: z.string().optional(),
  WEBHOOK_URL: z.string().optional(),
});

// Load and validate configuration
function loadConfig() {
  try {
    return configSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Configuration validation failed:');
      error.issues.forEach((err: z.ZodIssue) => {
        console.error(`  ${err.path.join('.')}: ${err.message}`);
      });
      process.exit(1);
    }
    throw error;
  }
}

export const config = loadConfig();

// Derived configurations
export const rateLimit = {
  window: config.RATE_LIMIT_WINDOW_MS,
  max: config.RATE_LIMIT_MAX_REQUESTS,
  auth: {
    window: config.RATE_LIMIT_WINDOW_MS,
    max: config.AUTH_RATE_LIMIT_MAX,
  },
  upload: {
    window: 60000, // 1 minute
    max: config.UPLOAD_RATE_LIMIT_MAX,
  },
  download: {
    window: 60000, // 1 minute
    max: 50,
  },
};

export const cache = {
  cleanupInterval: config.CACHE_CLEANUP_INTERVAL_MS,
  defaultTTL: config.CACHE_DEFAULT_TTL_MS,
  durations: {
    veryShort: 30 * 1000,      // 30 seconds
    short: 5 * 60 * 1000,      // 5 minutes
    medium: 30 * 60 * 1000,    // 30 minutes
    long: 2 * 60 * 60 * 1000,  // 2 hours
    veryLong: 24 * 60 * 60 * 1000, // 24 hours
  },
};

export const fileUpload = {
  maxSize: config.MAX_FILE_SIZE,
  uploadDir: config.UPLOAD_DIR,
  allowedTypes: config.ALLOWED_FILE_TYPES.split(',').map(type => type.trim()),
  compressionThreshold: 10 * 1024 * 1024, // 10MB
};

export const auth = {
  jwtSecret: config.JWT_SECRET,
  jwtExpiresIn: config.JWT_EXPIRES_IN,
  bcryptRounds: config.BCRYPT_ROUNDS,
};

export const logging = {
  level: config.LOG_LEVEL,
  auditRetentionDays: config.AUDIT_LOG_RETENTION_DAYS,
};

export const security = {
  eventThreshold: config.SECURITY_EVENT_THRESHOLD,
};

export const jobs = {
  pollInterval: config.JOB_QUEUE_POLL_INTERVAL_MS,
  cleanupInterval: config.JOB_CLEANUP_INTERVAL_MS,
};

export const redis = {
  url: config.REDIS_URL,
  host: config.REDIS_HOST,
  port: config.REDIS_PORT,
  password: config.REDIS_PASSWORD,
  enabled: !!(config.REDIS_URL || (config.REDIS_HOST && config.REDIS_PORT)),
};

export const external = {
  cdnUrl: config.CDN_URL,
  webhookUrl: config.WEBHOOK_URL,
};

// Environment helpers
export const isDevelopment = config.NODE_ENV === 'development';
export const isProduction = config.NODE_ENV === 'production';
export const isTest = config.NODE_ENV === 'test';

// Validation helpers
export function validateConfig() {
  const issues: string[] = [];
  
  // Check critical configurations
  if (!config.JWT_SECRET || config.JWT_SECRET.length < 32) {
    issues.push('JWT_SECRET must be at least 32 characters long');
  }
  
  if (!config.DATABASE_URL) {
    issues.push('DATABASE_URL is required');
  }
  
  if (isProduction) {
    if (!redis.enabled) {
      console.warn('Warning: Redis not configured for production environment');
    }
    
    if (config.LOG_LEVEL === 'debug') {
      console.warn('Warning: Debug logging enabled in production');
    }
  }
  
  if (issues.length > 0) {
    console.error('Configuration issues found:');
    issues.forEach(issue => console.error(`  - ${issue}`));
    return false;
  }
  
  return true;
}

// Export default config object for backwards compatibility
export default config;
