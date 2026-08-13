$ErrorActionPreference = 'Stop'
Set-Location "X:\Development\SIMBA\MOBILE_APP_REACT_NATIVE"

Write-Output "=== fontFamily hardcoded literals (should be 0 outside fontFamily.ts) ==="
$pattern1 = "fontFamily:\s*['" + [char]34 + "']"
$badFont = Get-ChildItem src -Recurse -File -Include *.ts,*.tsx |
  Select-String -Pattern $pattern1 |
  Where-Object { $_.Path -notmatch 'fontFamily\.ts' }
"Count: $($badFont.Count)"
$badFont | Select-Object Path, LineNumber | Format-Table -AutoSize

Write-Output "=== raw Text tags outside AppText.tsx ==="
$pattern2 = '\<Text\b'
$rawText = Select-String -Path 'src/**/*.tsx' -Pattern $pattern2
$badText = $rawText | Where-Object { $_.Path -notmatch 'AppText\.tsx' }
"Count: $($badText.Count)"
$badText | Select-Object Path, LineNumber | Format-Table -AutoSize

Write-Output "=== variant usage counts ==="
Get-ChildItem src -Recurse -File -Include *.ts,*.tsx |
  Select-String -Pattern "variant=" |
  ForEach-Object {
      $m = [regex]::Match($_.Line, "variant=['" + [char]34 + "']([^'" + [char]34 + "']+)['" + [char]34 + "']")
      if ($m.Success) { $m.Groups[1].Value }
  } |
  Group-Object |
  Sort-Object Count -Descending |
  Format-Table Name, Count -AutoSize
