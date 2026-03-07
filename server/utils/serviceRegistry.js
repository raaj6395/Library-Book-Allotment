/**
 * In-memory registry that tracks the health status of every service
 * the server depends on (MongoDB, email SMTP, email worker, etc.).
 *
 * Statuses:
 *   initializing – startup in progress
 *   healthy      – fully operational
 *   degraded     – partially working (e.g. reconnecting)
 *   failed       – unavailable, feature disabled
 *   disabled     – intentionally off (missing optional config)
 */

const registry = new Map();

export function setServiceStatus(name, status, message = '') {
  registry.set(name, {
    status,
    message,
    updatedAt: new Date().toISOString(),
  });
}

export function getServiceStatus(name) {
  return registry.get(name) ?? { status: 'unknown', message: '', updatedAt: null };
}

export function getAllServiceStatuses() {
  return Object.fromEntries(registry.entries());
}

export function isServiceHealthy(name) {
  return registry.get(name)?.status === 'healthy';
}

// For testing purposes only — resets the registry between tests
export function _resetRegistry() {
  registry.clear();
}
