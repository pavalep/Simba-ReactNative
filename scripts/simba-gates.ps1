# Runs the three release gates and reports each one's REAL exit code.
#
# Why this exists: `npx tsc --noEmit 2>&1 | Select-Object -First 10`
# followed by `echo $LASTEXITCODE` is a FALSE PASS. `Select-Object
# -First N` terminates the upstream pipeline as soon as it has N lines,
# which stops the native command from ever setting `$LASTEXITCODE` - so a
# run with 20 type errors printed `===TSC:0===` and looked clean.
#
# Capturing to a variable first means the native command runs to
# completion and `$LASTEXITCODE` is its own.
$ErrorActionPreference = 'Continue'

$tscOut = npx tsc --noEmit 2>&1
$tscCode = $LASTEXITCODE
$lintOut = npx eslint . --ext .ts,.tsx --max-warnings 0 2>&1
$lintCode = $LASTEXITCODE
$jestOut = npx jest 2>&1
$jestCode = $LASTEXITCODE

if ($tscOut) { Write-Output '--- tsc ---'; $tscOut | Select-Object -First 40 }
if ($lintOut) { Write-Output '--- eslint ---'; $lintOut | Select-Object -Last 25 }
Write-Output '--- jest (tail) ---'
$jestOut | Select-Object -Last 6

Write-Output "===TSC:$tscCode===ESLINT:$lintCode===JEST:$jestCode==="
if ($tscCode -ne 0 -or $lintCode -ne 0 -or $jestCode -ne 0) { exit 1 }
exit 0