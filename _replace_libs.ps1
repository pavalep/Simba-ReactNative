$jniDir = "x:\Development\SIMBA\MOBILE_APP_REACT_NATIVE\android\app\src\main\jniLibs\x86_64"
$backupDir = "x:\Development\SIMBA\MOBILE_APP_REACT_NATIVE\android\app\src\main\jniLibs\backup_x86_64"
$extractDir = "x:\Development\SIMBA\MOBILE_APP_REACT_NATIVE\temp_mpv_extract"

# Files to replace from mpv APK (matching FFmpeg N-124096 build)
$soFiles = @("libavcodec.so", "libavdevice.so", "libavfilter.so", "libavformat.so", "libavutil.so", "libswresample.so", "libswscale.so", "libmpv.so")

foreach ($file in $soFiles) {
    $src = "$jniDir\$file"
    $backup = "$backupDir\$file"
    $new = "$extractDir\$file"
    
    # Backup old file
    if (Test-Path $src) {
        Copy-Item $src $backup -Force
        $oldSize = (Get-Item $src).Length
    } else {
        $oldSize = 0
    }
    
    # Copy new file
    Copy-Item $new $src -Force
    $newSize = (Get-Item $src).Length
    
    Write-Output ("$file : backed up ({0:N0} B) -> replaced ({1:N0} B)" -f $oldSize, $newSize)
}

Write-Output ""
Write-Output "Done! All .so files replaced."
