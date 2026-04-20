function num($n) { return @{type='custom_number'; fields=@{NUM=$n}} }
$pi4 = @{type='term_pi_quarter'}
function sinOf($arg) { return @{type='term_sin_of'; inputs=@{ANGLE=@{block=$arg}}} }
function cosOf($arg) { return @{type='term_cos_of'; inputs=@{ANGLE=@{block=$arg}}} }
function tanOf($arg) { return @{type='term_tan_of'; inputs=@{ANGLE=@{block=$arg}}} }
function square($a) { return @{type='math_square'; inputs=@{A=@{block=$a}}} }
function add($a, $b) { return @{type='math_add'; inputs=@{A=@{block=$a}; B=@{block=$b}}} }
function frac($n, $d) { return @{type='math_fraction'; inputs=@{NUMERATOR=@{block=$n}; DENOMINATOR=@{block=$d}}} }

$A = tanOf($pi4)
$B = frac(sinOf($pi4), cosOf($pi4))
$C = add(square(sinOf($pi4)), square(cosOf($pi4)))
$D = num(1)
$E = add(num(1), square(tanOf(num(0))))
$F = frac(num(1), square(cosOf(num(0))))
$G = add(square(sinOf(num(0))), square(cosOf(num(0))))

$mappings = @{
    1 = @(2, 1); 2 = @(2, 1); 3 = @(2, 1); 4 = @(2); 5 = @(2); 
    6 = @(3); 7 = @(2, 1); 8 = @(1); 9 = @(1); 10 = @(1, 3)
}

foreach ($i in 1..10) {
    $path = "problems/$i.json"
    if (-not (Test-Path $path)) { continue }
    $content = Get-Content $path -Raw
    $json = $content | ConvertFrom-Json
    
    $ops = @()
    $currentVal = $null
    
    $seq = $mappings[$i]
    foreach ($formulaNum in $seq) {
        $op = @{type="replace_operation"; inputs=@{}}
        if ($formulaNum -eq 2) {
            $op.inputs.VALUE = @{block=$A}
            $op.inputs.FORMULA = @{block=@{type="formula_2"}}
            $op.inputs.REPLACEMENT = @{block=$B}
            $currentVal = $B
        } elseif ($formulaNum -eq 1) {
            $valBefore = if ($currentVal) { $currentVal } else { $D }
            $op.inputs.VALUE = @{block=$valBefore}
            $op.inputs.FORMULA = @{block=@{type="formula_1"}}
            $op.inputs.REPLACEMENT = @{block=$C}
            $currentVal = $C
        } elseif ($formulaNum -eq 3) {
            if ($i -eq 10) { # [1, 3] G -> F
                $op.inputs.VALUE = @{block=$G}
                $op.inputs.FORMULA = @{block=@{type="formula_3"}}
                $op.inputs.REPLACEMENT = @{block=$F}
            } else { # [3] E -> F
                $op.inputs.VALUE = @{block=$E}
                $op.inputs.FORMULA = @{block=@{type="formula_3"}}
                $op.inputs.REPLACEMENT = @{block=$F}
            }
            $currentVal = $F
        }
        $ops += $op
    }

    $ops += @{type="common_denominator_operation"; inputs=@{
        VALUE = @{block=$currentVal}
        REPLACEMENT = @{block=$currentVal}
    }}
    $ops += @{type="conclusion_operation"; inputs=@{
        VALUE = @{block=$currentVal}
    }}

    for ($j = 0; $j -lt $ops.Count - 1; $j++) {
        $ops[$j].next = @{block=$ops[$j+1]}
    }

    # Find proof_step block in answerState.blocks.blocks
    $found = $false
    foreach ($b in $json.answerState.blocks.blocks) {
        if ($b.type -eq "proof_step") {
            if (-not $b.inputs) { $b | Add-Member -MemberType NoteProperty -Name "inputs" -Value @{} }
            if (-not $b.inputs.OPERATIONS) { 
                # Use a intermediate hash to set the property if it doesn't support direct assign
                $b.inputs = [PSCustomObject]@{ OPERATIONS = @{ block = $ops[0] } }
            } else {
                $b.inputs.OPERATIONS = @{ block = $ops[0] }
            }
            $found = $true
        }
    }

    if (-not $found) {
         # Add proof_step block if missing? Instructions say rebuild, implying it exists.
    }

    $jsonString = ConvertTo-Json $json -Depth 100
    [System.IO.File]::WriteAllText($path, $jsonString, [System.Text.Encoding]::UTF8)
}

# Validation
$summary = foreach ($i in 1..10) {
    $path = "problems/$i.json"
    $json = Get-Content $path -Raw | ConvertFrom-Json
    
    $psBlock = $json.answerState.blocks.blocks | Where-Object { $_.type -eq "proof_step" }
    $firstOp = $psBlock.inputs.OPERATIONS.block
    
    $replaceCount = 0
    $curr = $firstOp
    $missingInput = $false
    $hasFields = $false
    while ($curr) {
        if ($curr.type -eq "replace_operation") {
            $replaceCount++
            if (-not ($curr.inputs.VALUE -and $curr.inputs.FORMULA -and $curr.inputs.REPLACEMENT)) { $missingInput = $true }
        } elseif ($curr.type -eq "common_denominator_operation") {
            if (-not ($curr.inputs.VALUE -and $curr.inputs.REPLACEMENT)) { $missingInput = $true }
        }
        
        foreach ($key in $curr.inputs.PSObject.Properties.Name) {
            $blk = $curr.inputs.$key.block
            if ($blk.fields -and $blk.type -ne "custom_number") { $hasFields = $true }
        }
        $curr = $curr.next.block
    }

    [PSCustomObject]@{
        File = "$i.json"
        Replaces = $replaceCount
        InputsOk = -not $missingInput
        NoFieldsOk = -not $hasFields
        OpsExist = ($firstOp -ne $null)
    }
}
$summary | Format-Table
