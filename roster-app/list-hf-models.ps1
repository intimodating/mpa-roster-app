# list-hf-models.ps1
# This script lists models your Hugging Face API token can access.

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

# Make a request to the /api/models endpoint
try {
    Write-Host "`nFetching list of models accessible to your account..."
    $response = Invoke-WebRequest -Method Get `
        -Uri "https://huggingface.co/api/models?sort=downloads&full=true" `
        -Headers @{ "Authorization" = "Bearer $hfApiKey" } `
        -UseBasicParsing # UseBasicParsing for simpler output

    Write-Host "`n--- API Models List ---"
    $models = $response.Content | ConvertFrom-Json

    if ($models.Count -gt 0) {
        Write-Host "Total models found: $($models.Count)"
        # Filter and display only Gemini or Mistral related models for brevity
        $filteredModels = $models | Where-Object { $_.modelId -like "*gemini*" -or $_.modelId -like "*mistral*" -or $_.modelId -like "*gemma*" -or $_.modelId -like "*zephyr*" }
        
        if ($filteredModels.Count -gt 0) {
            Write-Host "Relevant models found (modelId and pipeline_tag):"
            $filteredModels | ForEach-Object {
                Write-Host "  Model ID: $($_.modelId)"
                Write-Host "  Pipeline Tag: $($_.pipeline_tag)"
                Write-Host "  Can do text-generation: $(if ($_.pipeline_tag -eq 'text-generation') { $true } else { $false })"
                Write-Host "---"
            }
        } else {
            Write-Host "No relevant models (Gemini, Mistral, Gemma, Zephyr) found accessible to your token."
        }
    } else {
        Write-Host "No models listed as accessible to your token."
    }

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
