$ErrorActionPreference = 'Stop'
Set-Location 'X:\Development\SIMBA\MOBILE_APP_REACT_NATIVE'

function Move-ScreenImplementation {
  param(
    [string]$Folder,
    [string]$Implementation,
    [string]$Route,
    [ValidateSet('Root','Settings')][string]$Stack = 'Root'
  )
  $sourceDir = Join-Path (Get-Location) "src\screens\$Folder"
  $componentsDir = Join-Path $sourceDir 'components'
  $typesDir = Join-Path $sourceDir 'types'
  New-Item -ItemType Directory -Force $componentsDir | Out-Null
  New-Item -ItemType Directory -Force $typesDir | Out-Null
  $rootPath = Join-Path $sourceDir "$Implementation.tsx"
  $componentPath = Join-Path $componentsDir "$Implementation.tsx"
  if (Test-Path $rootPath) { Move-Item -Force $rootPath $componentPath }
  if (Test-Path $componentPath) {
    $text = [System.IO.File]::ReadAllText($componentPath)
    $text = $text.Replace("from '../../", "from '../../../")
    $text = $text.Replace("from './hooks/", "from '../hooks/")
    $text = $text.Replace("from './browse/", "from '../browse/")
    $text = $text.Replace("from './components/", "from '../components/")
    $text = $text.Replace("from '../../navigation/types'", "from '../types'")
    $text = $text.Replace("from '../../../navigation/types'", "from '../types'")
    [System.IO.File]::WriteAllText($componentPath, $text, [System.Text.UTF8Encoding]::new($false))
  }
  if ($Stack -eq 'Root') {
    $typesText = "import type {RootStackScreenProps} from '../../../navigation/types';`r`n`r`nexport type ${Implementation}Props = RootStackScreenProps<'$Route'>;`r`n"
  } else {
    $typesText = "import type {${Implementation}Props as Navigation${Implementation}Props} from '../../../navigation/types';`r`n`r`nexport type ${Implementation}Props = Navigation${Implementation}Props;`r`n"
  }
  [System.IO.File]::WriteAllText((Join-Path $typesDir 'index.ts'), $typesText, [System.Text.UTF8Encoding]::new($false))
  $indexText = "export {${Implementation} as default, ${Implementation}} from './components/${Implementation}';`r`nexport type {${Implementation}Props} from './types';`r`n"
  [System.IO.File]::WriteAllText((Join-Path $sourceDir 'index.tsx'), $indexText, [System.Text.UTF8Encoding]::new($false))
}

Move-ScreenImplementation -Folder 'FolderLinkingWizard' -Implementation 'FolderLinkingWizard' -Route 'FolderLinkingWizard' -Stack 'Settings'
Move-ScreenImplementation -Folder 'ShowsScreen' -Implementation 'ShowsScreen' -Route 'ShowsScreen' -Stack 'Root'
Move-ScreenImplementation -Folder 'Library' -Implementation 'ArtistDetailScreen' -Route 'ArtistDetail' -Stack 'Root'
Move-ScreenImplementation -Folder 'Library' -Implementation 'AlbumDetailScreen' -Route 'AlbumDetail' -Stack 'Root'

foreach($pair in @(@('RadioScreenNew','RadioFavoritesScreen','RadioFavoritesScreen'),@('LiveTVScreenNew','LiveTVFavoritesScreen','LiveTVFavoritesScreen'))){
  $folder=$pair[0]; $implementation=$pair[1]; $route=$pair[2]; $sourceDir=Join-Path (Get-Location) "src\screens\$folder"; $componentsDir=Join-Path $sourceDir 'components'; New-Item -ItemType Directory -Force $componentsDir | Out-Null; $rootPath=Join-Path $sourceDir "$implementation.tsx"; $componentPath=Join-Path $componentsDir "$implementation.tsx"; if(Test-Path $rootPath){Move-Item -Force $rootPath $componentPath}; if(Test-Path $componentPath){$text=[System.IO.File]::ReadAllText($componentPath); $text=$text.Replace("from '../../","from '../../../"); $text=$text.Replace("from './components/","from '../components/"); $text=$text.Replace("from '../../../navigation/types'","from '../types'"); [System.IO.File]::WriteAllText($componentPath,$text,[System.Text.UTF8Encoding]::new($false))}}

# Move the NowPlaying copy resource out of the screen root.
$nowPlayingDir=Join-Path (Get-Location) 'src\screens\NowPlaying'; $relatedDir=Join-Path $nowPlayingDir 'related'; New-Item -ItemType Directory -Force $relatedDir | Out-Null; $nowText=Join-Path $nowPlayingDir 'textContent.ts'; if(Test-Path $nowText){Move-Item -Force $nowText (Join-Path $relatedDir 'textContent.ts')}

# Move Library detail copy resources into the existing related boundary.
$libraryDir=Join-Path (Get-Location) 'src\screens\Library'; $libraryRelated=Join-Path $libraryDir 'related'; New-Item -ItemType Directory -Force $libraryRelated | Out-Null; foreach($name in @('textContent.ts','albumDetailTextContent.ts','artistDetailTextContent.ts')){ $p=Join-Path $libraryDir $name; if(Test-Path $p){Move-Item -Force $p (Join-Path $libraryRelated $name)}}

# Preserve public multi-screen exports.
[System.IO.File]::WriteAllText((Join-Path (Get-Location) 'src\screens\Library\index.tsx'), "export {LibraryScreen} from './components/LibraryScreenContent';`r`nexport {ArtistDetailScreen} from './components/ArtistDetailScreen';`r`nexport {AlbumDetailScreen} from './components/AlbumDetailScreen';`r`n", [System.Text.UTF8Encoding]::new($false))
[System.IO.File]::WriteAllText((Join-Path (Get-Location) 'src\screens\RadioScreenNew\index.tsx'), "export {RadioScreenNew} from './components/RadioContent';`r`nexport {RadioFavoritesScreen} from './components/RadioFavoritesScreen';`r`n", [System.Text.UTF8Encoding]::new($false))
[System.IO.File]::WriteAllText((Join-Path (Get-Location) 'src\screens\LiveTVScreenNew\index.tsx'), "export {LiveTVScreenNew} from './components/LiveTVContent';`r`nexport {LiveTVFavoritesScreen} from './components/LiveTVFavoritesScreen';`r`n", [System.Text.UTF8Encoding]::new($false))

# Rewire all known navigator implementation imports to public folder boundaries.
$navFiles=@('src\navigation\RootNavigator.tsx','src\navigation\SettingsStack.tsx'); foreach($navFile in $navFiles){$p=Join-Path (Get-Location) $navFile; if(Test-Path $p){$text=[System.IO.File]::ReadAllText($p); $repls=@{
"../screens/Library/ArtistDetailScreen"='../screens/Library';
"../screens/Library/AlbumDetailScreen"='../screens/Library';
"../screens/RadioScreenNew/RadioFavoritesScreen"='../screens/RadioScreenNew';
"../screens/LiveTVScreenNew/LiveTVFavoritesScreen"='../screens/LiveTVScreenNew';
"../screens/ShowsScreen/ShowsScreen"='../screens/ShowsScreen';
"../screens/FolderLinkingWizard/FolderLinkingWizard"='../screens/FolderLinkingWizard'
}; foreach($key in $repls.Keys){$text=$text.Replace($key,$repls[$key])}; [System.IO.File]::WriteAllText($p,$text,[System.Text.UTF8Encoding]::new($false))}}

Write-Output 'Final safe screen architecture cleanup applied.'
