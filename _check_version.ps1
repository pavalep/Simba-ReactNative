$bytes = [System.IO.File]::ReadAllBytes("x:\Development\SIMBA\MOBILE_APP_REACT_NATIVE\android\app\src\main\jniLibs\x86_64\libavcodec.so")
$str = [System.Text.Encoding]::UTF8.GetString($bytes, 0, [Math]::Min($bytes.Length, 1048576))
$matches = [regex]::Matches($str, 'LIBAVCODEC_\w+|FFMPEG|version|av_dynamic_hdr')
foreach ($m in $matches) { $m.Value } | Sort-Object -Unique
