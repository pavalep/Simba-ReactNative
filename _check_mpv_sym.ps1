$bytes = [System.IO.File]::ReadAllBytes("x:\Development\SIMBA\MOBILE_APP_REACT_NATIVE\android\app\src\main\jniLibs\x86_64\libmpv.so")
$str = [System.Text.Encoding]::UTF8.GetString($bytes, 0, [Math]::Min($bytes.Length, 1048576))
$matches = [regex]::Matches($str, 'LIBAVCODEC_\w+|LIBAVFORMAT_\w+|LIBAVFILTER_\w+|LIBAVUTIL_\w+|avcodec_version|avformat_version')
$result = @()
foreach ($m in $matches) { $result += $m.Value }
$result | Sort-Object -Unique | Select-Object -First 20
