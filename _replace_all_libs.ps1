$extractDir = "x:\Development\SIMBA\MOBILE_APP_REACT_NATIVE\temp_mpv_extract"
$jniBase = "x:\Development\SIMBA\MOBILE_APP_REACT_NATIVE\android\app\src\main\jniLibs"

$soFiles = @("libavcodec.so", "libavdevice.so", "libavfilter.so", "libavformat.so", "libavutil.so", "libswresample.so", "libswscale.so", "libmpv.so")

# Process x86_64
Write-Output "=== x86_64 ==="
foreach ($file in $soFiles) {
    $src = "$extractDir\$file"
    $dst = "$jniBase\x86_64\$file"
    $backup = "$jniBase\backup_x86_64\$file"
    if (Test-Path $src) {
        if (Test-Path $dst) { Copy-Item $dst $backup -Force }
        Copy-Item $src $dst -Force
        Write-Output ("  $file -> replaced")
    }
}

# First make backup dirs
$archs = @("arm64-v8a", "armeabi-v7a")
foreach ($arch in $archs) {
    $backupDir = "$jniBase\backup_$arch"
    if (-not (Test-Path $backupDir)) { New-Item -ItemType Directory -Path $backupDir | Out-Null }
    Write-Output ("=== $arch ===")
    foreach ($file in $soFiles) {
        $src = "$extractDir\${arch}_$file"
        $dst = "$jniBase\$arch\$file"
        $backup = "$backupDir\$file"
        if (Test-Path $src) {
            if (Test-Path $dst) { Copy-Item $dst $backup -Force }
            Copy-Item $src $dst -Force
            Write-Output ("  $file -> replaced")
        }
    }
}

# Also update x86 - from x86_64 if no x86 variant in APK
Write-Output "=== x86 ==="
foreach ($file in $soFiles) {
    $src = "$extractDir\$file"
    $dst = "$jniBase\x86\$file"
    if (Test-Path $src -and (Test-Path $dst)) {
        Copy-Item $src $dst -Force
        Write-Output ("  $file -> replaced (from x86_64)")
    }
}

Write-Output ""
Write-Output "All architectures updated!"
