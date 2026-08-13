param(
    [Parameter(Mandatory=$true)][string]$Font
)

$ErrorActionPreference = 'Stop'
Set-Location "X:\Development\SIMBA\MOBILE_APP_REACT_NATIVE"

$ttf = Join-Path (Get-Location) $Font
if (-not (Test-Path $ttf)) {
    Write-Output "NOT FOUND: $ttf"
    exit 1
}

$fs = New-Object System.IO.FileStream($ttf, [System.IO.FileMode]::Open, [System.IO.FileAccess]::Read)
$br = New-Object System.IO.BinaryReader($fs)

$sfnt = $br.ReadBytes(4)
$numTables = $br.ReadUInt16()
$br.ReadUInt16()
$br.ReadUInt16()
$br.ReadUInt16()
Write-Output "sfnt: $([System.Text.Encoding]::ASCII.GetString($sfnt)) ($numTables tables)"

$nameOffset = 0
$nameLength = 0
for ($i=0; $i -lt $numTables; $i++) {
    $tag = [System.Text.Encoding]::ASCII.GetString($br.ReadBytes(4))
    $check = $br.ReadUInt32()
    $offset = $br.ReadUInt32()
    $length = $br.ReadUInt32()
    Write-Output "  $tag (offset=$offset, length=$length)"
    if ($tag -eq 'name') { $nameOffset = $offset; $nameLength = $length }
}

$br.BaseStream.Seek($nameOffset, [System.IO.SeekOrigin]::Begin) | Out-Null
$format = $br.ReadUInt16()
$count = $br.ReadUInt16()
$stringOffset = $br.ReadUInt16()
Write-Output ""
Write-Output "name table: format=$format, $count records, stringOffset=$stringOffset"

$ids = @{
    0  = 'copyright'
    1  = 'family'
    2  = 'subfamily'
    3  = 'uid'
    4  = 'full'
    5  = 'version'
    6  = 'postscript'
    7  = 'trademark'
    8  = 'manufacturer'
    9  = 'designer'
    10 = 'description'
    11 = 'vendor url'
    12 = 'designer url'
    13 = 'license'
    14 = 'license url'
    16 = 'typo family'
    17 = 'typo subfamily'
    18 = 'mac full'
    19 = 'sample text'
    20 = 'postscript cid'
    21 = 'wws family'
    22 = 'wws subfamily'
    25 = 'variations'
}

for ($i=0; $i -lt $count; $i++) {
    $plat = $br.ReadUInt16()
    $enc = $br.ReadUInt16()
    $lang = $br.ReadUInt16()
    $nameId = $br.ReadUInt16()
    $strLen = $br.ReadUInt16()
    $strOff = $br.ReadUInt16()
    $pos = $nameOffset + $stringOffset + $strOff
    $cur = $br.BaseStream.Position
    $br.BaseStream.Seek($pos, [System.IO.SeekOrigin]::Begin) | Out-Null
    $str = ""
    $j = 0
    while ($j -lt $strLen) {
        $b = $br.ReadByte()
        $str += [char]$b
        $j++
    }
    $br.BaseStream.Seek($cur, [System.IO.SeekOrigin]::Begin) | Out-Null

    $idName = $ids[[int]$nameId]
    if (-not $idName) { $idName = "id=$nameId" }
    $platName = if ($plat -eq 0) {"mac"} elseif ($plat -eq 3) {"win"} else {"plat=$plat"}

    # Only print Windows-platform entries (Android uses these)
    if ($plat -eq 3) {
        Write-Output "  nameId=$nameId ($idName) [lang=$lang]: $str"
    }
}

$br.Close()
$fs.Close()
