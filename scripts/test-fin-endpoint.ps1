# Script para testear el endpoint de Fin (PowerShell)
# Uso: .\scripts\test-fin-endpoint.ps1 [URL]

param(
    [string]$Url = "http://localhost:3000"
)

# IMPORTANT: Replace with your actual FIN_API_TOKEN from .env.local
$Token = $env:FIN_API_TOKEN
if (-not $Token) {
    Write-Host "ERROR: FIN_API_TOKEN not found. Set it with:" -ForegroundColor Red
    Write-Host '$env:FIN_API_TOKEN = "your-token-here"' -ForegroundColor Yellow
    exit 1
}

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "🧪 TESTING FIN ENDPOINT" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "URL: $Url"
Write-Host ""

# Test 1: Debug endpoint (GET)
Write-Host "📋 Test 1: Debug Endpoint (GET)" -ForegroundColor Yellow
Write-Host "-----------------------------------------"
try {
    $response = Invoke-RestMethod -Uri "$Url/api/fin/debug" -Method Get
    $response | ConvertTo-Json -Depth 10
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
}
Write-Host ""
Write-Host ""

# Test 2: Debug endpoint (POST con token)
Write-Host "📋 Test 2: Debug Endpoint (POST con Authorization)" -ForegroundColor Yellow
Write-Host "-----------------------------------------"
try {
    $headers = @{
        "Authorization" = "Bearer $Token"
        "Content-Type" = "application/json"
    }
    $body = @{
        from = "test@example.com"
        subject = "Test"
        body = "Test body"
        thread_id = "test-123"
        has_attachments = $false
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "$Url/api/fin/debug" -Method Post -Headers $headers -Body $body
    $response | ConvertTo-Json -Depth 10
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
}
Write-Host ""
Write-Host ""

# Test 3: Classify endpoint sin auth (debe dar 401)
Write-Host "📋 Test 3: Classify Endpoint SIN Authorization (debe dar 401)" -ForegroundColor Yellow
Write-Host "-----------------------------------------"
try {
    $body = @{
        from = "test@example.com"
        subject = "Test"
        body = "Test"
        thread_id = "test-123"
        has_attachments = $false
    } | ConvertTo-Json

    Invoke-RestMethod -Uri "$Url/api/fin/classify-and-route" -Method Post -Body $body -ContentType "application/json"
    Write-Host "❌ ERROR: Esperaba 401, pero no hubo error" -ForegroundColor Red
} catch {
    if ($_.Exception.Response.StatusCode -eq 401) {
        Write-Host "✅ CORRECTO: Devuelve 401 sin auth" -ForegroundColor Green
    } else {
        Write-Host "❌ ERROR: Esperaba 401, recibió $($_.Exception.Response.StatusCode)" -ForegroundColor Red
    }
}
Write-Host ""
Write-Host ""

# Test 4: Classify endpoint CON auth (debe dar 200)
Write-Host "📋 Test 4: Classify Endpoint CON Authorization (debe dar 200)" -ForegroundColor Yellow
Write-Host "-----------------------------------------"
try {
    $headers = @{
        "Authorization" = "Bearer $Token"
        "Content-Type" = "application/json"
    }
    $body = @{
        from = "test@example.com"
        subject = "Presupuesto mecanizado"
        body = "Necesito cotización para 100 piezas"
        thread_id = "test-123"
        has_attachments = $false
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "$Url/api/fin/classify-and-route" -Method Post -Headers $headers -Body $body
    Write-Host "✅ CORRECTO: Devuelve 200 con auth" -ForegroundColor Green
    Write-Host "Response:"
    $response | ConvertTo-Json -Depth 10
} catch {
    Write-Host "❌ ERROR: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
}
Write-Host ""
Write-Host ""

# Test 5: Classify endpoint con token INCORRECTO (debe dar 401)
Write-Host "📋 Test 5: Classify Endpoint con Token INCORRECTO (debe dar 401)" -ForegroundColor Yellow
Write-Host "-----------------------------------------"
try {
    $headers = @{
        "Authorization" = "Bearer WRONG_TOKEN"
        "Content-Type" = "application/json"
    }
    $body = @{
        from = "test@example.com"
        subject = "Test"
        body = "Test"
        thread_id = "test-123"
        has_attachments = $false
    } | ConvertTo-Json

    Invoke-RestMethod -Uri "$Url/api/fin/classify-and-route" -Method Post -Headers $headers -Body $body
    Write-Host "❌ ERROR: Esperaba 401, pero no hubo error" -ForegroundColor Red
} catch {
    if ($_.Exception.Response.StatusCode -eq 401) {
        Write-Host "✅ CORRECTO: Devuelve 401 con token incorrecto" -ForegroundColor Green
    } else {
        Write-Host "❌ ERROR: Esperaba 401, recibió $($_.Exception.Response.StatusCode)" -ForegroundColor Red
    }
}
Write-Host ""
Write-Host ""

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "✨ Tests completados" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
