foreach ($i in 1..10) {
    $path = "problems/$i.json"
    if (-not (Test-Path $path)) { continue }
    $json = Get-Content $path -Raw | ConvertFrom-Json
    
    $blocks = $json.answerState.blocks.blocks
    if ($null -eq $blocks -or $blocks.Count -eq 0) {
        $blocks = $json.initialState.blocks.blocks
    }
    
    $nonProofSteps = $blocks | Where-Object { $_.type -ne "proof_step" }
    if ($nonProofSteps.Count -lt 2) {
        Write-Host ("File {0}: Less than 2 non-proof_step blocks found." -f $i)
        continue
    }
    $targetBlock = $nonProofSteps[1]

    # Function to get all operations in a linked list starting from a block
    function Get-Ops($startBlock) {
        $ops = @()
        $curr = $startBlock
        while ($null -ne $curr) {
            $ops += $curr
            if ($null -ne $curr.next -and $null -ne $curr.next.block) {
                $curr = $curr.next.block
            } else {
                $curr = $null
            }
        }
        return $ops
    }

    $proofSteps = $json.answerState.blocks.blocks | Where-Object { $_.type -eq "proof_step" }
    foreach ($ps in $proofSteps) {
        if ($null -eq $ps.inputs.OPERATIONS.block) { continue }
        $ops = Get-Ops $ps.inputs.OPERATIONS.block

        $lastCD = $null
        $lastConc = $null
        foreach ($op in $ops) {
            if ($op.type -eq "common_denominator_operation") { $lastCD = $op }
            if ($op.type -eq "conclusion_operation") { $lastConc = $op }
        }

        if ($null -ne $lastCD) {
            $lastCD.inputs.VALUE.block = $targetBlock | ConvertTo-Json -Depth 20 | ConvertFrom-Json
            $lastCD.inputs.REPLACEMENT.block = $targetBlock | ConvertTo-Json -Depth 20 | ConvertFrom-Json
        }
        if ($null -ne $lastConc) {
            $lastConc.inputs.VALUE.block = $targetBlock | ConvertTo-Json -Depth 20 | ConvertFrom-Json
        }
    }

    $json | ConvertTo-Json -Depth 32 | Out-File $path -Encoding utf8
}
