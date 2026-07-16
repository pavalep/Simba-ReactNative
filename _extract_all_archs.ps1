Add-Type -AssemblyName "System.IO.Compression.FileSystem"
$zip = [System.IO.Compression.ZipFile]::OpenRead("x:\Development\SIMBA\MOBILE_APP_REACT_NATIVE\temp_mpv_extract\mpv.apk")

$archMap = @{
    "lib/arm64-v8a/" = "arm64-v8a"
    "lib/armeabi-v7a/" = "armeabi-v7a"
    "lib/x86/" = "x86"
}

foreach ($prefix in $archMap.Keys) {
    $archName = $archMap[$prefix]
    $entries = $zip.Entries | Where-Object { $_.FullName -match "^$prefix.*\.so$" }
    foreach ($entry in $entries) {
        $dest = "x:\Development\SIMBA\MOBILE_APP_REACT_NATIVE\temp_mpv_extract\${archName}_$($entry.Name)"
        [System.IO.Compression.ZipFileExtensions]::ExtractToFile($entry, $dest, $true)
    }
    Write-Output ("Extracted {0} files for {1}" -f @($entries.Count, $archName))
}
$zip.Dispose()
