const LOG_LEVELS = { debug: 0, info: 1, warn: 2, error: 3 }

const currentLevel = import.meta.env.PROD ? LOG_LEVELS.warn : LOG_LEVELS.debug

function log(level, module, message, data) {
  if (LOG_LEVELS[level] < currentLevel) return

  const entry = {
    timestamp: new Date().toISOString(),
    level,
    module,
    message,
    ...(data && { data }),
  }

  const method = level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log'
  console[method](`[${entry.level.toUpperCase()}] [${module}]`, message, data || '')
}

export const logger = {
  debug: (module, msg, data) => log('debug', module, msg, data),
  info: (module, msg, data) => log('info', module, msg, data),
  warn: (module, msg, data) => log('warn', module, msg, data),
  error: (module, msg, data) => log('error', module, msg, data),
}
