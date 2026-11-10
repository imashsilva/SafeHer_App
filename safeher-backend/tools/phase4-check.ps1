$base = 'http://127.0.0.1:8000'
try {
  $health = Invoke-RestMethod "$base/health"
  Write-Host 'Backend health:' ($health | ConvertTo-Json -Compress)
  $openapi = Invoke-RestMethod "$base/openapi.json"
  $paths = @('/api/v1/me','/api/v1/appointments','/api/v1/credits','/api/v1/preferences')
  foreach ($p in $paths) {
    $exists = $null -ne $openapi.paths.PSObject.Properties[$p]
    Write-Host "$p : $exists"
  }
} catch {
  Write-Host 'Could not reach FastAPI. Start uvicorn first.'
  exit 1
}
