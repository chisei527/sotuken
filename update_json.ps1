$formulaMap = @{
    "30" = "formula_4"; "31" = "formula_5"; "32" = "formula_6"; "33" = "formula_7"; "34" = "formula_8";
    "35" = "formula_1"; "36" = "formula_4"; "37" = "formula_4"; "38" = "formula_5"; "39" = "formula_6";
    "40" = "formula_3"; "41" = "formula_1"; "42" = "formula_4"; "43" = "formula_8"
}

Get-ChildItem -Path "problems" -Filter "*.json" | Where-Object { $_.BaseName -as [int] -ge 30 -and $_.BaseName -as [int] -le 43 } | ForEach-Object {
    $path = $_.FullName
    $json = Get-Content $path -Raw | ConvertFrom-Json
    $fileName = $_.BaseName
    $formulaX = $formulaMap[$fileName]

    $json.requiredBlocks = @('PLACEHOLDER_REPLACE', 'PLACEHOLDER_CONCLUSION')

    if ($json.answerState.blocks.blocks) {
        foreach ($block in $json.answerState.blocks.blocks) {
            if ($block.type -eq "proof_step") {
                $ops = @{
                    type = "replace_operation"
                    value = @{ type = "custom_number"; value = 1 }
                    formula = @{ type = $formulaX }
                    replacement = @{ type = "custom_number"; value = 1 }
                    next = @{
                        type = "conclusion_operation"
                        value = @{ type = "custom_number"; value = 1 }
                    }
                }
                
                # Use Add-Member to ensure the property is set even if it doesn't exist
                if ($null -eq $block.operations) {
                    Add-Member -InputObject $block -NotePropertyName "operations" -NotePropertyValue $ops -Force
                } else {
                    $block.operations = $ops
                }
            }
        }
    }

    $jsonText = $json | ConvertTo-Json -Depth 100
    $jsonText = $jsonText -replace '"PLACEHOLDER_REPLACE"', '"\"type\":\"replace_operation\""'
    $jsonText = $jsonText -replace '"PLACEHOLDER_CONCLUSION"', '"\"type\":\"conclusion_operation\""'
    [IO.File]::WriteAllText($path, $jsonText)
    Write-Host "Updated $($_.Name)"
}
