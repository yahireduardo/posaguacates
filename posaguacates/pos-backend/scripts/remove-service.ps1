param([string]$NssmPath)

$ErrorActionPreference = 'Stop'
$principal = New-Object Security.Principal.WindowsPrincipal(
  [Security.Principal.WindowsIdentity]::GetCurrent()
)
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
  throw 'Ejecute PowerShell como Administrador.'
}
if (-not (Get-Service -Name 'POSAguacates' -ErrorAction SilentlyContinue)) {
  Write-Host 'El servicio POSAguacates no está instalado.'
  exit 0
}
if (-not $NssmPath) {
  $comando = Get-Command nssm.exe -ErrorAction SilentlyContinue
  if ($comando) { $NssmPath = $comando.Source }
  foreach ($candidato in @('C:\Tools\nssm\win64\nssm.exe','C:\Tools\nssm\nssm.exe')) {
    if (-not $NssmPath -and (Test-Path -LiteralPath $candidato)) { $NssmPath = $candidato }
  }
}
if (-not $NssmPath -or -not (Test-Path -LiteralPath $NssmPath)) {
  throw 'No se encontró nssm.exe. Use -NssmPath C:\ruta\nssm.exe.'
}
& $NssmPath stop POSAguacates
& $NssmPath remove POSAguacates confirm
if (Get-Service -Name 'POSAguacates' -ErrorAction SilentlyContinue) {
  throw 'Windows todavía reporta el servicio. Reinicie y vuelva a comprobar.'
}
Write-Host 'Servicio POSAguacates eliminado.'
