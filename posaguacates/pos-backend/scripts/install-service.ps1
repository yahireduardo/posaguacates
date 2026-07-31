param(
  [string]$NssmPath,
  [string]$MySqlServiceName
)

$ErrorActionPreference = 'Stop'
$serviceName = 'POSAguacates'
$backendPath = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path

$principal = New-Object Security.Principal.WindowsPrincipal(
  [Security.Principal.WindowsIdentity]::GetCurrent()
)
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
  throw 'Ejecute PowerShell como Administrador.'
}
if (-not (Test-Path -LiteralPath (Join-Path $backendPath '.env'))) {
  throw 'Falta pos-backend\.env. Créelo a partir de .env.production.example.'
}
if (Get-Service -Name $serviceName -ErrorAction SilentlyContinue) {
  throw "El servicio $serviceName ya existe. Use npm run service:remove antes de reinstalar."
}
if ($MySqlServiceName -and -not (Get-Service -Name $MySqlServiceName -ErrorAction SilentlyContinue)) {
  throw "No existe el servicio MySQL/MariaDB indicado: $MySqlServiceName"
}

$nodePath = (Get-Command node -ErrorAction Stop).Source
if (-not $NssmPath) {
  $nssmCommand = Get-Command nssm.exe -ErrorAction SilentlyContinue
  if ($nssmCommand) {
    $NssmPath = $nssmCommand.Source
  } else {
    foreach ($candidato in @(
      'C:\Tools\nssm\win64\nssm.exe',
      'C:\Tools\nssm\nssm.exe',
      'C:\Program Files\nssm\win64\nssm.exe'
    )) {
      if (Test-Path -LiteralPath $candidato) { $NssmPath = $candidato; break }
    }
  }
}
if (-not $NssmPath -or -not (Test-Path -LiteralPath $NssmPath)) {
  throw 'No se encontró nssm.exe. Use -NssmPath C:\ruta\nssm.exe.'
}

$logsPath = Join-Path $backendPath 'logs'
New-Item -ItemType Directory -Force -Path $logsPath | Out-Null
$indexPath = Join-Path $backendPath 'index.js'

& $NssmPath install $serviceName $nodePath $indexPath
if ($LASTEXITCODE -ne 0) { throw 'NSSM no pudo crear el servicio.' }
& $NssmPath set $serviceName DisplayName 'POS Aguacates'
& $NssmPath set $serviceName Description 'Backend y frontend del sistema POS Aguacates'
& $NssmPath set $serviceName AppDirectory $backendPath
& $NssmPath set $serviceName Start SERVICE_AUTO_START
& $NssmPath set $serviceName AppStdout (Join-Path $logsPath 'servicio.log')
& $NssmPath set $serviceName AppStderr (Join-Path $logsPath 'errores.log')
& $NssmPath set $serviceName AppRotateFiles 1
& $NssmPath set $serviceName AppRotateOnline 1
& $NssmPath set $serviceName AppRotateBytes 10485760
& $NssmPath set $serviceName AppRestartDelay 5000
& $NssmPath set $serviceName AppThrottle 1500
& $NssmPath set $serviceName AppExit Default Restart
& $NssmPath set $serviceName AppNoConsole 1

if ($MySqlServiceName) {
  & $NssmPath set $serviceName DependOnService $MySqlServiceName
}

& $NssmPath start $serviceName
if ($LASTEXITCODE -ne 0) { throw 'El servicio fue creado, pero no pudo iniciarse. Revise logs\errores.log.' }

$saludable = $false
for ($intento = 1; $intento -le 30; $intento += 1) {
  Start-Sleep -Seconds 2
  try {
    $salud = Invoke-RestMethod -Uri 'http://127.0.0.1:3000/health' -TimeoutSec 2
    if ($salud.ok) { $saludable = $true; break }
  } catch {
    Write-Host "Esperando al servicio ($intento/30)..."
  }
}
if (-not $saludable) {
  throw 'El servicio se instaló, pero /health no respondió correctamente. Revise los logs.'
}
Write-Host 'Servicio POSAguacates instalado, configurado para inicio automático y saludable.'
