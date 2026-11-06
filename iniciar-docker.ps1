$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
docker build -t una-chat-lab7:local .
if ($LASTEXITCODE -ne 0) { throw 'No se pudo construir la imagen.' }
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
  $env:PORT = '3000'
  $testStart = (Get-Date).ToUniversalTime().ToString('o')
  Write-Host "Inicio Docker UTC: $testStart"
  Write-Host 'Chat Docker: http://localhost:3002'
  docker run --rm --init --name una-chat-lab7-docker -p 127.0.0.1:3002:3000 --env PORT --env OTEL_ENABLED --env CHAT_TEST_ENABLED --env OTEL_SERVICE_NAME --env OTEL_EXPORTER_OTLP_ENDPOINT --env OTEL_EXPORTER_OTLP_PROTOCOL --env OTEL_EXPORTER_OTLP_HEADERS una-chat-lab7:local
  if ($LASTEXITCODE -ne 0) { throw 'Docker finalizo con error. Revisa el mensaje anterior.' }
} finally {
  Write-Host ('Fin Docker UTC: ' + (Get-Date).ToUniversalTime().ToString('o'))
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($grafanaPointer)
  $grafanaHeader = $null
  $grafanaDecoded = $null
  Remove-Item Env:OTEL_ENABLED, Env:CHAT_TEST_ENABLED, Env:OTEL_SERVICE_NAME, Env:OTEL_EXPORTER_OTLP_ENDPOINT, Env:OTEL_EXPORTER_OTLP_PROTOCOL, Env:OTEL_EXPORTER_OTLP_HEADERS -ErrorAction SilentlyContinue
}
