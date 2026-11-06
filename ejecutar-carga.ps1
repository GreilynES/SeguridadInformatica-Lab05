$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
$env:LAB_TEST_ID = 'carga-' + (Get-Date).ToUniversalTime().ToString('yyyyMMdd-HHmmss')
$reportFolder = Join-Path $PSScriptRoot ('evidencias/' + $env:LAB_TEST_ID)
New-Item -ItemType Directory -Force -Path $reportFolder | Out-Null
$startedUtc = (Get-Date).ToUniversalTime().ToString('o')
$startedLocal = (Get-Date).ToString('o')
Write-Host ('Prueba: ' + $env:LAB_TEST_ID)
Write-Host ('Inicio UTC: ' + $startedUtc)
Write-Host ('Inicio local: ' + $startedLocal)
Write-Host 'Destino: http://localhost:3002/api/messages'
$reportPath = Join-Path $reportFolder 'reporte.json'
$consolePath = Join-Path $reportFolder 'consola.txt'
$runExitCode = 1
try {
  & npx.cmd artillery run --output $reportPath artillery-local.yml 2>&1 | Tee-Object -FilePath $consolePath
  $runExitCode = $LASTEXITCODE
} finally {
  $finishedUtc = (Get-Date).ToUniversalTime().ToString('o')
  $finishedLocal = (Get-Date).ToString('o')
  [ordered]@{
    test_run_id = $env:LAB_TEST_ID
    target = 'http://localhost:3002/api/messages'
    start_utc = $startedUtc
    end_utc = $finishedUtc
    start_local = $startedLocal
    end_local = $finishedLocal
    expected_requests = 300
    arrival_rate = 5
    duration_seconds = 60
    command = 'npx artillery run --output <carpeta-de-prueba>/reporte.json artillery-local.yml'
    exit_code = $runExitCode
  } | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $reportFolder 'horarios.json') -Encoding UTF8
  Write-Host ('Fin UTC: ' + $finishedUtc)
  Write-Host ('Resultados en: ' + $reportFolder)
  Remove-Item Env:LAB_TEST_ID -ErrorAction SilentlyContinue
}
if ($runExitCode -ne 0) { throw 'Artillery finalizo con error; revisa consola.txt y reporte.json.' }
