/* Minimal leveled logger. Swappable for pino/winston later without
 * touching call sites. */
const logger = {
  info: (...args) => console.log('[info]', ...args), // eslint-disable-line no-console
  warn: (...args) => console.warn('[warn]', ...args), // eslint-disable-line no-console
  error: (...args) => console.error('[error]', ...args), // eslint-disable-line no-console
};

module.exports = logger;
