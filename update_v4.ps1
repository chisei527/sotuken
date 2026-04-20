$mapping = @{
    1 = @(2, 1); 2 = @(2, 1); 3 = @(2, 1); 4 = @(2); 5 = @(2);
    6 = @(3); 7 = @(2, 1); 8 = @(1); 9 = @(1); 10 = @(1, 3)
}
$num1 = @{type='custom_number';fields=@{NUM=1}}
$term_sin = @{type='term_sin'}
$term_cos = @{type='term_cos'}
$term_tan = @{type='term_tan'}
function block_square($A) { @{type='math_square';inputs=@{A=@{block=$A}}} }
function block_add($A, $B) { @{type='math_add';inputs=@{A=@{block=$A};B=@{block=$B}}} }
function block_frac($N, $D) { @{type='math_fraction';inputs=@{NUMERATOR=@{block=$N};DENOMINATOR=@{block=$D}}} }
$formulas = @{
    1 = @{left=block_add (block_square $term_sin) (block_square $term_cos); right=$num1}
    2 = @{left=$term_tan; right=block_frac $term_sin $term_cos}
    3 = @{left=block_add $num1 (block_square $term_tan); right=block_frac $num1 (block_square $term_cos)}
}
foreach ($id in $mapping.Keys) {
    try {
        $p = "problems/$id.json"
        if (-not (Test-Path $p)) { continue }
        $json = Get-Content $p -Raw -Encoding UTF8 | ConvertFrom-Json
        $blocksChain = $json.answerState.blocks.blocks
        $proofBlock = $null
        foreach ($b in $blocksChain) {
            if ($b.type -eq 'proof_step') { $proofBlock = $b; break }
        }
        if ($null -eq $proofBlock) { continue }
        
        $ops = $proofBlock.inputs.OPERATIONS
        $finalExprBlock = $null
        if ($ops -ne $null) {
            foreach($op in $ops) {
              if ($op.type -eq 'conclusion_operation') {
                $finalExprBlock = $op.inputs.VALUE.block
              }
            }
        }
        
        $newOps = New-Object System.Collections.Generic.List[PSObject]
        foreach ($fId in $mapping[$id]) {
            $f = $formulas[$fId]
            $newOps.Add(@{ type="replace_operation"; inputs=@{ VALUE=@{block=$f.left}; FORMULA=@{type="formula_$fId"}; REPLACEMENT=@{block=$f.right} } })
            $newOps.Add(@{ type="conclusion_operation"; inputs=@{ VALUE=@{block=$f.right} } })
        }
        $newOps.Add(@{ type="common_denominator_operation"; inputs=@{ VALUE=@{block=$finalExprBlock}; REPLACEMENT=@{block=$finalExprBlock} } })
        $newOps.Add(@{ type="conclusion_operation"; inputs=@{ VALUE=@{block=$finalExprBlock} } })
        
        $proofBlock.inputs.OPERATIONS = $newOps
        $json.requiredBlocks = @('"type":"replace_operation"', '"type":"common_denominator_operation"', '"type":"conclusion_operation"')
        $json | ConvertTo-Json -Depth 100 | Out-File $p -Encoding UTF8
    } catch {
       Write-Host "Error in $id : $($_.Exception.Message)"
    }
}
