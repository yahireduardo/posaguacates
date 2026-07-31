param(
  [string]$LocalDestino
)

$ErrorActionPreference = 'Stop'
if (-not $LocalDestino) { $LocalDestino = Join-Path $PSScriptRoot '..\..\backups' }
$carpetaLogs = Join-Path $LocalDestino 'logs'
New-Item -ItemType Directory -Path $carpetaLogs -Force | Out-Null
$log = Join-Path $carpetaLogs ("backup_" + (Get-Date -Format 'yyyy-MM') + '.log')
Start-Transcript -Path $log -Append | Out-Null
try {
& (Join-Path $PSScriptRoot 'backup-db.ps1') -LocalDestino $LocalDestino

$archivos = Get-ChildItem -LiteralPath $LocalDestino -Filter '*.sql' |
  Sort-Object LastWriteTime -Descending
$archivos | Select-Object -Skip 30 | ForEach-Object {
  $hash = [IO.Path]::ChangeExtension($_.FullName, '.sha256')
  Remove-Item -LiteralPath $_.FullName -Force
  Remove-Item -LiteralPath $hash -Force -ErrorAction SilentlyContinue
}

$semanales = Join-Path $LocalDestino 'semanales'
New-Item -ItemType Directory -Path $semanales -Force | Out-Null
if ((Get-Date).DayOfWeek -eq 'Sunday') {
  $nuevo = $archivos | Select-Object -First 1
  if ($nuevo) {
    Copy-Item -LiteralPath $nuevo.FullName -Destination $semanales -Force
    $hash = [IO.Path]::ChangeExtension($nuevo.FullName, '.sha256')
    if (Test-Path -LiteralPath $hash) { Copy-Item -LiteralPath $hash -Destination $semanales -Force }
  }
}
Get-ChildItem -LiteralPath $semanales -Filter '*.sql' |
  Sort-Object LastWriteTime -Descending |
  Select-Object -Skip 12 |
  ForEach-Object {
    Remove-Item -LiteralPath $_.FullName -Force
    Remove-Item -LiteralPath ([IO.Path]::ChangeExtension($_.FullName, '.sha256')) -Force -ErrorAction SilentlyContinue
  }
} finally {
  Stop-Transcript | Out-Null
}
