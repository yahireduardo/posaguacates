$ErrorActionPreference='Stop'
$principal=New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
if(-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)){throw 'Ejecute el instalador como Administrador.'}
$base=Split-Path -Parent $MyInvocation.MyCommand.Path
& (Join-Path $base 'runtime\node.exe') (Join-Path $base 'app\pos-backend\scripts\configurarEmpresa.js')
if($LASTEXITCODE -ne 0){throw 'La configuración inicial no terminó correctamente.'}
& (Join-Path $base 'service\POSAguacates.exe') install
& (Join-Path $base 'service\POSAguacates.exe') start
$saludable=$false;for($i=1;$i-le 30;$i++){Start-Sleep -Seconds 2;try{$health=Invoke-RestMethod 'http://127.0.0.1:3000/health' -TimeoutSec 2;if($health.ok){$saludable=$true;break}}catch{}}
if(-not $saludable){throw 'El servicio se instaló, pero no respondió en /health. Revise la carpeta logs.'}
$edge=Join-Path ${env:ProgramFiles(x86)} 'Microsoft\Edge\Application\msedge.exe';$chrome=Join-Path $env:ProgramFiles 'Google\Chrome\Application\chrome.exe';$browser=if(Test-Path $edge){$edge}elseif(Test-Path $chrome){$chrome}else{throw 'No se encontró Microsoft Edge ni Google Chrome.'}
$shell=New-Object -ComObject WScript.Shell;$shortcut=$shell.CreateShortcut((Join-Path ([Environment]::GetFolderPath('Desktop')) 'POS Aguacates.lnk'));$shortcut.TargetPath=$browser;$shortcut.Arguments='--app=http://127.0.0.1:3000';$shortcut.WorkingDirectory=$base;$shortcut.Save()
Write-Host 'POS Aguacates instalado. Use el acceso directo del escritorio.'
