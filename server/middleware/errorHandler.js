import { logger } from '../utils/logger.js';

/**
 * Custom error class that carries an HTTP status code.
 * Use this in route handlers to signal predictable client errors:
 *
 *   throw new AppError('Not found', 404);
 */
export class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
  }
}

/**
 * Centralized Express error-handling middleware.
 *
 * Must be registered AFTER all routes:
 *   app.use(errorHandler);
 *
 * - Logs every error with request context
 * - Returns meaningful JSON responses without leaking internals
 * - Never crashes the process
 */
export function errorHandler(err, req, res, next) {  // eslint-disable-line no-unused-vars
  const statusCode = err.statusCode ?? err.status ?? 500;

  logger.error('[HTTP] Unhandled error', {
    method:  req.method,
    path:    req.path,
    status:  statusCode,
    error:   err.message,
    ...(statusCode >= 500 && { stack: err.stack }),
  });

  if (res.headersSent) return;

  // Only expose messages for client errors (4xx); generic message for 5xx
  const message = statusCode < 500 ? err.message : 'Internal server error';

  res.status(statusCode).json({
    error: message,
    // Include stack trace in development for faster debugging
    ...(process.env.NODE_ENV === 'development' && statusCode >= 500 && { stack: err.stack }),
  });
}

/**
 * Fallback handler for unmatched routes.
 * Register immediately before errorHandler.
 */
export function notFoundHandler(req, res) {
  res.status(404).json({ error: `Cannot ${req.method} ${req.path}` });
}
