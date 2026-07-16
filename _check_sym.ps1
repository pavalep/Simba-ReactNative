$path = "x:\Development\SIMBA\MOBILE_APP_REACT_NATIVE\android\app\src\main\jniLibs\x86_64\libavcodec.so"
$bytes = [System.IO.File]::ReadAllBytes($path)
$str = [System.Text.Encoding]::UTF8.GetString($bytes, 0, [Math]::Min($bytes.Length, 2097152))
if ($str.Contains("av_dynamic_hdr_smpte2094_app5_alloc")) {
    Write-Output "FOUND: av_dynamic_hdr_smpte2094_app5_alloc in libavcodec.so"
} else {
    Write-Output "NOT FOUND: av_dynamic_hdr_smpte2094_app5_alloc in libavcodec.so"
}
# Also check libmpv
$path2 = "x:\Development\SIMBA\MOBILE_APP_REACT_NATIVE\android\app\src\main\jniLibs\x86_64\libmpv.so"
$bytes2 = [System.IO.File]::ReadAllBytes($path2)
$str2 = [System.Text.Encoding]::UTF8.GetString($bytes2, 0, [Math]::Min($bytes2.Length, 2097152))
if ($str2.Contains("av_dynamic_hdr_smpte2094_app5_alloc")) {
    Write-Output "FOUND: av_dynamic_hdr_smpte2094_app5_alloc in libmpv.so"
} else {
    Write-Output "NOT FOUND: av_dynamic_hdr_smpte2094_app5_alloc in libmpv.so"
}
