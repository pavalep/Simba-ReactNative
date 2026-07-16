$libs = @("libavcodec.so", "libavutil.so", "libmpv.so")
foreach ($lib in $libs) {
    $path = "x:\Development\SIMBA\MOBILE_APP_REACT_NATIVE\android\app\src\main\jniLibs\x86_64\$lib"
    $bytes = [System.IO.File]::ReadAllBytes($path)
    $str = [System.Text.Encoding]::UTF8.GetString($bytes, 0, [Math]::Min($bytes.Length, 2097152))
    
    Write-Output ("=== $lib ===")
    # Look for version strings like "62.23.102" near "LIBAV" or version-related strings
    $patterns = @("LIBAVCODEC_\d+\.\d+\.\d+", "LIBAVCODEC_\d+", "libavcodec version", 
                  "N-\d+", "FFmpeg version", "LIBAVUTIL_\d+", "62\.\d+\.\d+",
                  "avcodec_version", "avutil_version")
    foreach ($p in $patterns) {
        $matches = [regex]::Matches($str, $p)
        if ($matches.Count -gt 0) {
            foreach ($m in $matches) { Write-Output ("  $($m.Value)") }
        }
    }
    Write-Output ""
}
