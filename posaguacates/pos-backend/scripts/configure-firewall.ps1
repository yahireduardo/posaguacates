param([int]$Port = 3000)

$ErrorActionPreference = 'Stop'
$principal = New-Object Security.Principal.WindowsPrincipal(
  [Security.Principal.WindowsIdentity]::GetCurrent()
)
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
  throw 'Ejecute PowerShell como Administrador.'
}
$nombre = "POS Aguacates TCP $Port"
$existente = Get-NetFirewallRule -DisplayName $nombre -ErrorAction SilentlyContinue
if ($existente) {
  Write-Host "La regla ya existe: $nombre"
  exit 0
}
New-NetFirewallRule -DisplayName $nombre -Direction Inbound -Action Allow `
  -Protocol TCP -LocalPort $Port -Profile Private | Out-Null
Write-Host "Firewall configurado para TCP $Port únicamente en redes privadas."
