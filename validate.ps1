$formulaMapping = @{
    1 = @("formula_2", "formula_1")
    2 = @("formula_2", "formula_1")
    3 = @("formula_2", "formula_1")
    4 = @("formula_2")
    5 = @("formula_2")
    6 = @("formula_3")
    7 = @("formula_2", "formula_1")
    8 = @("formula_1")
    9 = @("formula_1")
    10 = @("formula_1", "formula_3")
}

$expectedChains = @{
    1 = @("replace_operation", "replace_operation", "common_denominator_operation", "conclusion_operation")
    2 = @("replace_operation", "replace_operation", "common_denominator_operation", "conclusion_operation")
    3 = @("replace_operation", "replace_operation", "common_denominator_operation", "conclusion_operation")
    4 = @("replace_operation", "common_denominator_operation", "conclusion_operation")
    5 = @("replace_operation", "common_denominator_operation", "conclusion_operation")
    6 = @("replace_operation", "common_denominator_operation", "conclusion_operation")
    7 = @("replace_operation", "replace_operation", "common_denominator_operation", "conclusion_operation")
    8 = @("replace_operation", "common_denominator_operation", "conclusion_operation")
    9 = @("replace_operation", "common_denominator_operation", "conclusion_operation")
    10 = @("replace_operation", "replace_operation", "common_denominator_operation", "conclusion_operation")
}

for ($i = 1; $i -le 10; $i++) {
    $path = "problems/$i.json"
    $valid = $true
    $report = "File $i "
    try {
        $json = Get-Content $path -Raw | ConvertFrom-Json
        if (-not $json) { $valid = $false; $report += "Failed to parse JSON. " }
        
        $raw = Get-Content $path -Raw
        if ($raw -like '*"block": null*') { $valid = $false; $report += "Found 'block: null'. " }
        
        $blocks = $json.answerState.blocks.blocks
        $proof_step = $blocks | Where-Object { $_.type -eq "proof_step" }
        if (-not $proof_step) { $valid = $false; $report += "No proof_step. " }
        
        $actualChain = @()
        $curr = $proof_step.inputs.OPERATIONS.block
        while ($curr) {
            $actualChain += $curr.type
            $curr = $curr.next.block
        }
        
        $expected = $expectedChains[$i]
        if ($actualChain.Count -ne $expected.Count) {
             $valid = $false; $report += "Chain length mismatch: $($actualChain.Count) vs $($expected.Count). "
        } else {
            for ($j=0; $j -lt $expected.Count; $j++) {
                if ($actualChain[$j] -ne $expected[$j]) { $valid = $false; $report += "Chain mismatch at index $j ($($actualChain[$j]) vs $($expected[$j])). " }
            }
        }
        
        $reqF = $json.requiredFormulas
        $expF = $formulaMapping[$i]
        if ($reqF.Count -ne $expF.Count) { $valid = $false; $report += "RequiredFormulas count mismatch. " }
        else {
            for ($j=0; $j -lt $expF.Count; $j++) {
                if ($reqF[$j] -ne $expF[$j]) { $valid = $false; $report += "RequiredFormulas mismatch at $j. " }
            }
        }
    } catch {
        $valid = $false; $report += "Exception: $($_.Exception.Message)"
    }
    if ($valid) { Write-Host "$report OK" } else { Write-Host "$report FAILED" }
}
