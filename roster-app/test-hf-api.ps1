# test-hf-api.ps1
# This script tests connectivity to the Hugging Face Inference API for a specific model.

# Ensure you are in the roster-app directory when running this script.

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

# Define the model and endpoint
$hfModel = 'mistralai/Mistral-7B-Instruct-v0.2'
$hfInferenceApiUrl = "https://router.huggingface.co/models/$hfModel" # Switched to router.huggingface.co

# Define the body for the POST request
$body = @{ 
    inputs = "Hello, what is your name? Please respond concisely."
    parameters = @{
        max_new_tokens = 300;
        temperature = 0.3;
        do_sample = $true; # Explicitly enable sampling if needed, though default is usually fine
    }
} | ConvertTo-Json

# Make the POST request using Invoke-WebRequest
try {
    Write-Host "`nAttempting to call model: $hfModel at $hfInferenceApiUrl"
    $response = Invoke-WebRequest -Method Post `
        -Uri $hfInferenceApiUrl `
        -Headers @{ "Authorization" = "Bearer $hfApiKey"; "Content-Type" = "application/json" } `
        -Body $body `
        -UseBasicParsing # UseBasicParsing for simpler output

    Write-Host "`n--- API Response ---"
    $response.Content | ConvertFrom-Json # Pretty print JSON content
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
