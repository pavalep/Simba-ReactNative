$libs = @("libavutil.so", "libavcodec.so", "libmpv.so")
foreach ($lib in $libs) {
    $path = "x:\Development\SIMBA\MOBILE_APP_REACT_NATIVE\android\app\src\main\jniLibs\x86_64\$lib"
    $bytes = [System.IO.File]::ReadAllBytes($path)
    $str = [System.Text.Encoding]::UTF8.GetString($bytes, 0, [Math]::Min($bytes.Length, 2097152))
    if ($str.Contains("av_dynamic_hdr_smpte2094_app5_alloc")) {
        Write-Output ("FOUND in $lib")
    } else {
        Write-Output ("NOT in $lib")
    }
    # Also check for the SMPTE 2094-50 related symbols
    $syms = @("av_dynamic_hdr", "smpte2094", "smpte_2094", "hdr_dynamic_hdr")
    foreach ($sym in $syms) {
        if ($str.Contains($sym)) {
            Write-Output ("  Contains: $sym")
        }
    }
}
