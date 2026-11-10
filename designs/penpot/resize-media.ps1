# resize-media.ps1 — make the prototype's artwork small enough to ship.
#
# The Penpot plugin cannot fetch a remote URL from inside the design file's
# sandbox, so the app's own pictures travel to Penpot as base64 inside the
# build payload — and that payload has a size limit. The app's library
# placeholders are 800x600 photographs (up to 138 KB each); the board shows
# them at 160x90. This script scales each picture to the size it is drawn
# at (2x for sharpness) and re-encodes it as JPEG.
#
# Usage:
#   pwsh -NoProfile -File designs/penpot/resize-media.ps1 -Jobs <jobs.json>
#
# The jobs file is a list of {key, src, dst, w, h}. The output is always a
# JPEG next to the job's `dst`; a source that cannot be read is reported
# and the job is skipped (the build then falls back to the original file).

param(
  [Parameter(Mandatory = $true)][string]$Jobs
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$jobList = Get-Content -Raw -LiteralPath $Jobs | ConvertFrom-Json

$jpegCodec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() |
  Where-Object { $_.MimeType -eq 'image/jpeg' }

$failed = @()
$written = 0

foreach ($job in $jobList) {
  try {
    if (-not (Test-Path -LiteralPath $job.src)) {
      throw "source not found: $($job.src)"
    }
    $dir = Split-Path -Parent $job.dst
    if (-not (Test-Path -LiteralPath $dir)) {
      New-Item -ItemType Directory -Path $dir -Force | Out-Null
    }

    $src = [System.Drawing.Image]::FromFile($job.src)
    try {
      $w = [int]$job.w
      $h = [int]$job.h
      # Cover crop: fill the box, cropping the long edge evenly.
      $scale = [Math]::Max($w / $src.Width, $h / $src.Height)
      $sw = [Math]::Max(1, [int][Math]::Ceiling($w / $scale))
      $sh = [Math]::Max(1, [int][Math]::Ceiling($h / $scale))
      $sx = [int][Math]::Floor(($src.Width - $sw) / 2)
      $sy = [int][Math]::Floor(($src.Height - $sh) / 2)

      $bmp = New-Object System.Drawing.Bitmap($w, $h)
      try {
        $g = [System.Drawing.Graphics]::FromImage($bmp)
        try {
          $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
          $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
          # JPEG has no alpha: clear to white so a transparent source does
          # not turn black.
          $g.Clear([System.Drawing.Color]::White)
          $g.DrawImage(
            $src,
            (New-Object System.Drawing.Rectangle(0, 0, $w, $h)),
            $sx, $sy, $sw, $sh,
            [System.Drawing.GraphicsUnit]::Pixel
          )
        } finally {
          $g.Dispose()
        }

        $params = New-Object System.Drawing.Imaging.EncoderParameters(1)
        $params.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter(
          [System.Drawing.Imaging.Encoder]::Quality, 82
        )
        $bmp.Save($job.dst, $jpegCodec, $params)
      } finally {
        $bmp.Dispose()
      }
    } finally {
      $src.Dispose()
    }
    $written++
  } catch {
    $failed += "$($job.key): $($_.Exception.Message)"
  }
}

foreach ($f in $failed) {
  Write-Output "FAILED $f"
}
Write-Output "resized $written/$($jobList.Count) images"

if ($failed.Count -gt 0) {
  exit 1
}
