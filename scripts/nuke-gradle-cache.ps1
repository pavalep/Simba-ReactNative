# ─── SIMBA Android build cache nuker (P61) ────────────────────────
# Use this when Gradle's transforms cache goes bad and you see errors
# like "Imported target fbjni::fbjni includes non-existent path".
#
# Removes the broken Gradle transforms (where the missing AAR paths
# are), the per-module android/build directories (so codegen re-runs),
# and the project's own build outputs. After this, the next
# `npx react-native run-android` will regenerate everything cleanly.
#
# This is INTENTIONALLY aggressive. Don't run it on a working build.

$ErrorActionPreference = 'Stop'

$ProjectRoot = 'X:\Development\SIMBA\MOBILE_APP_REACT_NATIVE'
$AndroidDir  = Join-Path $ProjectRoot 'android'
$GradleCache = Join-Path $env:USERPROFILE '.gradle\caches'

Write-Host '[1/5] Stop Gradle daemons…' -ForegroundColor Cyan
Push-Location $AndroidDir
try { .\gradlew --stop 2>&1 | Out-Null } catch {}
Pop-Location

Write-Host '[2/5] Nuke Gradle transforms + caches…' -ForegroundColor Cyan
$pathsToNuke = @(
  (Join-Path $GradleCache '9.3.1\transforms'),
  (Join-Path $GradleCache '9.3.1\jars-9'),
  (Join-Path $GradleCache '9.3.1\kotlin-dsl'),
  (Join-Path $GradleCache 'journal-1'),
  (Join-Path $GradleCache 'daemon'),
  (Join-Path $GradleCache 'build-cache-1')
)
foreach ($p in $pathsToNuke) {
  if (Test-Path -LiteralPath $p) {
    Write-Host "  removing $p"
    Remove-Item -LiteralPath $p -Recurse -Force -ErrorAction SilentlyContinue
  }
}

Write-Host '[3/5] Nuke project build outputs…' -ForegroundColor Cyan
$projectBuilds = @(
  (Join-Path $AndroidDir 'app\build'),
  (Join-Path $AndroidDir 'build'),
  (Join-Path $AndroidDir '.gradle')
)
foreach ($p in $projectBuilds) {
  if (Test-Path -LiteralPath $p) {
    Write-Host "  removing $p"
    Remove-Item -LiteralPath $p -Recurse -Force -ErrorAction SilentlyContinue
  }
}

Write-Host '[4/5] Nuke native module build/ dirs (forces codegen re-run)…' -ForegroundColor Cyan
$nodeModules = Join-Path $ProjectRoot 'node_modules'
$moduleBuilds = Get-ChildItem -Path $nodeModules -Directory -Recurse -Filter 'build' -ErrorAction SilentlyContinue |
  Where-Object { $_.FullName -like '*\android\build' -or $_.FullName -like '*\android\.cxx' }
foreach ($d in $moduleBuilds) {
  Write-Host "  removing $($d.FullName)"
  Remove-Item -LiteralPath $d.FullName -Recurse -Force -ErrorAction SilentlyContinue
}

Write-Host '[5/5] Done. Now run:' -ForegroundColor Green
Write-Host '   cd X:\Development\SIMBA\MOBILE_APP_REACT_NATIVE'
Write-Host '   npx react-native run-android'
Write-Host ''
Write-Host 'First build will be slow (10–15 min) as it re-downloads AARs and re-codegens everything.' -ForegroundColor Yellow
