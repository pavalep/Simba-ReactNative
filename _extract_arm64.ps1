Add-Type -AssemblyName "System.IO.Compression.FileSystem"
$zip = [System.IO.Compression.ZipFile]::OpenRead("x:\Development\SIMBA\MOBILE_APP_REACT_NATIVE\temp_mpv_extract\mpv.apk")
$entries = $zip.Entries | Where-Object { $_.FullName -match "^lib/arm64-v8a/.*\.so$" }
foreach ($entry in $entries) {
    $dest = "x:\Development\SIMBA\MOBILE_APP_REACT_NATIVE\temp_mpv_extract\arm64_$($entry.Name)"
    [System.IO.Compression.ZipFileExtensions]::ExtractToFile($entry, $dest, $true)
    Write-Output ("Extracted: " + $entry.Name + " (" + $entry.Length + " bytes)")
}
$zip.Dispose()
