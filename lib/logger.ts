/**
 * 📊 STRUCTURED LOGGING SERVICE
 * Sistema de logging profesional con Winston para producción
 */

import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';
import * as Sentry from '@sentry/nextjs';

const { combine, timestamp, printf, colorize, errors, json } = winston.format;

/**
 * Custom format for console logs (development)
 */
const consoleFormat = printf(({ level, message, timestamp, ...meta }) => {
  let msg = `${timestamp} [${level}] ${message}`;

  // Add metadata if present
  if (Object.keys(meta).length > 0) {
    msg += `\n${JSON.stringify(meta, null, 2)}`;
  }

  return msg;
});

/**
 * Create Winston logger instance
 */
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(
    errors({ stack: true }), // Include stack traces
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    json() // JSON format for structured logging
  ),
  defaultMeta: {
    service: 'arkcutt-ai',
    environment: process.env.NODE_ENV || 'development',
  },
  transports: [],
});

/**
 * DEVELOPMENT: Console with colors
 */
if (process.env.NODE_ENV !== 'production') {
  logger.add(
    new winston.transports.Console({
      format: combine(
        colorize(),
        timestamp({ format: 'HH:mm:ss' }),
        consoleFormat
      ),
    })
  );
}

/**
 * PRODUCTION: File rotation + structured logs
 * NOTE: File logging disabled in serverless environments (Vercel)
 */
if (process.env.NODE_ENV === 'production') {
  const isServerless = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME;

  // Only use file logging in non-serverless environments
  if (!isServerless) {
    // All logs (info+)
    logger.add(
      new DailyRotateFile({
        filename: path.join(process.cwd(), 'logs', 'application-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        maxSize: '20m',
        maxFiles: '14d', // Keep 2 weeks
        level: 'info',
      })
    );

    // Error logs only
    logger.add(
      new DailyRotateFile({
        filename: path.join(process.cwd(), 'logs', 'error-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        maxSize: '20m',
        maxFiles: '30d', // Keep errors for 1 month
        level: 'error',
      })
    );
  }

  // Always use console in production (for Docker/Kubernetes/Vercel logs)
  logger.add(
    new winston.transports.Console({
      format: combine(
        timestamp(),
        json() // Structured JSON for log aggregators
      ),
    })
  );
}

/**
 * Typed logger interface
 */
export interface LogMetadata {
  [key: string]: any;
}

export const log = {
  /**
   * Debug level - detailed info for troubleshooting
   */
  debug: (message: string, meta?: LogMetadata) => {
    logger.debug(message, meta);
  },

  /**
   * Info level - general application flow
   */
  info: (message: string, meta?: LogMetadata) => {
    logger.info(message, meta);
  },

  /**
   * Warning level - something unexpected but not critical
   */
  warn: (message: string, meta?: LogMetadata) => {
    logger.warn(message, meta);

    // Send warnings to Sentry in production
    if (process.env.NODE_ENV === 'production') {
      Sentry.captureMessage(message, {
        level: 'warning',
        extra: meta,
      });
    }
  },

  /**
   * Error level - errors that need attention
   */
  error: (message: string, meta?: LogMetadata) => {
    logger.error(message, meta);

    // Send errors to Sentry
    if (process.env.NODE_ENV === 'production' || process.env.SENTRY_TEST_MODE) {
      // If meta contains an error object, capture it as an exception
      if (meta?.error && meta.error instanceof Error) {
        Sentry.captureException(meta.error, {
          extra: { message, ...meta },
        });
      } else {
        Sentry.captureMessage(message, {
          level: 'error',
          extra: meta,
        });
      }
    }
  },

  /**
   * Create child logger with persistent context
   */
  child: (defaultMeta: LogMetadata) => {
    return logger.child(defaultMeta);
  },
};

/**
 * Backward compatibility with old log function signature
 * log('info', 'message', { meta })
 */
export function logCompat(
  level: 'debug' | 'info' | 'warn' | 'error',
  message: string,
  meta?: LogMetadata
): void {
  logger.log(level, message, meta);
}

export default log;
