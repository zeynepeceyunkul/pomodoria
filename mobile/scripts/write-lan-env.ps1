# Writes mobile/.env with EXPO_PUBLIC_API_URL for Expo Go on the same Wi-Fi as this PC.
$ErrorActionPreference = 'Stop'
$mobileRoot = Split-Path $PSScriptRoot -Parent
$envFile = Join-Path $mobileRoot '.env'

if (-not (Test-Path (Join-Path $mobileRoot 'package.json'))) {
  Write-Host '[write-lan-env] Run this script from the mobile project (scripts/ under mobile).'
  exit 1
}

$ip = $null
try {
  $candidates = Get-NetIPAddress -AddressFamily IPv4 |
    Where-Object {
      $_.IPAddress -notlike '127.*' -and
      $_.IPAddress -notlike '169.254.*' -and
      $_.IPAddress -notlike '192.168.56.*'
    }
  # Prefer real Wi-Fi over virtual adapters (VirtualBox, Hyper-V, etc.)
  $wifi = $candidates | Where-Object { $_.InterfaceAlias -match 'Wi-?Fi|Wireless' } | Sort-Object InterfaceMetric | Select-Object -First 1
  if ($wifi) {
    $ip = $wifi.IPAddress
  } else {
    $ip = $candidates | Sort-Object InterfaceMetric | Select-Object -First 1 -ExpandProperty IPAddress
  }
} catch {}

if (-not $ip) {
  Write-Host '[write-lan-env] Could not detect LAN IPv4. Set EXPO_PUBLIC_API_URL manually in mobile/.env'
  exit 1
}

$line = "EXPO_PUBLIC_API_URL=http://${ip}:5000"
Set-Content -Path $envFile -Value $line -Encoding utf8
Write-Host "[write-lan-env] Wrote $envFile"
Write-Host "            $line"
Write-Host ''
Write-Host 'Sonraki adimlar:'
Write-Host '  1) Backend: cd ..\backend  ->  npm start'
Write-Host '  2) Mobil:   bu klasorde   ->  npm run go'
Write-Host '  3) Expo Go ile QR kodu okut (telefon bu Wi-Fi''de olsun).'
