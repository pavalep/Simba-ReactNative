$ErrorActionPreference = 'Stop'
Set-Location "X:\Development\SIMBA\MOBILE_APP_REACT_NATIVE"

$pat = 'fontWeight:\s*[' + [char]34 + [char]39 + ']([0-9]+|bold|normal)[' + [char]34 + [char]39 + ']'
$rows = Get-ChildItem src -Recurse -File -Include *.ts,*.tsx |
  Select-String -Pattern $pat |
  ForEach-Object {
      [pscustomobject]@{
          File = $_.Path.Substring((Get-Location).Path.Length + 1)
          Line = $_.LineNumber
          Weight = ($_.Line -replace '.*fontWeight:\s*[' + [char]34 + [char]39 + ']([0-9]+|bold|normal)[' + [char]34 + [char]39 + '].*', '$1')
      }
  }
$rows | Group-Object Weight | Sort-Object Count -Descending | Format-Table Name, Count -AutoSize
Write-Output ""
Write-Output "=== Heavy weights (700/800/900) — these override typography tokens ==="
$rows | Where-Object { $_.Weight -in @('700','800','900','bold') } | Format-Table File, Line, Weight -AutoSize
