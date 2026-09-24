param(
  [Parameter(Mandatory=$true)][string]$BasePath,
  [Parameter(Mandatory=$true)][string]$StagingPath,
  [switch]$SkipService,
  [switch]$ForceFailureAfterMigration
)
$ErrorActionPreference='Stop'
$base=[IO.Path]::GetFullPath($BasePath).TrimEnd('\')
$staging=[IO.Path]::GetFullPath($StagingPath).TrimEnd('\')
if(-not $staging.StartsWith($base+'\')){throw 'El staging debe estar dentro de la instalación.'}
$liveApp=Join-Path $base 'app';$liveBackend=Join-Path $liveApp 'pos-backend';$envPath=Join-Path $liveBackend '.env'
if(-not(Test-Path -LiteralPath $envPath)){throw 'No se detectó una instalación existente: falta app\pos-backend\.env.'}
$newApp=Join-Path $staging 'app';$newBackend=Join-Path $newApp 'pos-backend'
if(-not(Test-Path -LiteralPath (Join-Path $newBackend 'index.js'))){throw 'El staging de actualización está incompleto.'}
$stamp=Get-Date -Format 'yyyyMMdd-HHmmss';$stateDir=Join-Path $base "update-backups\$stamp";$rollbackApp=Join-Path $stateDir 'app-anterior'
New-Item -ItemType Directory -Force -Path $stateDir|Out-Null
$envCopy=Join-Path $stateDir '.env';Copy-Item -LiteralPath $envPath -Destination $envCopy
$envHash=(Get-FileHash -LiteralPath $envCopy -Algorithm SHA256).Hash
$node=Join-Path $base 'runtime\node.exe';if(-not(Test-Path -LiteralPath $node)){$node=(Get-Command node.exe -ErrorAction Stop).Source}
$serviceExe=Join-Path $base 'service\POSAguacates.exe';$backupPath=$null;$promovida=$false;$migracionIntentada=$false
try {
  $env:SOURCE_ENV_PATH=$envPath;$env:POS_ENV_OVERRIDE='1'
  $salida=& $node (Join-Path $newBackend 'scripts\prepareUpdate.js') $stateDir
  if($LASTEXITCODE-ne 0){throw 'El backup previo o su verificación fallaron. Actualización abortada sin modificar la aplicación.'}
  $estado=($salida|Where-Object{$_ -match '^\{.*\}$'}|Select-Object -Last 1)|ConvertFrom-Json
  if(-not $estado.ok -or -not(Test-Path -LiteralPath $estado.backupPath)){throw 'No se obtuvo un respaldo previo verificable.'}
  $backupPath=$estado.backupPath

  if(-not $SkipService -and (Get-Service POSAguacates -ErrorAction SilentlyContinue)){
    & $serviceExe stop;if($LASTEXITCODE-ne 0){throw 'No fue posible detener el servicio POS.'}
    & $serviceExe uninstall
  }
  # Copiar evita que archivos nativos en uso/ACL especiales impidan renombrar
  # toda la aplicación. La copia anterior completa permite volver atrás.
  Copy-Item -LiteralPath $liveApp -Destination $rollbackApp -Recurse
  Copy-Item -Path (Join-Path $newApp '*') -Destination $liveApp -Recurse -Force
  $promovida=$true
  Copy-Item -LiteralPath $envCopy -Destination (Join-Path $liveBackend '.env') -Force
  # Staging no contiene backups/data/logs; al superponer código esas carpetas
  # persistentes permanecen físicamente intactas.
  $logoAnterior=Join-Path $rollbackApp 'pos-frontend\assets\logo-ticket.png'
  if(Test-Path -LiteralPath $logoAnterior){[IO.File]::Copy($logoAnterior,(Join-Path $liveApp 'pos-frontend\assets\logo-ticket.png'),$true)}
  if((Get-FileHash -LiteralPath (Join-Path $liveBackend '.env') -Algorithm SHA256).Hash-ne$envHash){throw 'La configuración crítica cambió durante la promoción.'}
  $env:SOURCE_ENV_PATH=Join-Path $liveBackend '.env';$migracionIntentada=$true
  & $node (Join-Path $liveBackend 'scripts\migrate.js');if($LASTEXITCODE-ne 0){throw 'Las migraciones fallaron.'}
  & $node (Join-Path $liveBackend 'scripts\checkIntegrity.js');if($LASTEXITCODE-ne 0){throw 'Las invariantes fallaron después de migrar.'}
  if($ForceFailureAfterMigration){throw 'Fallo inducido de auditoría después de migrar.'}
  if(-not $SkipService){
    $newService=Join-Path $staging 'service';if(Test-Path -LiteralPath $newService){Copy-Item -LiteralPath (Join-Path $newService '*') -Destination (Join-Path $base 'service') -Recurse -Force}
    & $serviceExe install;if($LASTEXITCODE-ne 0){throw 'No fue posible instalar el servicio actualizado.'}
    & $serviceExe start;if($LASTEXITCODE-ne 0){throw 'No fue posible iniciar el servicio actualizado.'}
    $ok=$false;for($i=1;$i-le 45;$i++){Start-Sleep -Seconds 2;try{if((Invoke-RestMethod 'http://127.0.0.1:3000/health' -TimeoutSec 2).ok){$ok=$true;break}}catch{}}
    if(-not $ok){throw 'La versión nueva no superó /health.'}
  }
  Set-Content -LiteralPath (Join-Path $base 'VERSION') -Value '1.1.11' -Encoding ASCII
  Write-Host "Actualización comprobada. Respaldo previo: $backupPath"
} catch {
  $fallo=$_
  if($migracionIntentada -and $backupPath){
    $env:SOURCE_ENV_PATH=if($promovida){Join-Path $liveBackend '.env'}else{$envPath}
    & $node (Join-Path $(if($promovida){$liveBackend}else{$newBackend}) 'scripts\restoreUpdateBackup.js') $backupPath
  }
  if($promovida){
    try{Copy-Item -Path (Join-Path $rollbackApp '*') -Destination $liveApp -Recurse -Force -ErrorAction Stop}catch{Write-Warning "Rollback de archivos incompleto: $($_.Exception.Message)"}
  }
  if(-not $SkipService -and (Test-Path -LiteralPath $serviceExe)){& $serviceExe install; & $serviceExe start}
  throw "Actualización revertida: $($fallo.Exception.Message)"
} finally {Remove-Item Env:SOURCE_ENV_PATH -ErrorAction SilentlyContinue;Remove-Item Env:POS_ENV_OVERRIDE -ErrorAction SilentlyContinue}
