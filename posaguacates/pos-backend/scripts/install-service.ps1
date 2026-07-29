$ErrorActionPreference = 'Stop'
$serviceName = 'POSAguacates'
$backendPath = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$nodePath = (Get-Command node).Source
$nssm = Get-Command nssm -ErrorAction SilentlyContinue

if (-not $nssm) {
  throw 'NSSM no está instalado o no está en PATH. Consulta docs/INSTALACION_EMPRESA.md.'
}

& $nssm.Source install $serviceName $nodePath (Join-Path $backendPath 'index.js')
& $nssm.Source set $serviceName AppDirectory $backendPath
& $nssm.Source set $serviceName Start SERVICE_AUTO_START
& $nssm.Source set $serviceName AppStdout (Join-Path $backendPath 'logs\servicio.log')
& $nssm.Source set $serviceName AppStderr (Join-Path $backendPath 'logs\errores.log')
New-Item -ItemType Directory -Force -Path (Join-Path $backendPath 'logs') | Out-Null
& $nssm.Source start $serviceName
Write-Host 'Servicio POSAguacates instalado e iniciado.'
