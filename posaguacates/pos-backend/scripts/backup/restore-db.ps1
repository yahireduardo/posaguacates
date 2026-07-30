param(
  [Parameter(Mandatory = $true)]
  [string]$Archivo,
  [string]$LocalBackupDestino,
  [string]$AdminUser
)

$ErrorActionPreference = 'Stop'
if (-not $LocalBackupDestino) {
  $LocalBackupDestino = Join-Path $PSScriptRoot '..\..\backups'
}

function Leer-Env([string]$Ruta) {
  $valores = @{}
  Get-Content -LiteralPath $Ruta | ForEach-Object {
    if ($_ -match '^\s*([^#=]+)=(.*)$') {
      $valor = $matches[2].Trim().Trim('"').Trim("'")
      $valores[$matches[1].Trim()] = $valor
    }
  }
  return $valores
}

function Encontrar-MySql {
  foreach ($nombre in @('mariadb.exe', 'mysql.exe', 'mariadb', 'mysql')) {
    $comando = Get-Command $nombre -ErrorAction SilentlyContinue
    if ($comando) { return $comando.Source }
  }
  foreach ($ruta in @('C:\xampp\mysql\bin\mariadb.exe', 'C:\xampp\mysql\bin\mysql.exe')) {
    if (Test-Path -LiteralPath $ruta -PathType Leaf) { return $ruta }
  }
  throw 'No se encontró el cliente mysql/mariadb.'
}

$Archivo = [IO.Path]::GetFullPath($Archivo)
if (-not (Test-Path -LiteralPath $Archivo -PathType Leaf)) { throw "No existe el respaldo: $Archivo" }
if ([IO.Path]::GetExtension($Archivo).ToLowerInvariant() -ne '.sql') { throw 'El respaldo debe ser un archivo .sql.' }
if ((Get-Item -LiteralPath $Archivo).Length -lt 100) { throw 'El archivo de respaldo está vacío.' }
$archivoHash = [IO.Path]::ChangeExtension($Archivo, '.sha256')
if (Test-Path -LiteralPath $archivoHash) {
  $esperado = (Get-Content -LiteralPath $archivoHash -Raw).Trim().Split(' ')[0].ToLowerInvariant()
  $actual = (Get-FileHash -LiteralPath $Archivo -Algorithm SHA256).Hash.ToLowerInvariant()
  if ($esperado -ne $actual) { throw 'El hash SHA-256 no coincide. No se restauró nada.' }
} else {
  Write-Warning 'No se encontró archivo .sha256; la integridad externa no puede verificarse.'
}

Write-Warning 'La restauración reemplazará datos de la base configurada y el POS no debe estar en uso.'
$confirmacion = Read-Host 'Escriba RESTAURAR BASE para continuar'
if ($confirmacion -cne 'RESTAURAR BASE') { throw 'Restauración cancelada.' }

$raizBackend = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$envLocal = Leer-Env (Join-Path $raizBackend '.env')
$dbHost = if ($envLocal.DB_HOST) { $envLocal.DB_HOST } else { 'localhost' }
$dbPort = if ($envLocal.DB_PORT) { $envLocal.DB_PORT } else { '3306' }
$dbUser = if ($envLocal.DB_USER) { $envLocal.DB_USER } else { 'root' }
$dbName = if ($envLocal.DB_NAME) { $envLocal.DB_NAME } else { 'pos_aguacates' }
if ($dbName -notmatch '^[A-Za-z0-9_]+$') { throw 'DB_NAME no es válido.' }

Write-Host 'Creando respaldo previo obligatorio...'
& (Join-Path $PSScriptRoot 'backup-db.ps1') -LocalDestino $LocalBackupDestino

$usuarioSugerido = if ($AdminUser) { $AdminUser } else { 'root' }
if (-not $AdminUser) {
  $capturado = Read-Host "Usuario administrativo MySQL [$usuarioSugerido]"
  $AdminUser = if ($capturado) { $capturado } else { $usuarioSugerido }
}
$passwordSeguro = Read-Host "Contraseña MySQL de $AdminUser (no se mostrará)" -AsSecureString
$punteroPassword = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($passwordSeguro)
$passwordAdmin = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($punteroPassword)

$marcaMantenimiento = Join-Path $raizBackend '.maintenance'
$mysql = Encontrar-MySql
$errorTemporal = Join-Path $env:TEMP "restore_${PID}.stderr.log"
$salidaTemporal = Join-Path $env:TEMP "restore_${PID}.stdout.log"
$passwordAnterior = $env:MYSQL_PWD
try {
  New-Item -ItemType File -Path $marcaMantenimiento -Force | Out-Null
  $env:MYSQL_PWD = $passwordAdmin
  $rutaSql = $Archivo.Replace('\', '/')
  $consulta = "CREATE DATABASE IF NOT EXISTS ``$dbName`` CHARACTER SET utf8mb4; USE ``$dbName``; SOURCE $rutaSql;"
  $proceso = Start-Process -FilePath $mysql -ArgumentList @(
    "--host=$dbHost",
    "--port=$dbPort",
    "--user=$AdminUser",
    '--default-character-set=utf8mb4',
    "--execute=$consulta"
  ) -Wait -PassThru -WindowStyle Hidden -RedirectStandardOutput $salidaTemporal `
    -RedirectStandardError $errorTemporal
  if ($proceso.ExitCode -ne 0) {
    $detalle = Get-Content -LiteralPath $errorTemporal -Raw -ErrorAction SilentlyContinue
    throw "La restauración falló (código $($proceso.ExitCode)). $detalle"
  }

  $validacion = "SELECT 'clientes' tabla,COUNT(*) total FROM ``$dbName``.clientes UNION ALL SELECT 'ventas',COUNT(*) FROM ``$dbName``.ventas UNION ALL SELECT 'productos',COUNT(*) FROM ``$dbName``.productos UNION ALL SELECT 'pagos',COUNT(*) FROM ``$dbName``.pagos; SELECT COALESCE(SUM(stock),0) stock_total FROM ``$dbName``.productos; SELECT COALESCE(SUM(saldo_pendiente),0) saldo_pendiente FROM ``$dbName``.cuentas_por_cobrar WHERE estado='PENDIENTE'; SELECT MAX(fecha) ultima_venta FROM ``$dbName``.ventas;"
  & $mysql "--host=$dbHost" "--port=$dbPort" "--user=$AdminUser" --table "--execute=$validacion"
  if ($LASTEXITCODE -ne 0) { throw 'La importación terminó, pero falló la validación posterior.' }
  Write-Host 'RESTAURACIÓN Y VALIDACIÓN COMPLETADAS.'
} finally {
  $env:MYSQL_PWD = $passwordAnterior
  if ($punteroPassword -ne [IntPtr]::Zero) {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($punteroPassword)
  }
  $passwordAdmin = $null
  Remove-Item -LiteralPath $marcaMantenimiento -Force -ErrorAction SilentlyContinue
  Remove-Item -LiteralPath $errorTemporal,$salidaTemporal -Force -ErrorAction SilentlyContinue
}
