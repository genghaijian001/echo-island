param(
  [Parameter(ValueFromRemainingArguments = $true)]
  [string[]]$Command
)

$projectRoot = Split-Path -Parent $PSScriptRoot
$cacheRoot = Join-Path $projectRoot '.cache'

# Import the existing MSVC/Windows SDK paths into this process only. Nothing is
# persisted and neither installation is modified.
$msvcToolsRoot = 'E:\Visual Studio 2026\VC\Tools\MSVC'
$localWindowsSdkLib = Join-Path $projectRoot '.cache\windows-sdk\10.0.28000.2270-x64\c'
$localWindowsSdkRoot = Join-Path $projectRoot '.cache\windows-sdk\10.0.28000.2270-common\c'
if (Test-Path -LiteralPath $msvcToolsRoot) {
  $msvcRoot = Get-ChildItem -LiteralPath $msvcToolsRoot -Directory |
    Where-Object { Test-Path -LiteralPath (Join-Path $_.FullName 'lib\x64\libcmt.lib') } |
    Sort-Object Name -Descending |
    Select-Object -First 1 -ExpandProperty FullName
  $localSdkVersion = if (Test-Path -LiteralPath (Join-Path $localWindowsSdkRoot 'Include')) {
    Get-ChildItem -LiteralPath (Join-Path $localWindowsSdkRoot 'Include') -Directory |
      Where-Object { Test-Path -LiteralPath (Join-Path $_.FullName 'um\Windows.h') } |
      Select-Object -First 1 -ExpandProperty Name
  }

  if ($msvcRoot -and $localSdkVersion -and (Test-Path -LiteralPath $localWindowsSdkLib)) {
    $env:LIB = @(
      (Join-Path $msvcRoot 'lib\x64'),
      (Join-Path $localWindowsSdkLib 'ucrt\x64'),
      (Join-Path $localWindowsSdkLib 'um\x64')
    ) -join ';'
    $localInclude = Join-Path $localWindowsSdkRoot "Include\$localSdkVersion"
    $env:INCLUDE = @(
      (Join-Path $msvcRoot 'include'),
      (Join-Path $localInclude 'ucrt'),
      (Join-Path $localInclude 'shared'),
      (Join-Path $localInclude 'um'),
      (Join-Path $localInclude 'winrt'),
      (Join-Path $localInclude 'cppwinrt')
    ) -join ';'
    $env:VCINSTALLDIR = 'E:\Visual Studio 2026\VC\'
    $env:VCToolsVersion = Split-Path $msvcRoot -Leaf
    $env:WindowsSdkDir = "$localWindowsSdkRoot\"
    $env:WindowsSDKVersion = "$localSdkVersion\"
    $env:Path = @(
      (Join-Path $msvcRoot 'bin\HostX64\x64'),
      (Join-Path $localWindowsSdkRoot "bin\$localSdkVersion\x64"),
      $env:Path
    ) -join ';'
  }
}

$env:CARGO_HOME = Join-Path $cacheRoot 'cargo-home'
$env:CARGO_TARGET_DIR = Join-Path $projectRoot 'src-tauri\target'
$env:npm_config_cache = Join-Path $cacheRoot 'npm'
$env:npm_config_prefix = Join-Path $cacheRoot 'npm-global'
$env:TEMP = Join-Path $cacheRoot 'temp'
$env:TMP = $env:TEMP

@($env:CARGO_HOME, $env:CARGO_TARGET_DIR, $env:npm_config_cache, $env:npm_config_prefix, $env:TEMP) |
  ForEach-Object { New-Item -ItemType Directory -Force -Path $_ | Out-Null }

if (-not $Command -or $Command.Count -eq 0) {
  throw 'Usage: with-local-cache.ps1 <command> [arguments...]'
}

$executable = $Command[0]
$arguments = if ($Command.Count -gt 1) { $Command[1..($Command.Count - 1)] } else { @() }
& $executable @arguments
exit $LASTEXITCODE
