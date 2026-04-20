function New-Block {
    param($type, $inputs = $null, $next = $null, $fields = $null, $x = $null, $y = $null)
    $obj = [PSCustomObject]@{ type = $type }
    if ($fields) { $obj | Add-Member -MemberType NoteProperty -Name "fields" -Value $fields }
    if ($inputs) { $obj | Add-Member -MemberType NoteProperty -Name "inputs" -Value $inputs }
    if ($next) { $obj | Add-Member -MemberType NoteProperty -Name "next" -Value $next }
    if ($x -ne $null) { $obj | Add-Member -MemberType NoteProperty -Name "x" -Value $x }
    if ($y -ne $null) { $obj | Add-Member -MemberType NoteProperty -Name "y" -Value $y }
    return $obj
}

function New-Input {
    param($block)
    return [PSCustomObject]@{ block = $block }
}

function Clone-Block {
    param($block)
    if ($null -eq $block) { return $null }
    return $block | ConvertTo-Json -Depth 100 | ConvertFrom-Json
}

# Expressions
$pi4 = New-Block "term_pi_quarter"
$tan_pi4 = New-Block "term_tan_of" -inputs @{ VALUE = New-Input $pi4 } # A
$sin_pi4 = New-Block "term_sin_of" -inputs @{ VALUE = New-Input (Clone-Block $pi4) }
$cos_pi4 = New-Block "term_cos_of" -inputs @{ VALUE = New-Input (Clone-Block $pi4) }
$tan_expr = New-Block "math_fraction" -inputs @{ NUM = New-Input $sin_pi4; DENOM = New-Input $cos_pi4 } # B

$sin_sq = New-Block "math_square" -inputs @{ VALUE = New-Input (Clone-Block $sin_pi4) }
$cos_sq = New-Block "math_square" -inputs @{ VALUE = New-Input (Clone-Block $cos_pi4) }
$id_expr = New-Block "math_add" -inputs @{ A = New-Input $sin_sq; B = New-Input $cos_sq } # C

$one = New-Block "custom_number" -fields @{ NUM = 1 } # D

$zero = New-Block "custom_number" -fields @{ NUM = 0 }
$tan_zero = New-Block "term_tan_of" -inputs @{ VALUE = New-Input $zero }
$tan_zero_sq = New-Block "math_square" -inputs @{ VALUE = New-Input $tan_zero }
$sec_sq_lhs = New-Block "math_add" -inputs @{ A = New-Input (Clone-Block $one); B = New-Input $tan_zero_sq } # E

$cos_zero = New-Block "term_cos_of" -inputs @{ VALUE = New-Input (Clone-Block $zero) }
$cos_zero_sq = New-Block "math_square" -inputs @{ VALUE = New-Input $cos_zero }
$sec_sq_rhs = New-Block "math_fraction" -inputs @{ NUM = New-Input (Clone-Block $one); DENOM = New-Input $cos_zero_sq } # F

$sin_zero = New-Block "term_sin_of" -inputs @{ VALUE = New-Input (Clone-Block $zero) }
$sin_zero_sq = New-Block "math_square" -inputs @{ VALUE = New-Input $sin_zero }
$id_expr_zero = New-Block "math_add" -inputs @{ A = New-Input $sin_zero_sq; B = New-Input (Clone-Block $cos_zero_sq) } # G

function Build-Op {
    param($type, $val, $formulaNum, $repl, $next = $null)
    $inputs = @{ VALUE = New-Input (Clone-Block $val) }
    if ($type -eq "replace_operation") {
        $inputs.FORMULA = New-Input (New-Block "formula_$formulaNum")
        $inputs.REPLACEMENT = New-Input (Clone-Block $repl)
    } elseif ($type -eq "common_denominator_operation") {
         $inputs.REPLACEMENT = New-Input (Clone-Block $repl)
    }
    return New-Block $type -inputs $inputs -next (if ($next) { New-Input $next } else { $null })
}

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

$chains = @{
    "2" = { 
        $c = Build-Op "conclusion_operation" $tan_expr
        $b = Build-Op "common_denominator_operation" $tan_expr $null $tan_expr $c
        Build-Op "replace_operation" $tan_pi4 2 $tan_expr $b
    }
    "1" = {
        $c = Build-Op "conclusion_operation" $id_expr
        $b = Build-Op "common_denominator_operation" $id_expr $null $id_expr $c
        Build-Op "replace_operation" $one 1 $id_expr $b
    }
    "3" = {
        $c = Build-Op "conclusion_operation" $sec_sq_rhs
        $b = Build-Op "common_denominator_operation" $sec_sq_rhs $null $sec_sq_rhs $c
        Build-Op "replace_operation" $sec_sq_lhs 3 $sec_sq_rhs $b
    }
    "2,1" = {
        $c = Build-Op "conclusion_operation" $id_expr
        $b = Build-Op "common_denominator_operation" $id_expr $null $id_expr $c
        $a = Build-Op "replace_operation" $tan_expr 1 $id_expr $b
        Build-Op "replace_operation" $tan_pi4 2 $tan_expr $a
    }
    "1,3" = {
        $c = Build-Op "conclusion_operation" $sec_sq_rhs
        $b = Build-Op "common_denominator_operation" $sec_sq_rhs $null $sec_sq_rhs $c
        $a = Build-Op "replace_operation" $id_expr_zero 3 $sec_sq_rhs $b
        Build-Op "replace_operation" $one 1 $id_expr_zero $a
    }
}

$problemChains = @{
    1 = "2,1"; 2 = "2,1"; 3 = "2,1"; 4 = "2"
    5 = "2"; 6 = "3"; 7 = "2,1"; 8 = "1"
    9 = "1"; 10 = "1,3"
}

for ($i = 1; $i -le 10; $i++) {
    $path = "problems/$i.json"
    $json = Get-Content $path -Raw | ConvertFrom-Json
    $json.requiredBlocks = @('"type":"replace_operation"','"type":"common_denominator_operation"','"type":"conclusion_operation"')
    $json.requiredFormulas = $formulaMapping[$i]
    
    $chainKey = $problemChains[$i]
    $opChain = & $chains[$chainKey]
    
    $proofStep = New-Block "proof_step" -x 50 -y 150 -inputs @{ OPERATIONS = New-Input $opChain }
    
    $json.answerState.blocks.blocks = @(
        (Clone-Block $json.initialState.blocks.blocks[0]),
        (Clone-Block $json.initialState.blocks.blocks[1]),
        $proofStep
    )
    
    $out = $json | ConvertTo-Json -Depth 100
    Set-Content -Path $path -Value $out -Encoding UTF8
}
