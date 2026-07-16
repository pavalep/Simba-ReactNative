$libs = @("libavcodec.so", "libavformat.so", "libavfilter.so", "libavutil.so", "libswresample.so", "libswscale.so", "libavdevice.so")
foreach ($lib in $libs) {
    $path = "x:\Development\SIMBA\MOBILE_APP_REACT_NATIVE\android\app\src\main\jniLibs\x86_64\$lib"
    $bytes = [System.IO.File]::ReadAllBytes($path)
    $str = [System.Text.Encoding]::UTF8.GetString($bytes, 0, [Math]::Min($bytes.Length, 524288))
    $matches = [regex]::Matches($str, 'LIBAV\w+_\d+|FFmpeg|avutil_version|avcodec_version')
    $result = @()
    foreach ($m in $matches) { $result += $m.Value }
    Write-Output "=== $lib ==="
    $result | Sort-Object -Unique | Select-Object -First 10
}
