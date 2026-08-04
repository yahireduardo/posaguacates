param([string]$WinSWPath = (Join-Path $PSScriptRoot 'vendor\WinSW-x64.exe'),[switch]$CompileInstaller)
$ErrorActionPreference='Stop'
$root=(Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$stage=Join-Path $root 'dist\POS-Aguacates'
$distRoot=Join-Path $root 'dist'
if(-not $stage.StartsWith($distRoot+'\')){throw 'Ruta de distribución insegura'}
if(Test-Path -LiteralPath $stage){[System.IO.Directory]::Delete($stage,$true)}
New-Item -ItemType Directory -Force -Path (Join-Path $stage 'app'),(Join-Path $stage 'runtime'),(Join-Path $stage 'service')|Out-Null
Copy-Item (Join-Path $root 'pos-frontend') (Join-Path $stage 'app\pos-frontend') -Recurse
Copy-Item (Join-Path $root 'pos-backend') (Join-Path $stage 'app\pos-backend') -Recurse -Exclude '.env','node_modules','logs','data','temp'
$backendStage=Join-Path $stage 'app\pos-backend'
@('backups','logs','data','temp','test','integration-tests')|ForEach-Object{$path=Join-Path $backendStage $_;if(Test-Path -LiteralPath $path){Remove-Item -LiteralPath $path -Recurse -Force}}
Get-ChildItem $backendStage -Recurse -Force -File|Where-Object{$_.Name -eq '.env' -or $_.Extension -in @('.bak','.backup','.dump','.log','.zip','.credentials','.cnf') -or $_.Name -match '\.sql\.gz$'}|Remove-Item -Force
Get-ChildItem (Join-Path $stage 'app\pos-frontend') -Recurse -Force -File|Where-Object{$_.Extension -in @('.bak','.backup','.log')}|Remove-Item -Force
Push-Location (Join-Path $stage 'app\pos-backend'); try{npm.cmd ci --omit=dev --ignore-scripts}finally{Pop-Location}
Copy-Item (Get-Command node.exe).Source (Join-Path $stage 'runtime\node.exe')
if(-not(Test-Path -LiteralPath $WinSWPath)){throw "Falta WinSW-x64.exe en $WinSWPath"}
Copy-Item $WinSWPath (Join-Path $stage 'service\POSAguacates.exe')
Copy-Item (Join-Path $PSScriptRoot 'POSAguacates.xml') (Join-Path $stage 'service\POSAguacates.xml')
Copy-Item (Join-Path $PSScriptRoot 'instalar.ps1') (Join-Path $stage 'instalar.ps1')
Get-ChildItem $stage -Recurse -File|Get-FileHash -Algorithm SHA256|ForEach-Object{"$($_.Hash)  $($_.Path.Substring($stage.Length+1))"}|Set-Content (Join-Path $stage 'SHA256SUMS.txt')
$prohibidos=Get-ChildItem $stage -Recurse -Force -File|Where-Object{$_.FullName -notmatch '\\node_modules\\' -and ($_.Name -eq '.env' -or $_.FullName -match '\\(backups|logs|data|temp|test|integration-tests)\\' -or $_.Extension -in @('.bak','.backup','.dump','.log','.zip','.credentials','.cnf'))}
if($prohibidos){throw "El paquete contiene artefactos prohibidos: $($prohibidos.FullName -join ', ')"}
$requeridos=@('runtime\node.exe','service\POSAguacates.exe','app\pos-backend\index.js','app\pos-backend\node_modules\express\package.json','app\pos-frontend\index.html')
foreach($relativo in $requeridos){if(-not(Test-Path -LiteralPath (Join-Path $stage $relativo))){throw "Paquete incompleto: falta $relativo"}}
$tamano=(Get-ChildItem $stage -Recurse -File|Measure-Object Length -Sum).Sum
if($tamano -lt 50MB){throw "Paquete incompleto: tamaño inesperado $tamano bytes"}
if($CompileInstaller){$iscc=(Get-Command ISCC.exe -ErrorAction Stop).Source;& $iscc (Join-Path $PSScriptRoot 'POSAguacates.iss')}
Write-Host "Distribución creada en $stage"
