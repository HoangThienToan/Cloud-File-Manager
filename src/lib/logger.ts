import { NextRequest } from 'next/server';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export interface LogContext {
  userId?: string;
  requestId?: string;
  ip?: string;
  userAgent?: string;
  method?: string;
  url?: string;
  statusCode?: number;
  duration?: number;
  fileId?: string;
  folderId?: string;
  action?: string;
  error?: Error | string;
  metadata?: Record<string, any>;
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context: LogContext;
}

class Logger {
  private minLevel: LogLevel;
  private logs: LogEntry[] = [];
  private maxLogs: number = 1000; // Keep last 1000 logs in memory

  constructor(minLevel: LogLevel = LogLevel.INFO) {
    this.minLevel = minLevel;
  }

  public log(level: LogLevel, message: string, context: LogContext = {}): void {
    if (level < this.minLevel) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
    };

    // Add to memory store
    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // Console output with appropriate level
    const formattedMessage = this.formatMessage(entry);
    switch (level) {
      case LogLevel.DEBUG:
        console.debug(formattedMessage);
        break;
      case LogLevel.INFO:
        console.info(formattedMessage);
        break;
      case LogLevel.WARN:
        console.warn(formattedMessage);
        break;
      case LogLevel.ERROR:
        console.error(formattedMessage);
        break;
    }
  }

  private formatMessage(entry: LogEntry): string {
    const levelStr = LogLevel[entry.level];
    const { userId, requestId, action, error, ...otherContext } = entry.context;
    
    let parts = [
      `[${entry.timestamp}]`,
      `[${levelStr}]`,
      entry.message,
    ];

    if (userId) parts.push(`userId=${userId}`);
    if (requestId) parts.push(`requestId=${requestId}`);
    if (action) parts.push(`action=${action}`);
    
    if (Object.keys(otherContext).length > 0) {
      parts.push(`context=${JSON.stringify(otherContext)}`);
    }
    
    if (error) {
      const errorStr = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
      parts.push(`error="${errorStr}"`);
    }

    return parts.join(' ');
  }

  debug(message: string, context?: LogContext): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  info(message: string, context?: LogContext): void {
    this.log(LogLevel.INFO, message, context);
  }

  warn(message: string, context?: LogContext): void {
    this.log(LogLevel.WARN, message, context);
  }

  error(message: string, context?: LogContext): void {
    this.log(LogLevel.ERROR, message, context);
  }

  // Get recent logs for debugging
  getRecentLogs(count: number = 100): LogEntry[] {
    return this.logs.slice(-count);
  }

  // Clear logs
  clear(): void {
    this.logs = [];
  }

  // Set minimum log level
  setLevel(level: LogLevel): void {
    this.minLevel = level;
  }
}

// Global logger instance
export const logger = new Logger(
  process.env.NODE_ENV === 'development' ? LogLevel.DEBUG : LogLevel.INFO
);

// Request logger middleware helper
export function createRequestLogger(req: NextRequest): LogContext {
  const forwarded = req.headers.get('x-forwarded-for');
  const realIp = req.headers.get('x-real-ip');
  const ip = forwarded ? forwarded.split(',')[0].trim() : realIp || 'unknown';
  
  return {
    requestId: crypto.randomUUID(),
    ip,
    userAgent: req.headers.get('user-agent') || 'unknown',
    method: req.method,
    url: req.url,
  };
}

// Audit logging for security events
export const auditLogger = {
  loginAttempt: (context: LogContext & { success: boolean; email?: string }) => {
    logger.info(
      context.success ? 'User login successful' : 'User login failed',
      { ...context, action: 'auth.login' }
    );
  },

  loginSuccess: (context: LogContext & { email: string }) => {
    logger.info('User logged in successfully', { ...context, action: 'auth.login_success' });
  },

  loginFailure: (context: LogContext & { email?: string; reason?: string }) => {
    logger.warn('User login failed', { ...context, action: 'auth.login_failure' });
  },

  logout: (context: LogContext) => {
    logger.info('User logged out', { ...context, action: 'auth.logout' });
  },

  register: (context: LogContext & { email: string }) => {
    logger.info('New user registered', { ...context, action: 'auth.register' });
  },

  fileUpload: (context: LogContext & { fileName: string; fileSize: number }) => {
    logger.info('File uploaded', { ...context, action: 'file.upload' });
  },

  fileDownload: (context: LogContext & { fileName: string }) => {
    logger.info('File downloaded', { ...context, action: 'file.download' });
  },

  fileDelete: (context: LogContext & { fileName: string }) => {
    logger.info('File deleted', { ...context, action: 'file.delete' });
  },

  fileShare: (context: LogContext & { fileName: string; shareToken: string }) => {
    logger.info('File shared', { ...context, action: 'file.share' });
  },

  bulkOperation: (context: LogContext & { operation: string; fileCount: number }) => {
    logger.info(`Bulk ${context.operation} operation`, { ...context, action: `bulk.${context.operation}` });
  },

  securityEvent: (context: LogContext & { event: string; severity: 'low' | 'medium' | 'high' }) => {
    const level = context.severity === 'high' ? LogLevel.ERROR : 
                  context.severity === 'medium' ? LogLevel.WARN : LogLevel.INFO;
    logger.log(level, `Security event: ${context.event}`, { ...context, action: 'security.event' });
  },

  rateLimitHit: (context: LogContext & { endpoint: string; limit: number }) => {
    logger.warn('Rate limit exceeded', { ...context, action: 'security.rate_limit' });
  },
};

// Performance logging
export const perfLogger = {
  apiCall: (context: LogContext & { endpoint: string; duration: number; statusCode: number }) => {
    const level = context.statusCode >= 500 ? LogLevel.ERROR : 
                  context.statusCode >= 400 ? LogLevel.WARN : LogLevel.INFO;
    
    logger.log(level, `API call completed`, { ...context, action: 'api.call' });
  },

  dbQuery: (context: LogContext & { query: string; duration: number; rowCount?: number }) => {
    logger.debug('Database query executed', { ...context, action: 'db.query' });
  },

  fileOperation: (context: LogContext & { operation: string; duration: number; success: boolean }) => {
    const level = context.success ? LogLevel.INFO : LogLevel.ERROR;
    logger.log(level, `File operation: ${context.operation}`, { ...context, action: 'file.operation' });
  },
};

// Error logging with stack traces
export const errorLogger = {
  apiError: (context: LogContext & { error: Error; endpoint: string }) => {
    logger.error(`API error in ${context.endpoint}`, {
      ...context,
      action: 'error.api',
      metadata: {
        stack: context.error.stack,
        name: context.error.name,
      },
    });
  },

  dbError: (context: LogContext & { error: Error; query?: string }) => {
    logger.error('Database error', {
      ...context,
      action: 'error.database',
      metadata: {
        stack: context.error.stack,
        name: context.error.name,
      },
    });
  },

  fileSystemError: (context: LogContext & { error: Error; filePath?: string }) => {
    logger.error('File system error', {
      ...context,
      action: 'error.filesystem',
      metadata: {
        stack: context.error.stack,
        name: context.error.name,
      },
    });
  },

  validationError: (context: LogContext & { error: Error | string; input?: any }) => {
    logger.warn('Validation error', {
      ...context,
      action: 'error.validation',
      error: context.error,
    });
  },
};

// Utility function to time operations
export function timeOperation<T>(
  operation: () => Promise<T>,
  name: string,
  context: LogContext = {}
): Promise<T> {
  const start = Date.now();
  
  return operation()
    .then(result => {
      const duration = Date.now() - start;
      logger.debug(`Operation ${name} completed`, { ...context, duration, action: 'perf.operation' });
      return result;
    })
    .catch(error => {
      const duration = Date.now() - start;
      logger.error(`Operation ${name} failed`, { 
        ...context, 
        duration, 
        error, 
        action: 'perf.operation_failed' 
      });
      throw error;
    });
}
