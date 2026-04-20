function Fix-Block($block) {
    if ($null -eq $block) { return $null }
    if ($block -is [array]) {
        foreach ($b in $block) { Fix-Block $b }
        return
    }
    
    # Process inputs if they exist
    if ($block.inputs -is [PSCustomObject]) {
        foreach ($prop in $block.inputs.PSObject.Properties) {
            $inputVal = $prop.Value
            if ($prop.Name -eq "OPERATIONS" -and $inputVal -is [array]) {
                $ops = $inputVal
                if ($ops.Count -gt 0) {
                    for ($j = $ops.Count - 2; $j -ge 0; $j--) {
                        if (-not (Get-Member -InputObject $ops[$j] -Name "next")) {
                            $ops[$j] | Add-Member -MemberType NoteProperty -Name "next" -Value @{ block = $ops[$j+1] }
                        } else {
                            $ops[$j].next = @{ block = $ops[$j+1] }
                        }
                    }
                    $block.inputs.OPERATIONS = @{ block = $ops[0] }
                } else {
                    $block.inputs.OPERATIONS = @{ block = $null }
                }
            } else {
                # Recursively check nested blocks in inputs
                if ($null -ne $inputVal.block) {
                    Fix-Block $inputVal.block
                }
            }
        }
    }
    
    # Recursively check the "next" chain if it exists
    if ($null -ne $block.next.block) {
        Fix-Block $block.next.block
    }
}

for ($i = 1; $i -le 10; $i++) {
    $path = "problems/$i.json"
    if (Test-Path $path) {
        $json = Get-Content $path -Raw | ConvertFrom-Json
        if ($null -ne $json.answerState.blocks.blocks) {
            foreach ($block in $json.answerState.blocks.blocks) {
                Fix-Block $block
            }
            $json | ConvertTo-Json -Depth 100 | Out-File $path -Encoding utf8
            Write-Host "${i}: Processed blocks."
        }
    }
}
