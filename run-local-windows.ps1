$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Root

$Models = @(
  "R4C3R/qwen2.5-0.5b-heretic",
  "huihui_ai/llama3.2-abliterate:1b"
)

Write-Host ""
Write-Host "PLQNX CORE - Local Text AI" -ForegroundColor Green
Write-Host "Using the Ollama models already installed on this Windows PC."
Write-Host ""

if (-not (Get-Command ollama -ErrorAction SilentlyContinue)) {
  Write-Host "Ollama was not found in PATH." -ForegroundColor Red
  Write-Host "Install/open Ollama for Windows, then run this file again."
  exit 1
}

$ollamaReady = $false
try {
  Invoke-RestMethod -Uri "http://127.0.0.1:11434/api/tags" -TimeoutSec 2 | Out-Null
  $ollamaReady = $true
} catch {}

if (-not $ollamaReady) {
  Write-Host "Starting Ollama..."
  Start-Process -FilePath "ollama" -ArgumentList "serve" -WindowStyle Hidden
  for ($i = 0; $i -lt 30; $i++) {
    Start-Sleep -Seconds 1
    try {
      Invoke-RestMethod -Uri "http://127.0.0.1:11434/api/tags" -TimeoutSec 2 | Out-Null
      $ollamaReady = $true
      break
    } catch {}
  }
}

if (-not $ollamaReady) {
  Write-Host "Ollama did not start on http://127.0.0.1:11434." -ForegroundColor Red
  exit 1
}

$list = (ollama list | Out-String)
$missing = @()
foreach ($model in $Models) {
  $base = $model.Split(":")[0]
  if ($list -notmatch [regex]::Escape($base)) {
    $missing += $model
  }
}

if ($missing.Count -gt 0) {
  Write-Host "Missing Ollama model(s):" -ForegroundColor Yellow
  foreach ($model in $missing) {
    Write-Host "  $model"
    Write-Host "  Run: ollama pull $model"
  }
  exit 1
}

Write-Host "Found both PLQNX models." -ForegroundColor Green

if (-not (Test-Path ".venv\Scripts\python.exe")) {
  Write-Host "Creating Python environment..."
  py -3 -m venv .venv
}

$Python = Join-Path $Root ".venv\Scripts\python.exe"

Write-Host "Installing/updating PLQNX Python dependencies..."
& $Python -m pip install -q --disable-pip-version-check -r requirements.txt

$env:OLLAMA_URL = "http://127.0.0.1:11434"

Write-Host "Warming PLQNX Fast..."
try {
  $body = @{
    model = "R4C3R/qwen2.5-0.5b-heretic"
    messages = @(@{ role = "user"; content = "Reply OK." })
    stream = $false
    keep_alive = "30m"
    options = @{ num_predict = 2; temperature = 0 }
  } | ConvertTo-Json -Depth 5
  Invoke-RestMethod -Uri "http://127.0.0.1:11434/api/chat" -Method Post -ContentType "application/json" -Body $body -TimeoutSec 120 | Out-Null
} catch {
  Write-Host "Warm-up skipped; PLQNX can still start." -ForegroundColor Yellow
}

Start-Process "https://jarvis369-max.github.io/plqnx-website/"
Write-Host ""
Write-Host "PLQNX public frontend: https://jarvis369-max.github.io/plqnx-website/" -ForegroundColor Green
Write-Host "Local AI bridge: http://127.0.0.1:3000" -ForegroundColor DarkGray
Write-Host "Keep this window open while using PLQNX."
Write-Host ""

& $Python -m uvicorn main:app --host 127.0.0.1 --port 3000
