# Writes LAN URLs for backend/.env (email links that work on phone + PC).
$ErrorActionPreference = 'Stop'
$backendRoot = Split-Path $PSScriptRoot -Parent
$envExample = Join-Path $backendRoot '.env.example'
$envFile = Join-Path $backendRoot '.env'

$ip = $null
try {
  $candidates = Get-NetIPAddress -AddressFamily IPv4 |
    Where-Object {
      $_.IPAddress -notlike '127.*' -and
      $_.IPAddress -notlike '169.254.*' -and
      $_.IPAddress -notlike '192.168.56.*'
    }
  $wifi = $candidates | Where-Object { $_.InterfaceAlias -match 'Wi-?Fi|Wireless' } | Sort-Object InterfaceMetric | Select-Object -First 1
  if ($wifi) { $ip = $wifi.IPAddress }
  else { $ip = $candidates | Sort-Object InterfaceMetric | Select-Object -First 1 -ExpandProperty IPAddress }
} catch {}

if (-not $ip) {
  Write-Host '[write-lan-env] Could not detect LAN IP. Edit backend/.env manually.'
  exit 1
}

$appUrl = "http://${ip}:5173"
$apiUrl = "http://${ip}:5000"
$expoUrl = "exp://${ip}:8081"

function Upsert-EnvLine($path, $key, $value) {
  $lines = @()
  if (Test-Path $path) { $lines = Get-Content $path }
  $found = $false
  $out = foreach ($line in $lines) {
    if ($line -match "^\s*$key\s*=") {
      $found = $true
      "$key=$value"
    } else { $line }
  }
  if (-not $found) { $out += "$key=$value" }
  Set-Content -Path $path -Value $out -Encoding utf8
}

if (-not (Test-Path $envFile)) {
  if (Test-Path $envExample) { Copy-Item $envExample $envFile }
  else { New-Item -Path $envFile -ItemType File | Out-Null }
}

Upsert-EnvLine $envFile 'APP_PUBLIC_URL' $appUrl
Upsert-EnvLine $envFile 'API_PUBLIC_URL' $apiUrl
Upsert-EnvLine $envFile 'EXPO_DEV_URL' $expoUrl
Upsert-EnvLine $envFile 'MOBILE_APP_SCHEME' 'pomodoria'

Write-Host "[write-lan-env] Updated $envFile"
Write-Host "  APP_PUBLIC_URL=$appUrl   (web - run: cd frontend-web; npm run dev)"
Write-Host "  API_PUBLIC_URL=$apiUrl   (email open links)"
Write-Host "  EXPO_DEV_URL=$expoUrl    (Expo Go deep links)"
Write-Host ''
Write-Host 'Restart backend after changing .env, then request a new reset email.'
