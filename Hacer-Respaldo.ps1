# ============================================================
# Hacer-Respaldo.ps1 · Copia de seguridad versionada de SaludEnOrden
# Uso: clic derecho > "Ejecutar con PowerShell" (o: .\Hacer-Respaldo.ps1)
# Lee el número de versión de index.html (?v=X.Y) y crea, dentro de:
#   R:\Programación\OpenCode\Historial Medico Personal - Respaldos\Versiones\AAAA-MM\
#   1) Carpeta "vX.Y (fecha hora)" con el proyecto completo
#   2) ZIP "SaludEnOrden-vX.Y (fecha hora).zip" del mismo respaldo
# Los datos personales NO se copian aquí: viven en ... - Respaldos\Datos\
# ============================================================

$ErrorActionPreference = 'Stop'
$src  = $PSScriptRoot
$base = Split-Path $src -Parent

# Destino fijo y ordenado (todo bajo R:\Programación\OpenCode)
$backupRoot  = Join-Path $base 'Historial Medico Personal - Respaldos'
$versionsRoot = Join-Path $backupRoot 'Versiones'
$monthFolder = Join-Path $versionsRoot (Get-Date -Format 'yyyy-MM')
if (-not (Test-Path -LiteralPath $monthFolder)) {
    New-Item -ItemType Directory -Path $monthFolder -Force | Out-Null
}

# Obtener la versión actual desde index.html
$version = 'sin-version'
$indexPath = Join-Path $src 'index.html'
if (Test-Path $indexPath) {
    $html = Get-Content $indexPath -Raw
    if ($html -match '\?v=([0-9][0-9.]*)') { $version = $Matches[1] }
}

$stamp = Get-Date -Format 'yyyy-MM-dd_HHmm'
$folderName = "v$version ($stamp)"
$destFolder = Join-Path $monthFolder $folderName
$zipName = "SaludEnOrden-v$version ($stamp).zip"
$zipPath = Join-Path $monthFolder $zipName

# Evitar sobrescribir un respaldo del mismo minuto
if (Test-Path $destFolder) {
    $stamp = Get-Date -Format 'yyyy-MM-dd_HHmmss'
    $folderName = "v$version ($stamp)"
    $destFolder = Join-Path $monthFolder $folderName
    $zipName = "SaludEnOrden-v$version ($stamp).zip"
    $zipPath = Join-Path $monthFolder $zipName
}

Copy-Item $src $destFolder -Recurse -Force
Compress-Archive -Path $destFolder -DestinationPath $zipPath -Force

Write-Host ''
Write-Host 'Respaldo creado correctamente:' -ForegroundColor Green
Write-Host "  Versión: $version"
Write-Host "  Mes:     $monthFolder"
Write-Host "  Carpeta: $destFolder"
Write-Host "  ZIP:     $zipPath"
Write-Host ''
Write-Host 'Para restaurar: copia el contenido de la carpeta del respaldo sobre la carpeta de la app (o descomprime el ZIP).'
