# capture-pip-logs.ps1
# Usage: powershell -ExecutionPolicy Bypass -File .\capture-pip-logs.ps1
# Captures a fresh, dated logcat filtered to the mpv / SurfaceFlinger / PiP path.
# 1. Clears the log buffer.
# 2. Starts filtered capture in the background.
# 3. Prints a banner so you know it's recording.
# 4. You then in the app: open a video, tap PiP, screenshot, expand back.
# 5. Stop capture with Ctrl-C -> the file flushes to disk.

$ErrorActionPreference = "Stop"

$adb = "C:\Users\paval\AppData\Local\Android\Sdk\platform-tools\adb.exe"
if (-not (Test-Path $adb)) {
    Write-Host "adb.exe not found at $adb" -ForegroundColor Red
    exit 1
}

$stamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$out   = Join-Path $PSScriptRoot ("adb_logcat_{0}_pip-investigation.txt" -f $stamp)

Write-Host "Capturing to: $out" -ForegroundColor Cyan
Write-Host "Steps in the app while this runs:" -ForegroundColor Yellow
Write-Host "  1) Make sure video is playing in fullscreen."
Write-Host "  2) Tap the PiP control."
Write-Host "  3) Wait a few seconds, screenshot the PiP window."
Write-Host "  4) Tap to expand back to fullscreen."
Write-Host "Press Ctrl-C to stop capture and save the file." -ForegroundColor Yellow

& $adb logcat -c
& $adb logcat -v time `
    MpvJNI:V MpvRenderView:V MpvBridgeModule:V MpvEvent:V MainActivity:V `
    ReactNativeJS:V SurfaceFlinger:W WindowManager:W ActivityTaskManager:I `
    mpv:V libc:V DEBUG:V *:S `
  | Out-File -Encoding utf8 $out

Write-Host "Saved: $out"
