'use strict';
// Grafana se activa solo al iniciar expresamente la ejecucion local.
if (process.env.OTEL_ENABLED === 'true') {
  require('./telemetry');
} else {
  require('@sentry/node').init({
    dsn: process.env.SENTRY_DSN,
    enabled: Boolean(process.env.SENTRY_DSN),
    environment: process.env.SENTRY_ENVIRONMENT || 'local',
    sendDefaultPii: false,
  });
}
