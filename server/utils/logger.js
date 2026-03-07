const LEVEL_VALUES = { debug: 0, info: 1, warn: 2, error: 3 };

const configuredLevel = LEVEL_VALUES[process.env.LOG_LEVEL?.toLowerCase()] ?? LEVEL_VALUES.info;

function formatMessage(level, message, meta) {
  const ts = new Date().toISOString();
  const metaStr = meta && Object.keys(meta).length > 0 ? ' ' + JSON.stringify(meta) : '';
  return `[${ts}] [${level.toUpperCase().padEnd(5)}] ${message}${metaStr}`;
}

function log(level, message, meta) {
  if (LEVEL_VALUES[level] < configuredLevel) return;
  const formatted = formatMessage(level, message, meta);
  if (level === 'error') {
    console.error(formatted);
  } else if (level === 'warn') {
    console.warn(formatted);
  } else {
    console.log(formatted);
  }
}

export const logger = {
  debug: (msg, meta) => log('debug', msg, meta),
  info:  (msg, meta) => log('info',  msg, meta),
  warn:  (msg, meta) => log('warn',  msg, meta),
  error: (msg, meta) => log('error', msg, meta),
};
