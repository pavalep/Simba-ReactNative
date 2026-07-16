Add-Type -AssemblyName 'System.IO.Compression.FileSystem'
$zip = [System.IO.Compression.ZipFile]::OpenRead('x:\Development\SIMBA\MOBILE_APP_REACT_NATIVE\android\app\src\main\jniLibs\ffmpeg-x86_64-v264.zip')
$zip.Entries | ForEach-Object { Write-Output ("{0,-60} {1,10}" -f $_.Name, $_.Length) }
$zip.Dispose()
