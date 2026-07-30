param(
  [string]$Url = 'http://localhost:3000',
  [ValidateSet('Auto','Edge','Chrome')]
  [string]$Navegador = 'Auto'
)

$ErrorActionPreference = 'Stop'
$edge = @(
  'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe',
  'C:\Program Files\Microsoft\Edge\Application\msedge.exe'
) | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
$chrome = @(
  'C:\Program Files\Google\Chrome\Application\chrome.exe',
  'C:\Program Files (x86)\Google\Chrome\Application\chrome.exe'
) | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1

$ejecutable = if ($Navegador -eq 'Edge') { $edge } elseif ($Navegador -eq 'Chrome') { $chrome } else {
  if ($edge) { $edge } else { $chrome }
}
if (-not $ejecutable) { throw 'No se encontró Microsoft Edge ni Google Chrome.' }

$escritorio = [Environment]::GetFolderPath('CommonDesktopDirectory')
if (-not (Test-Path -LiteralPath $escritorio)) {
  $escritorio = [Environment]::GetFolderPath('Desktop')
}
$rutaAcceso = Join-Path $escritorio 'POS Aguacates.lnk'
$shell = New-Object -ComObject WScript.Shell
$acceso = $shell.CreateShortcut($rutaAcceso)
$acceso.TargetPath = $ejecutable
$acceso.Arguments = "--app=$Url --start-maximized"
$acceso.WorkingDirectory = Split-Path -Parent $ejecutable
$acceso.IconLocation = "$ejecutable,0"
$acceso.Description = 'Abrir POS Aguacates'
$acceso.Save()
Write-Host "Acceso directo creado: $rutaAcceso"
