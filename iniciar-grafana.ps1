$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
$grafanaEndpoint = Read-Host 'Pega el valor de OTEL_EXPORTER_OTLP_ENDPOINT (solo la URL)'
$grafanaEndpoint = $grafanaEndpoint.Trim().Trim('"').Trim("'")
if ($grafanaEndpoint -notmatch '^https://[^/]+\.grafana\.net/otlp/?$') {
  throw 'La URL no tiene el formato esperado. Copia solo la URL del endpoint de Grafana.'
}
$grafanaSecret = Read-Host 'Pega el valor COMPLETO de OTEL_EXPORTER_OTLP_HEADERS (Authorization=Basic ...)' -AsSecureString
$grafanaPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($grafanaSecret)
try {
  $grafanaHeader = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($grafanaPointer).Trim().Trim('"').Trim("'")
  $grafanaHeader = $grafanaHeader -replace 'Basic%20', 'Basic '
  if ($grafanaHeader -notmatch '^Authorization=Basic\s+([A-Za-z0-9+/]+=*)$') {
    throw 'Copia solo el valor de HEADERS: Authorization=Basic seguido de la cadena generada. No pegues export ni el nombre de la variable.'
  }
  $grafanaDecoded = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($Matches[1]))
  if ($grafanaDecoded -notmatch '^\d+:.{20,}$' -or $grafanaDecoded -match '<|your-grafana-token') {
    throw 'La credencial no contiene un token generado. Vuelve a Instrumentation y copia HEADERS despues de crear el token.'
  }
  $grafanaDecoded = $null
  $env:OTEL_ENABLED = 'true'
  $env:CHAT_TEST_ENABLED = 'true'
  $env:OTEL_SERVICE_NAME = 'una-chat-lab7'
  $env:OTEL_EXPORTER_OTLP_ENDPOINT = $grafanaEndpoint
  $env:OTEL_EXPORTER_OTLP_PROTOCOL = 'http/protobuf'
  $env:OTEL_EXPORTER_OTLP_HEADERS = $grafanaHeader
  $env:PORT = '3001'
  node server.js
} finally {
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($grafanaPointer)
  $grafanaHeader = $null
  $grafanaDecoded = $null
  Remove-Item Env:OTEL_ENABLED, Env:CHAT_TEST_ENABLED, Env:OTEL_SERVICE_NAME, Env:OTEL_EXPORTER_OTLP_ENDPOINT, Env:OTEL_EXPORTER_OTLP_PROTOCOL, Env:OTEL_EXPORTER_OTLP_HEADERS -ErrorAction SilentlyContinue
}
