# Creates a "Codex Splash" shortcut on the desktop that starts Codex with the splash animation.
$dir = Split-Path -Parent $MyInvocation.MyCommand.Path
$codex = (Get-AppxPackage OpenAI.Codex | Select-Object -First 1).InstallLocation
$lnkPath = Join-Path ([Environment]::GetFolderPath('Desktop')) 'Codex Splash.lnk'

$sh = New-Object -ComObject WScript.Shell
$lnk = $sh.CreateShortcut($lnkPath)
$lnk.TargetPath = "$env:WINDIR\System32\wscript.exe"
$lnk.Arguments = "`"$dir\launch.vbs`""
$lnk.WorkingDirectory = $dir
if ($codex) { $lnk.IconLocation = "$codex\app\ChatGPT.exe,0" }
$lnk.Description = 'Codex with personalized splash'
$lnk.Save()
Write-Output "Created $lnkPath"
