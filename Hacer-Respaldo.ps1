# ============================================================
# Hacer-Respaldo.ps1 · Copia de seguridad versionada de SaludEnOrden
# Uso: clic derecho > "Ejecutar con PowerShell" (o: .\Hacer-Respaldo.ps1)
# Lee el número de versión de index.html (?v=X.Y) y crea:
#   1) Carpeta "Historial Medico Personal - vX.Y (fecha hora)"
#   2) ZIP "SaludEnOrden-vX.Y (fecha hora).zip"
# ============================================================

$ErrorActionPreference = 'Stop'
$src = $PSScriptRoot
$parent = Split-Path $src -Parent

# Obtener la versión actual desde index.html
$version = 'sin-version'
$indexPath = Join-Path $src 'index.html'
if (Test-Path $indexPath) {
    $html = Get-Content $indexPath -Raw
    if ($html -match '\?v=([0-9][0-9.]*)') { $version = $Matches[1] }
}

$stamp = Get-Date -Format 'yyyy-MM-dd_HHmm'
$folderName = "Historial Medico Personal - v$version ($stamp)"
$destFolder = Join-Path $parent $folderName
$zipName = "SaludEnOrden-v$version ($stamp).zip"
$zipPath = Join-Path $parent $zipName

# Evitar sobrescribir un respaldo del mismo minuto
if (Test-Path $destFolder) {
    $stamp = Get-Date -Format 'yyyy-MM-dd_HHmmss'
    $folderName = "Historial Medico Personal - v$version ($stamp)"
    $destFolder = Join-Path $parent $folderName
    $zipName = "SaludEnOrden-v$version ($stamp).zip"
    $zipPath = Join-Path $parent $zipName
}

Copy-Item $src $destFolder -Recurse -Force
Compress-Archive -Path $destFolder -DestinationPath $zipPath -Force

Write-Host ''
Write-Host "Respaldo creado correctamente:" -ForegroundColor Green
Write-Host "  Carpeta: $destFolder"
Write-Host "  ZIP:     $zipPath"
Write-Host "  Version: v$version"
Write-Host ''
Write-Host "Para restaurar: copia el contenido de la carpeta del respaldo sobre la carpeta de la app (o descomprime el ZIP)."
