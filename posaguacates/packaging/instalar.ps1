param([Parameter(Mandatory=$true)][string]$ConfigPath)
$ErrorActionPreference='Stop'
$principal=New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
if(-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)){throw 'Ejecute el instalador como Administrador.'}
$base=Split-Path -Parent $MyInvocation.MyCommand.Path
$logDir=Join-Path $base 'logs'
New-Item -ItemType Directory -Force -Path $logDir|Out-Null
Start-Transcript -Path (Join-Path $logDir 'instalacion.log') -Append|Out-Null
try {
  if(-not(Test-Path -LiteralPath $ConfigPath)){throw 'No se recibieron los datos del asistente.'}
  $cfg=@{}
  Get-Content -LiteralPath $ConfigPath|ForEach-Object{$parts=$_ -split '=',2;if($parts.Count-eq 2){$cfg[$parts[0]]=$parts[1]}}
  foreach($key in @('DB_ROOT_PASSWORD','DB_NAME','APP_USER','ADMIN_NAME','ADMIN_USER','ADMIN_PASSWORD')){
    if([string]::IsNullOrWhiteSpace($cfg[$key])){throw "Falta el campo $key"}
  }
  $randomBytes=New-Object byte[] 48
  $rng=[Security.Cryptography.RandomNumberGenerator]::Create()
  try{$rng.GetBytes($randomBytes)}finally{$rng.Dispose()}
  $appPassword=([Convert]::ToBase64String($randomBytes) -replace '[^A-Za-z0-9]','').Substring(0,40)

  if(-not(Get-Service -Name MariaDB -ErrorAction SilentlyContinue)){
    $msi=Join-Path $base 'prerequisites\mariadb-12.3.2-winx64.msi'
    $arguments=@('/i',"`"$msi`"",'/qn','SERVICENAME=MariaDB','PORT=3306',"PASSWORD=$($cfg.DB_ROOT_PASSWORD)")
    $process=Start-Process msiexec.exe -ArgumentList $arguments -Wait -PassThru
    if($process.ExitCode -notin @(0,3010)){throw "MariaDB no pudo instalarse (codigo $($process.ExitCode))."}
  }
  $maria=Get-Service -Name MariaDB -ErrorAction Stop
  if($maria.Status-ne'Running'){Start-Service MariaDB}

  $env:POS_INSTALL_NONINTERACTIVE='1';$env:POS_DB_HOST='127.0.0.1';$env:POS_DB_PORT='3306';$env:POS_DB_ADMIN='root'
  $env:POS_DB_ADMIN_PASSWORD=$cfg.DB_ROOT_PASSWORD;$env:POS_DB_NAME=$cfg.DB_NAME;$env:POS_DB_APP_USER=$cfg.APP_USER;$env:POS_DB_APP_PASSWORD=$appPassword
  $env:POS_ADMIN_NAME=$cfg.ADMIN_NAME;$env:POS_ADMIN_USER=$cfg.ADMIN_USER;$env:POS_ADMIN_PASSWORD=$cfg.ADMIN_PASSWORD
  & (Join-Path $base 'runtime\node.exe') (Join-Path $base 'app\pos-backend\scripts\configurarEmpresa.js')
  if($LASTEXITCODE-ne 0){throw 'La configuracion inicial fallo. Revise logs\instalacion.log.'}

  $serviceExe=Join-Path $base 'service\POSAguacates.exe'
  if(Get-Service POSAguacates -ErrorAction SilentlyContinue){& $serviceExe stop; & $serviceExe uninstall}
  & $serviceExe install
  if($LASTEXITCODE-ne 0){throw 'No se pudo instalar el servicio POSAguacates.'}
  & $serviceExe start
  $saludable=$false
  for($i=1;$i-le 45;$i++){Start-Sleep -Seconds 2;try{$health=Invoke-RestMethod 'http://127.0.0.1:3000/health' -TimeoutSec 2;if($health.ok){$saludable=$true;break}}catch{}}
  if(-not $saludable){throw 'El servicio no respondio en /health. Revise la carpeta logs.'}

  $desktop=[Environment]::GetFolderPath('CommonDesktopDirectory')
  Set-Content -LiteralPath (Join-Path $desktop 'POS Aguacates.url') -Encoding ASCII -Value "[InternetShortcut]`r`nURL=http://127.0.0.1:3000`r`n"
} finally {
  Remove-Item -LiteralPath $ConfigPath -Force -ErrorAction SilentlyContinue
  @('POS_DB_ADMIN_PASSWORD','POS_DB_APP_PASSWORD','POS_ADMIN_PASSWORD')|ForEach-Object{Remove-Item "Env:$_" -ErrorAction SilentlyContinue}
  Stop-Transcript -ErrorAction SilentlyContinue|Out-Null
}
