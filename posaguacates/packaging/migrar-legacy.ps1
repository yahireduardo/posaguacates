param(
  [Parameter(Mandatory=$true)][string]$BasePath,
  [Parameter(Mandatory=$true)][string]$StagingPath,
  [Parameter(Mandatory=$true)][string]$LegacyPath,
  [switch]$SkipService
)
$ErrorActionPreference='Stop'
$base=[IO.Path]::GetFullPath($BasePath).TrimEnd('\')
$staging=[IO.Path]::GetFullPath($StagingPath).TrimEnd('\')
$legacy=[IO.Path]::GetFullPath($LegacyPath).TrimEnd('\')
if(-not $staging.StartsWith($base+'\')){throw 'El staging no pertenece a la instalación nueva.'}
$legacyBackend=Join-Path $legacy 'pos-backend';$legacyEnv=Join-Path $legacyBackend '.env'
if(-not(Test-Path -LiteralPath $legacyEnv) -or -not(Test-Path -LiteralPath (Join-Path $legacyBackend 'index.js'))){throw 'La instalación heredada no superó la validación.'}
$newBackend=Join-Path $staging 'app\pos-backend';$node=Join-Path $staging 'runtime\node.exe'
if(-not(Test-Path -LiteralPath $node) -or -not(Test-Path -LiteralPath (Join-Path $newBackend 'index.js'))){throw 'El paquete de migración está incompleto.'}
$stamp=Get-Date -Format 'yyyyMMdd-HHmmss';$stateDir=Join-Path $base "update-backups\legacy-$stamp";New-Item -ItemType Directory -Force -Path $stateDir|Out-Null
$envHash=(Get-FileHash -LiteralPath $legacyEnv -Algorithm SHA256).Hash
$backupSigningKey=$null
$legacyEnvText=Get-Content -LiteralPath $legacyEnv -Raw
if($legacyEnvText -match '(?m)^BACKUP_SIGNING_KEY=(.{32,})\s*$'){$backupSigningKey=$matches[1].Trim()}
if(-not $backupSigningKey){
  $keyBytes=New-Object byte[] 48
  $rng=[Security.Cryptography.RandomNumberGenerator]::Create()
  try{$rng.GetBytes($keyBytes)}finally{$rng.Dispose()}
  $backupSigningKey=[Convert]::ToBase64String($keyBytes)
  $backupEnv=Join-Path $stateDir 'legacy-backup.env'
  Copy-Item -LiteralPath $legacyEnv -Destination $backupEnv -Force
  Add-Content -LiteralPath $backupEnv -Value "`r`nBACKUP_SIGNING_KEY=$backupSigningKey" -Encoding UTF8
}else{$backupEnv=$legacyEnv}
$backupPath=$null
try{
  $env:SOURCE_ENV_PATH=$backupEnv;$env:POS_ENV_OVERRIDE='1'
  $salida=& $node (Join-Path $newBackend 'scripts\prepareUpdate.js') $stateDir
  if($LASTEXITCODE-ne 0){throw 'No se pudo crear y verificar el backup previo.'}
  $estado=($salida|Where-Object{$_ -match '^\{.*\}$'}|Select-Object -Last 1)|ConvertFrom-Json
  if(-not $estado.ok -or -not(Test-Path -LiteralPath $estado.backupPath)){throw 'El backup previo no es verificable.'};$backupPath=$estado.backupPath
  if(-not $SkipService -and (Get-Service POSAguacates -ErrorAction SilentlyContinue)){
    & sc.exe stop POSAguacates | Out-Null
    $service=Get-Service POSAguacates -ErrorAction SilentlyContinue
    if($service){$service.WaitForStatus('Stopped',[TimeSpan]::FromSeconds(30))}
    & sc.exe delete POSAguacates | Out-Null
    for($i=1;$i-le 30 -and (Get-Service POSAguacates -ErrorAction SilentlyContinue);$i++){Start-Sleep -Seconds 1}
    if(Get-Service POSAguacates -ErrorAction SilentlyContinue){throw 'No se pudo retirar el registro del servicio POS anterior.'}
  }
  if(-not $SkipService -and (Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue)){throw 'El puerto 3000 sigue ocupado. Cierre la terminal o proceso antiguo del POS y vuelva a ejecutar el instalador.'}
  foreach($folder in @('app','runtime','service','prerequisites')){Copy-Item -LiteralPath (Join-Path $staging $folder) -Destination (Join-Path $base $folder) -Recurse -Force}
  $liveBackend=Join-Path $base 'app\pos-backend';Copy-Item -LiteralPath $legacyEnv -Destination (Join-Path $liveBackend '.env') -Force
  foreach($folder in @('backups','data','logs')){$source=Join-Path $legacyBackend $folder;if(Test-Path $source){Copy-Item -LiteralPath $source -Destination (Join-Path $liveBackend $folder) -Recurse -Force}}
  $legacyLogo=Join-Path $legacy 'pos-frontend\assets\logo-ticket.png';if(Test-Path $legacyLogo){Copy-Item -LiteralPath $legacyLogo -Destination (Join-Path $base 'app\pos-frontend\assets\logo-ticket.png') -Force}
  if((Get-FileHash -LiteralPath (Join-Path $liveBackend '.env') -Algorithm SHA256).Hash-ne$envHash){throw 'El .env cambió durante la migración.'}
  $liveEnv=Join-Path $liveBackend '.env'
  if($backupEnv-ne$legacyEnv){Add-Content -LiteralPath $liveEnv -Value "`r`nBACKUP_SIGNING_KEY=$backupSigningKey" -Encoding UTF8}
  $env:SOURCE_ENV_PATH=$liveEnv
  & (Join-Path $base 'runtime\node.exe') (Join-Path $liveBackend 'scripts\migrate.js');if($LASTEXITCODE-ne 0){throw 'Las migraciones fallaron.'}
  & (Join-Path $base 'runtime\node.exe') (Join-Path $liveBackend 'scripts\checkIntegrity.js');if($LASTEXITCODE-ne 0){throw 'La integridad falló después de migrar.'}
  if(-not $SkipService){
    $serviceExe=Join-Path $base 'service\POSAguacates.exe';& $serviceExe install;if($LASTEXITCODE-ne 0){throw 'No se pudo instalar el servicio POS.'};& $serviceExe start;if($LASTEXITCODE-ne 0){throw 'No se pudo iniciar el servicio POS.'}
    $ok=$false;for($i=1;$i-le 45;$i++){Start-Sleep -Seconds 2;try{if((Invoke-RestMethod 'http://127.0.0.1:3000/health' -TimeoutSec 2).ok){$ok=$true;break}}catch{}}
    if(-not $ok){throw 'El servicio nuevo no respondió en /health.'}
  }
  Set-Content -LiteralPath (Join-Path $base 'VERSION') -Value '1.1.11' -Encoding ASCII
  Write-Host "Migración heredada completada. La carpeta antigua no fue eliminada. Backup: $backupPath"
}finally{Remove-Item Env:SOURCE_ENV_PATH -ErrorAction SilentlyContinue;Remove-Item Env:POS_ENV_OVERRIDE -ErrorAction SilentlyContinue}
