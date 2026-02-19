# test-hf-token.ps1
# This script tests the validity of your Hugging Face API token for Inference API access.

# Read API Key from .env.local
$envContent = Get-Content -Path ".\.env.local"
$hfApiKeyLine = $envContent | Select-String -Pattern "HUGGINGFACE_API_KEY="
if ($hfApiKeyLine) {
    $hfApiKey = ($hfApiKeyLine.ToString() -split "=")[1].Trim().Trim('"')
    Write-Host "Using API Key (first five chars): $($hfApiKey.Substring(0,5))..."
} else {
    Write-Host "Error: HUGGINGFACE_API_KEY not found in .env.local"
    exit 1 # Exit with an error code
}

# Make a request to the /status endpoint
try {
    $response = Invoke-WebRequest -Method Get `
        -Uri "https://api-inference.huggingface.co/status" `
        -Headers @{ "Authorization" = "Bearer $hfApiKey" } `
        -UseBasicParsing # UseBasicParsing for simpler output

    Write-Host "`n--- API Status Response ---"
    Write-Host $response.Content
} catch {
    Write-Host "`n--- API Error ---"
    Write-Host $_.Exception.Message
    if ($_.Exception.Response) {
        $errorResponse = $_.Exception.Response
        Write-Host "Status Code: $($errorResponse.StatusCode)"
        Write-Host "Status Description: $($errorResponse.StatusDescription)"
        try {
            $errorContent = $errorResponse.GetResponseStream()
            $reader = New-Object System.IO.StreamReader($errorContent)
            $responseBody = $reader.ReadToEnd()
            Write-Host "Response Body: $responseBody"
        } catch {
            Write-Host "Could not read error response body."
        }
    }
}
