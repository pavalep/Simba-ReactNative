$ErrorActionPreference = 'Stop'
Set-Location "X:\Development\SIMBA\MOBILE_APP_REACT_NATIVE"

$valid = @('display','h1','h2','h3','body1','body2','bodySmall','caption','overline','button','tab','brandScript','displaySerif','displaySans','mono')

# Build pattern that matches variant="X" or variant='X'
$pat = 'variant=[\x22\x27]([A-Za-z0-9_]+)[\x22\x27]'

Write-Output "=== AppText variant usage (only known AppText variants) ==="
$rows = Get-ChildItem src -Recurse -File -Include *.ts,*.tsx |
  Select-String -Pattern $pat |
  ForEach-Object {
      $m = [regex]::Match($_.Line, $pat)
      if ($m.Success) { $m.Groups[1].Value }
  } |
  Where-Object { $valid -contains $_ } |
  Group-Object |
  Sort-Object Count -Descending
$rows | Format-Table Name, Count -AutoSize

Write-Output ""
Write-Output "=== v7 token totals ==="
$sum = Get-ChildItem src -Recurse -File -Include *.ts,*.tsx |
  Select-String -Pattern $pat |
  ForEach-Object {
      $m = [regex]::Match($_.Line, $pat)
      if ($m.Success) { $m.Groups[1].Value }
  } |
  Where-Object { @('brandScript','displaySerif','displaySans','mono') -contains $_ }
"Total v7 typography token usages: $($sum.Count)"

Write-Output ""
Write-Output "=== Inter workhorse (everything that is NOT a v7 token) ==="
$inter = Get-ChildItem src -Recurse -File -Include *.ts,*.tsx |
  Select-String -Pattern $pat |
  ForEach-Object {
      $m = [regex]::Match($_.Line, $pat)
      if ($m.Success) { $m.Groups[1].Value }
  } |
  Where-Object { $valid -contains $_ -and @('brandScript','displaySerif','displaySans','mono') -notcontains $_ }
"Inter variant usages: $($inter.Count)"
