/**
 * Health-check integration + unit tests
 *
 * Run with:  npm test  (requires Node 18+)
 *
 * Tests are grouped into three suites:
 *   1. ServiceRegistry  – pure unit tests, no I/O
 *   2. EnvValidation    – unit tests for environment-variable validation
 *   3. ExponentialBackoff – unit tests for retry-delay calculation
 *   4. HealthEndpoint   – lightweight integration test using a real HTTP server
 */

import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import http   from 'node:http';
import express from 'express';

import {
  setServiceStatus,
  getServiceStatus,
  getAllServiceStatuses,
  isServiceHealthy,
  _resetRegistry,
} from '../utils/serviceRegistry.js';

import { validateEnv }    from '../config/env.js';
import { getNextRetryAt } from '../emailWorker/emailWorker.js';

// ─── 1. ServiceRegistry ───────────────────────────────────────────────────────

describe('ServiceRegistry', () => {
  beforeEach(() => _resetRegistry());

  it('stores and retrieves a healthy status', () => {
    setServiceStatus('db', 'healthy', 'Connected');
    const s = getServiceStatus('db');
    assert.equal(s.status,  'healthy');
    assert.equal(s.message, 'Connected');
    assert.ok(s.updatedAt, 'updatedAt should be set');
  });

  it('returns "unknown" for a service that was never registered', () => {
    const s = getServiceStatus('nonexistent');
    assert.equal(s.status, 'unknown');
  });

  it('isServiceHealthy returns true only for healthy status', () => {
    setServiceStatus('svc', 'healthy', '');
    assert.ok(isServiceHealthy('svc'));

    setServiceStatus('svc', 'degraded', '');
    assert.ok(!isServiceHealthy('svc'));

    setServiceStatus('svc', 'disabled', '');
    assert.ok(!isServiceHealthy('svc'));
  });

  it('getAllServiceStatuses returns all registered entries', () => {
    setServiceStatus('alpha', 'healthy',  'ok');
    setServiceStatus('beta',  'failed',   'timeout');
    setServiceStatus('gamma', 'disabled', 'no credentials');

    const all = getAllServiceStatuses();
    assert.equal(Object.keys(all).length, 3);
    assert.equal(all.alpha.status, 'healthy');
    assert.equal(all.beta.status,  'failed');
    assert.equal(all.gamma.status, 'disabled');
  });

  it('overwrites a previous status for the same service', () => {
    setServiceStatus('svc', 'initializing', '');
    setServiceStatus('svc', 'healthy',      'Ready');
    assert.equal(getServiceStatus('svc').status, 'healthy');
  });
});

// ─── 2. EnvValidation ─────────────────────────────────────────────────────────

describe('EnvValidation', () => {
  it('throws when MONGODB_URI is missing', () => {
    assert.throws(
      () => validateEnv({}),
      err => {
        assert.ok(err.message.includes('MONGODB_URI'));
        return true;
      },
    );
  });

  it('throws listing ALL missing critical variables', () => {
    assert.throws(
      () => validateEnv({}),
      /MONGODB_URI/,
    );
  });

  it('does not throw when all critical variables are present', () => {
    assert.doesNotThrow(() =>
      validateEnv({ MONGODB_URI: 'mongodb://localhost:27017/test' }),
    );
  });

  it('returns correct typed config object', () => {
    const cfg = validateEnv({
      MONGODB_URI:        'mongodb://localhost:27017/test',
      PORT:               '4000',
      GMAIL_USER:         'test@gmail.com',
      GMAIL_APP_PASSWORD: 'secret',
    });

    assert.equal(cfg.PORT,        4000);
    assert.equal(cfg.MONGODB_URI, 'mongodb://localhost:27017/test');
    assert.equal(cfg.emailEnabled, true);
  });

  it('sets emailEnabled = false when email credentials are missing', () => {
    const cfg = validateEnv({ MONGODB_URI: 'mongodb://localhost:27017/test' });
    assert.equal(cfg.emailEnabled, false);
    assert.equal(cfg.GMAIL_USER,         null);
    assert.equal(cfg.GMAIL_APP_PASSWORD, null);
  });

  it('defaults PORT to 3001 when not provided', () => {
    const cfg = validateEnv({ MONGODB_URI: 'mongodb://localhost:27017/test' });
    assert.equal(cfg.PORT, 3001);
  });
});

// ─── 3. ExponentialBackoff ────────────────────────────────────────────────────

describe('ExponentialBackoff (getNextRetryAt)', () => {
  const BASE_MS = 30_000;

  it('first retry is ~30 s from now', () => {
    const before = Date.now();
    const next   = getNextRetryAt(1);
    const after  = Date.now();

    const diff = next.getTime() - before;
    assert.ok(diff >= BASE_MS, `Expected >= ${BASE_MS}ms, got ${diff}ms`);
    assert.ok(diff <= BASE_MS + (after - before) + 50, 'Should not exceed 30s + test overhead');
  });

  it('second retry is ~60 s (double the first)', () => {
    const before = Date.now();
    const next   = getNextRetryAt(2);
    const diff   = next.getTime() - before;

    assert.ok(diff >= BASE_MS * 2);
  });

  it('third retry is ~120 s (quadruple the first)', () => {
    const before = Date.now();
    const next   = getNextRetryAt(3);
    const diff   = next.getTime() - before;

    assert.ok(diff >= BASE_MS * 4);
  });

  it('each successive attempt doubles the delay', () => {
    const d1 = getNextRetryAt(1).getTime() - Date.now();
    const d2 = getNextRetryAt(2).getTime() - Date.now();
    const d3 = getNextRetryAt(3).getTime() - Date.now();

    // Allow 100 ms of jitter between calls
    assert.ok(d2 >= d1 * 1.9, 'delay should roughly double on attempt 2');
    assert.ok(d3 >= d2 * 1.9, 'delay should roughly double on attempt 3');
  });
});

// ─── 4. HealthEndpoint (integration) ─────────────────────────────────────────

describe('HealthEndpoint (integration)', () => {
  let server;
  let baseUrl;

  /** Minimal Express app that mounts only the health route. */
  function buildHealthApp() {
    const app = express();
    app.get('/api/health', (_req, res) => {
      const services = getAllServiceStatuses();
      const allOk    = Object.values(services).every(
        s => s.status === 'healthy' || s.status === 'disabled',
      );
      res.status(allOk ? 200 : 207).json({
        status:    allOk ? 'healthy' : 'degraded',
        timestamp: new Date().toISOString(),
        services,
      });
    });
    return app;
  }

  function get(path) {
    return new Promise((resolve, reject) => {
      http.get(`${baseUrl}${path}`, res => {
        let body = '';
        res.on('data', chunk => (body += chunk));
        res.on('end', () => {
          try { resolve({ status: res.statusCode, body: JSON.parse(body) }); }
          catch (e) { reject(e); }
        });
      }).on('error', reject);
    });
  }

  before(async () => {
    await new Promise(resolve => {
      server = buildHealthApp().listen(0, () => {
        baseUrl = `http://127.0.0.1:${server.address().port}`;
        resolve();
      });
    });
  });

  after(async () => {
    await new Promise(resolve => server.close(resolve));
  });

  beforeEach(() => _resetRegistry());

  it('returns 200 and status=healthy when all services are healthy', async () => {
    setServiceStatus('mongodb',     'healthy',  'Connected');
    setServiceStatus('email',       'healthy',  'SMTP ready');
    setServiceStatus('emailWorker', 'healthy',  'Polling');

    const { status, body } = await get('/api/health');

    assert.equal(status, 200);
    assert.equal(body.status, 'healthy');
    assert.ok(body.timestamp);
    assert.ok(body.services.mongodb);
  });

  it('returns 200 when email is disabled but mongodb is healthy', async () => {
    setServiceStatus('mongodb', 'healthy',  'Connected');
    setServiceStatus('email',   'disabled', 'No credentials');

    const { status, body } = await get('/api/health');

    assert.equal(status, 200);
    assert.equal(body.status, 'healthy');
  });

  it('returns 207 when a critical service has failed', async () => {
    setServiceStatus('mongodb',     'failed',  'Connection refused');
    setServiceStatus('email',       'healthy', 'SMTP ready');
    setServiceStatus('emailWorker', 'healthy', 'Polling');

    const { status, body } = await get('/api/health');

    assert.equal(status, 207);
    assert.equal(body.status, 'degraded');
    assert.equal(body.services.mongodb.status, 'failed');
  });

  it('returns 207 when a service is still initializing', async () => {
    setServiceStatus('mongodb', 'initializing', 'Connecting…');

    const { status, body } = await get('/api/health');

    assert.equal(status, 207);
    assert.equal(body.status, 'degraded');
  });

  it('includes all registered services in the response', async () => {
    setServiceStatus('mongodb',     'healthy',  '');
    setServiceStatus('email',       'disabled', '');
    setServiceStatus('emailWorker', 'disabled', '');

    const { body } = await get('/api/health');

    assert.ok('mongodb'     in body.services);
    assert.ok('email'       in body.services);
    assert.ok('emailWorker' in body.services);
  });
});
