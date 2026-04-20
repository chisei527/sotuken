function New-Num($n) { return [PSCustomObject]@{ type = "number"; x = 0; y = 0; inputs = @{ VALUE = @{ fields = @{ NUM = $n } } } } }
function New-Pi4 { return [PSCustomObject]@{ type = "pi_over_four"; x = 0; y = 0; inputs = @{} } }
function New-Sin($arg) { return [PSCustomObject]@{ type = "sin_operation"; x = 0; y = 0; inputs = @{ ARG = @{ block = $arg } } } }
function New-Cos($arg) { return [PSCustomObject]@{ type = "cos_operation"; x = 0; y = 0; inputs = @{ ARG = @{ block = $arg } } } }
function New-Tan($arg) { return [PSCustomObject]@{ type = "tan_operation"; x = 0; y = 0; inputs = @{ ARG = @{ block = $arg } } } }
function New-Square($a) { return [PSCustomObject]@{ type = "square_operation"; x = 0; y = 0; inputs = @{ ARG = @{ block = $a } } } }
function New-Add($a, $b) { return [PSCustomObject]@{ type = "addition_operation"; x = 0; y = 0; inputs = @{ LEFT = @{ block = $a }; RIGHT = @{ block = $b } } } }
function New-Frac($n, $d) { return [PSCustomObject]@{ type = "fraction_operation"; x = 0; y = 0; inputs = @{ NUM = @{ block = $n }; DEN = @{ block = $d } } } }

function Get-A { return New-Tan (New-Pi4) }
function Get-B { return New-Frac (New-Sin (New-Pi4)) (New-Cos (New-Pi4)) }
function Get-C { return New-Add (New-Square (New-Sin (New-Pi4))) (New-Square (New-Cos (New-Pi4))) }
function Get-D { return New-Num 1 }
function Get-E { return New-Add (New-Num 1) (New-Square (New-Tan (New-Num 0))) }
function Get-F { return New-Frac (New-Num 1) (New-Square (New-Cos (New-Num 0))) }
function Get-G { return New-Add (New-Square (New-Sin (New-Num 0))) (New-Square (New-Cos (New-Num 0))) }

function New-Replace($formula, $before, $after) {
    return [PSCustomObject]@{ type = "replace_operation"; x = 0; y = 0; inputs = [PSCustomObject]@{ FORMULA = @{ fields = @{ FORMULA = $formula } }; BEFORE = @{ block = $before }; AFTER = @{ block = $after }; NEXT = [PSCustomObject]@{ block = $null } } }
}
function New-Common($before, $after) {
    return [PSCustomObject]@{ type = "common_denominator_operation"; x = 0; y = 0; inputs = [PSCustomObject]@{ BEFORE = @{ block = $before }; AFTER = @{ block = $after }; NEXT = [PSCustomObject]@{ block = $null } } }
}
function New-Conclusion($val) {
    return [PSCustomObject]@{ type = "conclusion_operation"; x = 0; y = 0; inputs = [PSCustomObject]@{ VALUE = @{ block = $val }; NEXT = [PSCustomObject]@{ block = $null } } }
}

function Build-Chain($ops) {
    for ($i = 0; $i -lt $ops.Count - 1; $i++) {
        $ops[$i].inputs.NEXT.block = $ops[$i+1]
    }
    return $ops[0]
}

function Clone-Block($b) {
    $j = ConvertTo-Json $b -Depth 100
    return ConvertFrom-Json $j
}

$formulaMap = @{
    1 = @("formula_2", "formula_1"); 2 = @("formula_2", "formula_1"); 3 = @("formula_2", "formula_1");
    4 = @("formula_2"); 5 = @("formula_2"); 6 = @("formula_3"); 7 = @("formula_2", "formula_1");
    8 = @("formula_1"); 9 = @("formula_1"); 10 = @("formula_1", "formula_3")
}

$requiredBlocks = @(
    '"\"type\":\"replace_operation\""',
    '"\"type\":\"common_denominator_operation\""',
    '"\"type\":\"conclusion_operation\""'
)

for ($id = 1; $id -le 10; $id++) {
    $path = "problems/$id.json"
    if (-not (Test-Path $path)) { continue }
    $rawText = Get-Content $path -Raw
    $json = $rawText | ConvertFrom-Json
    
    $ops = @()
    if ($id -in @(1,2,3,7)) {
        $ops += New-Replace "formula_2" (Get-A) (Get-B)
        $ops += New-Replace "formula_1" (Get-B) (Get-C)
        $ops += New-Common (Get-C) (Get-C)
        $ops += New-Conclusion (Get-C)
    } elseif ($id -in @(4,5)) {
        $ops += New-Replace "formula_2" (Get-A) (Get-B)
        $ops += New-Common (Get-B) (Get-B)
        $ops += New-Conclusion (Get-B)
    } elseif ($id -eq 6) {
        $ops += New-Replace "formula_3" (Get-E) (Get-F)
        $ops += New-Common (Get-F) (Get-F)
        $ops += New-Conclusion (Get-F)
    } elseif ($id -in @(8,9)) {
        $ops += New-Replace "formula_1" (Get-D) (Get-C)
        $ops += New-Common (Get-C) (Get-C)
        $ops += New-Conclusion (Get-C)
    } elseif ($id -eq 10) {
        $ops += New-Replace "formula_1" (Get-D) (Get-G)
        $ops += New-Replace "formula_3" (Get-G) (Get-F)
        $ops += New-Common (Get-F) (Get-F)
        $ops += New-Conclusion (Get-F)
    }

    $firstOp = Build-Chain $ops
    $proofStep = [PSCustomObject]@{
        type = "proof_step"
        x = 50
        y = 150
        inputs = @{ OPERATIONS = @{ block = $firstOp } }
    }
    
    $json.requiredBlocks = $requiredBlocks
    $json.requiredFormulas = $formulaMap[$id]
    
    $block1 = Clone-Block $json.initialState.blocks.blocks[0]
    $block2 = Clone-Block $json.initialState.blocks.blocks[1]
    
    $json.answerState = [PSCustomObject]@{
        blocks = [PSCustomObject]@{
            languageVersion = 0
            blocks = @($block1, $block2, $proofStep)
        }
    }
    
    $json | ConvertTo-Json -Depth 100 | Out-File $path -Encoding UTF8
}

Write-Host "ID`tValid`tCount`tHasOp`tChain"
for ($id = 1; $id -le 10; $id++) {
    $path = "problems/$id.json"
    $raw = Get-Content $path -Raw
    $j = $raw | ConvertFrom-Json -ErrorAction SilentlyContinue
    $valid = if ($j) { "Yes" } else { "No" }
    $count = if ($j -and $j.answerState) { $j.answerState.blocks.blocks.Count } else { 0 }
    $proof = if ($count -ge 3) { $j.answerState.blocks.blocks[2] } else { $null }
    $hasOp = if ($proof -and $proof.inputs.OPERATIONS.block) { "Yes" } else { "No" }
    
    $types = @()
    if ($hasOp -eq "Yes") {
        $curr = $proof.inputs.OPERATIONS.block
        while ($curr) {
            $types += $curr.type
            if ($curr.inputs.NEXT) { $curr = $curr.inputs.NEXT.block } else { $curr = $null }
        }
    }
    $chainStr = $types -join "->"
    Write-Host "$id`t$valid`t$count`t$hasOp`t$chainStr"
}
