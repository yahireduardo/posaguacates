param(
  [string]$Destino,
  [string]$LocalDestino
)

$ErrorActionPreference = 'Stop'
if (-not $LocalDestino) { $LocalDestino = Join-Path $PSScriptRoot '..\..\backups' }

function Leer-Env([string]$Ruta) {
  $valores = @{}
  Get-Content -LiteralPath $Ruta | ForEach-Object {
    if ($_ -match '^\s*([^#=]+)=(.*)$') {
      $valor = $matches[2].Trim()
      if (($valor.StartsWith('"') -and $valor.EndsWith('"')) -or
          ($valor.StartsWith("'") -and $valor.EndsWith("'"))) {
        $valor = $valor.Substring(1, $valor.Length - 2)
      }
      $valores[$matches[1].Trim()] = $valor
    }
  }
  return $valores
}

function Encontrar-Binario([string[]]$Nombres) {
  foreach ($nombre in $Nombres) {
    $comando = Get-Command $nombre -ErrorAction SilentlyContinue
    if ($comando) { return $comando.Source }
  }
  foreach ($ruta in @(
    'C:\xampp\mysql\bin\mariadb-dump.exe',
    'C:\xampp\mysql\bin\mysqldump.exe'
  )) {
    if (Test-Path -LiteralPath $ruta -PathType Leaf) { return $ruta }
  }
  throw 'No se encontró mysqldump ni mariadb-dump. Instale MariaDB/MySQL o agregue su carpeta bin al PATH.'
}

function Verificar-Espacio([string]$Ruta, [long]$MinimoBytes = 104857600) {
  $raiz = [IO.Path]::GetPathRoot([IO.Path]::GetFullPath($Ruta))
  $unidad = [IO.DriveInfo]::new($raiz)
  if ($unidad.IsReady -and $unidad.AvailableFreeSpace -lt $MinimoBytes) {
    throw "Espacio insuficiente en $raiz. Se requieren al menos 100 MB libres."
  }
}

$raizBackend = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$envLocal = Leer-Env (Join-Path $raizBackend '.env')
$dbHost = if ($envLocal.DB_HOST) { $envLocal.DB_HOST } else { 'localhost' }
$dbPort = if ($envLocal.DB_PORT) { $envLocal.DB_PORT } else { '3306' }
$dbUser = if ($envLocal.DB_USER) { $envLocal.DB_USER } else { 'root' }
$dbName = if ($envLocal.DB_NAME) { $envLocal.DB_NAME } else { 'pos_aguacates' }
if (-not $dbName -or $dbName -notmatch '^[A-Za-z0-9_]+$') { throw 'DB_NAME no es válido.' }

$LocalDestino = [IO.Path]::GetFullPath($LocalDestino)
Verificar-Espacio $LocalDestino
New-Item -ItemType Directory -Path $LocalDestino -Force | Out-Null
if ($Destino) {
  $Destino = [IO.Path]::GetFullPath($Destino)
  $unidad = [IO.Path]::GetPathRoot($Destino)
  if (-not $unidad -or -not (Test-Path -LiteralPath $unidad)) {
    throw "La unidad de destino no existe: $unidad"
  }
  Verificar-Espacio $Destino
}

$marca = Get-Date -Format 'yyyy-MM-dd_HH-mm-ss'
$nombreBase = "${dbName}_${marca}"
$archivoLocal = Join-Path $LocalDestino "${nombreBase}.sql"
$errorTemporal = Join-Path $env:TEMP "${nombreBase}.stderr.log"
$dump = Encontrar-Binario @('mariadb-dump.exe', 'mysqldump.exe', 'mariadb-dump', 'mysqldump')
$passwordAnterior = $env:MYSQL_PWD
try {
  $env:MYSQL_PWD = $envLocal.DB_PASSWORD
  $argumentos = @(
    "--host=$dbHost",
    "--port=$dbPort",
    "--user=$dbUser",
    '--single-transaction',
    '--quick',
    '--routines',
    '--triggers',
    '--events',
    '--hex-blob',
    '--default-character-set=utf8mb4',
    "--result-file=$archivoLocal",
    $dbName
  )
  $proceso = Start-Process -FilePath $dump -ArgumentList $argumentos -Wait -PassThru `
    -WindowStyle Hidden -RedirectStandardError $errorTemporal
  if ($proceso.ExitCode -ne 0) {
    $detalle = Get-Content -LiteralPath $errorTemporal -Raw -ErrorAction SilentlyContinue
    throw "El respaldo falló (código $($proceso.ExitCode)). $detalle"
  }
} finally {
  $env:MYSQL_PWD = $passwordAnterior
  Remove-Item -LiteralPath $errorTemporal -Force -ErrorAction SilentlyContinue
}

$archivoInfo = Get-Item -LiteralPath $archivoLocal
if ($archivoInfo.Length -lt 100 -or -not (Select-String -LiteralPath $archivoLocal -Pattern 'CREATE TABLE' -Quiet)) {
  throw 'El archivo generado está vacío o no contiene estructura SQL válida.'
}
$hash = (Get-FileHash -LiteralPath $archivoLocal -Algorithm SHA256).Hash.ToLowerInvariant()
$hashLocal = [IO.Path]::ChangeExtension($archivoLocal, '.sha256')
Set-Content -LiteralPath $hashLocal -Value $hash -Encoding ascii

$archivoFinal = $archivoLocal
if ($Destino) {
  New-Item -ItemType Directory -Path $Destino -Force | Out-Null
  $archivoFinal = Join-Path $Destino $archivoInfo.Name
  Copy-Item -LiteralPath $archivoLocal -Destination $archivoFinal -Force
  Copy-Item -LiteralPath $hashLocal -Destination ([IO.Path]::ChangeExtension($archivoFinal, '.sha256')) -Force
  $hashCopia = (Get-FileHash -LiteralPath $archivoFinal -Algorithm SHA256).Hash.ToLowerInvariant()
  if ($hashCopia -ne $hash) { throw 'La copia del respaldo no coincide con el hash local.' }
}

$finalInfo = Get-Item -LiteralPath $archivoFinal
[pscustomobject]@{
  Resultado = 'RESPALDO VERIFICADO'
  RutaLocal = $archivoLocal
  RutaFinal = $archivoFinal
  TamanoBytes = $finalInfo.Length
  Fecha = $finalInfo.LastWriteTime
  SHA256 = $hash
} | Format-List
