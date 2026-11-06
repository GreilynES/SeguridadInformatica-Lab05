'use strict';
const enabled = process.env.OTEL_ENABLED === 'true';
let sdk;
let api;
let logger;
let tracer;
let requests;
let errors;
let duration;
if (enabled) {
  if (!process.env.OTEL_EXPORTER_OTLP_ENDPOINT || !process.env.OTEL_EXPORTER_OTLP_HEADERS) {
    throw new Error('Falta la configuracion OTLP. Usa iniciar-local.ps1');
  }
  api = require('@opentelemetry/api');
  api.diag.setLogger(new api.DiagConsoleLogger(), api.DiagLogLevel.WARN);
  const { NodeSDK } = require('@opentelemetry/sdk-node');
  const { resourceFromAttributes } = require('@opentelemetry/resources');
  const { PeriodicExportingMetricReader } = require('@opentelemetry/sdk-metrics');
  const { BatchLogRecordProcessor } = require('@opentelemetry/sdk-logs');
  const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-proto');
  const { OTLPMetricExporter } = require('@opentelemetry/exporter-metrics-otlp-proto');
  const { OTLPLogExporter } = require('@opentelemetry/exporter-logs-otlp-proto');
  sdk = new NodeSDK({
    autoDetectResources: false,
    resource: resourceFromAttributes({
      'service.name': 'una-chat-lab7',
      'deployment.environment.name': 'local',
      'deployment.environment': 'local',
    }),
    traceExporter: new OTLPTraceExporter(),
    metricReaders: [new PeriodicExportingMetricReader({
      exporter: new OTLPMetricExporter(), exportIntervalMillis: 5000,
    })],
    logRecordProcessors: [new BatchLogRecordProcessor({
      exporter: new OTLPLogExporter(), scheduledDelayMillis: 1000,
    })],
  });
  sdk.start();
  tracer = api.trace.getTracer('una-chat');
  logger = require('@opentelemetry/api-logs').logs.getLogger('una-chat');
  const meter = api.metrics.getMeter('una-chat');
  requests = meter.createCounter('chat_requests', { description: 'Mensajes procesados' });
  errors = meter.createCounter('chat_errors', { description: 'Mensajes fallidos' });
  duration = meter.createHistogram('chat_duration', {
    unit: 's', description: 'Duracion del procesamiento de mensajes',
  });
  console.log('Telemetria local activa: servicio una-chat-lab7');
  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.once(signal, () => sdk.shutdown().finally(() => process.exit(0)));
  }
}

function processMessage(raw, validate, options = {}) {
  if (!enabled) return validate(raw);
  return tracer.startActiveSpan('chat.process_message', span => {
    const started = performance.now();
    let result;
    let failure;
    try {
      let message;
      try { message = JSON.parse(raw).mensaje; } catch { /* El validador maneja formato invalido. */ }
      if (process.env.CHAT_TEST_ENABLED === 'true' && message === 'LAB7_ERROR') {
        throw new Error('LAB7 - Fallo controlado local');
      }
      result = tracer.startActiveSpan('chat.validate', child => {
        try { return validate(raw); } finally { child.end(); }
      });
      if (!result.ok) failure = new Error(result.error);
    } catch (error) {
      failure = error;
      result = { ok: false, error: 'Fallo controlado local' };
    } finally {
      const seconds = (performance.now() - started) / 1000;
      const attributes = { result: failure ? 'error' : 'ok', transport: options.transport || 'socket.io', test_run_id: options.test_run_id || 'functional' };
      requests.add(1, attributes);
      errors.add(failure ? 1 : 0, attributes);
      duration.record(seconds, attributes);
      span.setAttributes(attributes);
      if (failure) {
        span.recordException(failure);
        span.setStatus({ code: api.SpanStatusCode.ERROR, message: failure.message });
      } else span.setStatus({ code: api.SpanStatusCode.OK });
      const traceId = span.spanContext().traceId;
      logger.emit({
        severityNumber: failure ? 17 : 9,
        severityText: failure ? 'ERROR' : 'INFO',
        body: failure ? failure.message : 'Mensaje del chat procesado',
        attributes: { ...attributes, trace_id: traceId, duration_s: seconds },
      });
      console.log(JSON.stringify({ event: 'chat.message', ...attributes, trace_id: traceId }));
      span.end();
    }
    return result;
  });
}
module.exports = { processMessage };
