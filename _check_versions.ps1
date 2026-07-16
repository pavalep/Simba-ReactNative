$libs = @("libavcodec.so", "libavformat.so", "libavfilter.so", "libavutil.so", "libswresample.so", "libswscale.so", "libmpv.so")
foreach ($lib in $libs) {
    $path = "x:\Development\SIMBA\MOBILE_APP_REACT_NATIVE\android\app\src\main\jniLibs\x86_64\$lib"
    if (-not (Test-Path $path)) {
        Write-Output ("$lib : NOT FOUND")
        continue
    }
    $bytes = [System.IO.File]::ReadAllBytes($path)
    $str = [System.Text.Encoding]::UTF8.GetString($bytes, 0, [Math]::Min($bytes.Length, 2097152))
    $matches = [regex]::Matches($str, '(?:LIBAV\w+_|LIBMPV_|mpv\s+v)\d+\.\d+\.\d+')
    $result = @()
    foreach ($m in $matches) { $result += $m.Value }
    Write-Output ("=== $lib ===")
    $result | Sort-Object -Unique | Select-Object -First 15
    Write-Output ""
}
