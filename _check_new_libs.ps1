$extractDir = "x:\Development\SIMBA\MOBILE_APP_REACT_NATIVE\temp_mpv_extract"
$libs = @("libavutil.so", "libavcodec.so", "libmpv.so")
foreach ($lib in $libs) {
    $path = "$extractDir\$lib"
    $bytes = [System.IO.File]::ReadAllBytes($path)
    $str = [System.Text.Encoding]::UTF8.GetString($bytes, 0, [Math]::Min($bytes.Length, 2097152))
    Write-Output ("=== $lib ===")
    
    # Check for the missing symbol
    if ($str.Contains("av_dynamic_hdr_smpte2094_app5_alloc")) {
        Write-Output ("  HAS av_dynamic_hdr_smpte2094_app5_alloc: YES")
    } else {
        Write-Output ("  HAS av_dynamic_hdr_smpte2094_app5_alloc: NO")
    }
    
    # Check versions
    $versionPatterns = @("LIBAVCODEC_\d+", "LIBAVUTIL_\d+", "LIBAVFORMAT_\d+", 
                        "LIBAVFILTER_\d+", "mpv v\d+\.\d+\.\d+",
                        "N-\d+", "FFmpeg version",
                        "\d+\.\d+\.\d+")
    foreach ($p in $versionPatterns) {
        $matches = [regex]::Matches($str, $p)
        if ($matches.Count -gt 0) {
            $vals = @()
            foreach ($m in $matches) { $vals += $m.Value }
            $vals | Sort-Object -Unique | Select-Object -First 5 | ForEach-Object { Write-Output ("  $_") }
        }
    }
    Write-Output ""
}
