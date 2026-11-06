$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
$grafanaSecret = Read-Host 'Pega el token de Grafana (queda oculto)' -AsSecureString
$grafanaPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($grafanaSecret)
try {
  $grafanaToken = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($grafanaPointer)
  $grafanaAuth = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes('1907068:' + $grafanaToken))
  $env:OTEL_ENABLED = 'true'
  $env:CHAT_TEST_ENABLED = 'true'
  $env:OTEL_SERVICE_NAME = 'una-chat-lab7'
  $env:OTEL_EXPORTER_OTLP_ENDPOINT = 'https://otlp-gateway-prod-us-east-3.grafana.net/otlp'
  $env:OTEL_EXPORTER_OTLP_PROTOCOL = 'http/protobuf'
  $env:OTEL_EXPORTER_OTLP_HEADERS = 'Authorization=Basic ' + $grafanaAuth
  node server.js
} finally {
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($grafanaPointer)
  $grafanaToken = $null
  $grafanaAuth = $null
  Remove-Item Env:OTEL_ENABLED, Env:CHAT_TEST_ENABLED, Env:OTEL_SERVICE_NAME, Env:OTEL_EXPORTER_OTLP_ENDPOINT, Env:OTEL_EXPORTER_OTLP_PROTOCOL, Env:OTEL_EXPORTER_OTLP_HEADERS -ErrorAction SilentlyContinue
}
