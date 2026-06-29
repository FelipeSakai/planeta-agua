$ErrorActionPreference = "Stop"

$proxyUrl = "http://127.0.0.1:8787"
$openAiBaseUrl = "$proxyUrl/v1"
$containerName = "headroom-proxy"
$imageName = "ghcr.io/chopratejas/headroom:latest"

docker version | Out-Null

function Test-HeadroomReady {
  try {
    $response = Invoke-RestMethod -Uri "$proxyUrl/health" -TimeoutSec 2
    return $response.ready -eq $true
  } catch {
    return $false
  }
}

if (-not (Test-HeadroomReady)) {
  $existingContainer = docker ps -a --filter "name=^/$containerName$" --format "{{.Names}}"
  if ($existingContainer -eq $containerName) {
    docker start $containerName | Out-Null
  } else {
    docker run -d `
      --name $containerName `
      -p 8787:8787 `
      -e HEADROOM_TELEMETRY=off `
      $imageName | Out-Null
  }

  $ready = $false
  for ($i = 0; $i -lt 40; $i++) {
    Start-Sleep -Milliseconds 500
    if (Test-HeadroomReady) {
      $ready = $true
      break
    }
  }

  if (-not $ready) {
    docker logs --tail 80 $containerName
    throw "Headroom Docker proxy did not become ready."
  }
}

$env:OPENAI_BASE_URL = $openAiBaseUrl
$env:ANTHROPIC_BASE_URL = $proxyUrl

opencode @args
