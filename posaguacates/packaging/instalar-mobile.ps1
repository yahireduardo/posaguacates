$ErrorActionPreference='Stop'
$principal=New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
if(-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)){throw 'Ejecute el instalador como Administrador.'}
$base=Split-Path -Parent $MyInvocation.MyCommand.Path
& (Join-Path $base 'runtime\node.exe') (Join-Path $base 'app\pos-backend\scripts\configurarEmpresa.js');if($LASTEXITCODE -ne 0){throw 'La configuración inicial no terminó correctamente.'}
& (Join-Path $base 'service\POSAguacates.exe') install;& (Join-Path $base 'service\POSAguacates.exe') start
if(-not(Get-NetFirewallRule -DisplayName 'POS Aguacates iPhone Preview - Red local' -ErrorAction SilentlyContinue)){New-NetFirewallRule -DisplayName 'POS Aguacates iPhone Preview - Red local' -Direction Inbound -Protocol TCP -LocalPort 3001 -Action Allow -Profile Private|Out-Null}
$saludable=$false;for($i=1;$i-le 30;$i++){Start-Sleep 2;try{$h=Invoke-RestMethod 'http://127.0.0.1:3001/health' -TimeoutSec 2;if($h.ok){$saludable=$true;break}}catch{}};if(-not $saludable){throw 'El servicio no respondió en /health.'}
$ips=Get-NetIPAddress -AddressFamily IPv4|Where-Object{$_.IPAddress -match '^(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)'}|Select-Object -ExpandProperty IPAddress
$edge=Join-Path ${env:ProgramFiles(x86)} 'Microsoft\Edge\Application\msedge.exe';$chrome=Join-Path $env:ProgramFiles 'Google\Chrome\Application\chrome.exe';$browser=if(Test-Path $edge){$edge}elseif(Test-Path $chrome){$chrome}else{throw 'No se encontró Edge ni Chrome.'};$shell=New-Object -ComObject WScript.Shell;$s=$shell.CreateShortcut((Join-Path ([Environment]::GetFolderPath('Desktop')) 'POS Aguacates iPhone Preview.lnk'));$s.TargetPath=$browser;$s.Arguments='--app=http://127.0.0.1:3001';$s.Save()
Write-Host 'Instalación terminada. En el iPhone, conectado al mismo Wi-Fi, abra:'; $ips|ForEach-Object{Write-Host "http://$($_):3001"}
