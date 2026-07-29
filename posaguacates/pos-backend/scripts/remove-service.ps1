$ErrorActionPreference = 'Stop'
$nssm = Get-Command nssm -ErrorAction SilentlyContinue
if (-not $nssm) {
  throw 'NSSM no está instalado o no está en PATH.'
}
& $nssm.Source stop POSAguacates
& $nssm.Source remove POSAguacates confirm
Write-Host 'Servicio POSAguacates eliminado.'
