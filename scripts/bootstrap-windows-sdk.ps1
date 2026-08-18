$projectRoot = Split-Path -Parent $PSScriptRoot
$cacheRoot = Join-Path $projectRoot '.cache\windows-sdk'
$tempRoot = Join-Path $projectRoot '.cache\temp'
$version = '10.0.28000.2270'

$env:TEMP = $tempRoot
$env:TMP = $tempRoot
New-Item -ItemType Directory -Force -Path $cacheRoot, $tempRoot | Out-Null

function Install-NuGetArchive {
  param(
    [Parameter(Mandatory)] [string]$PackageId,
    [Parameter(Mandatory)] [string]$DestinationName
  )

  $archive = Join-Path $cacheRoot "$PackageId.$version.nupkg"
  $destination = Join-Path $cacheRoot $DestinationName
  if (Test-Path -LiteralPath $destination) {
    return
  }

  Invoke-WebRequest `
    -UseBasicParsing `
    -Uri "https://www.nuget.org/api/v2/package/$PackageId/$version" `
    -OutFile $archive
  New-Item -ItemType Directory -Force -Path $destination | Out-Null
  & tar -xf $archive -C $destination
  if ($LASTEXITCODE -ne 0) {
    throw "Failed to extract $PackageId"
  }
}

Install-NuGetArchive -PackageId 'Microsoft.Windows.SDK.CPP' -DestinationName "$version-common"
Install-NuGetArchive -PackageId 'Microsoft.Windows.SDK.CPP.x64' -DestinationName "$version-x64"

Write-Host "Project-local Windows SDK is ready in $cacheRoot"

