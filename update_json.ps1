$mapping = @{
    1 = @(2, 1); 2 = @(2, 1); 3 = @(2, 1); 4 = @(2); 5 = @(2);
    6 = @(3); 7 = @(2, 1); 8 = @(1); 9 = @(1); 10 = @(1, 3)
}

$num1 = @{type='custom_number';fields=@{NUM=1}}
$term_sin = @{type='term_sin'}
$term_cos = @{type='term_cos'}
$term_tan = @{type='term_tan'}

function square($A) { @{type='math_square';inputs=@{A=@{block=$A}}} }
function add($A, $B) { @{type='math_add';inputs=@{A=@{block=$A};B=@{block=$B}}} }
function frac($N, $D) { @{type='math_fraction';inputs=@{NUMERATOR=@{block=$N};DENOMINATOR=@{block=$D}}} }

$formulas = @{
    1 = @{left=add (square $term_sin) (square $term_cos); right=$num1}
    2 = @{left=$term_tan; right=frac $term_sin $term_cos}
    3 = @{left=add $num1 (square $term_tan); right=frac $num1 (square $term_cos)}
}

foreach ($id in $mapping.Keys) {
    $filePath = "problems/$id.json"
    if (-not (Test-Path $filePath)) { continue }
    
    $json = Get-Content $filePath -Raw -Encoding UTF8 | ConvertFrom-Json
    
    # Get finalExprBlock from existing last conclusion_operation
    $ops = $json.answerState.proof_step.OPERATIONS
    $finalExprBlock = $null
    for ($i = $ops.Count - 1; $i -ge 0; $i--) {
        if ($ops[$i].type -eq 'conclusion_operation') {
            $finalExprBlock = $ops[$i].inputs.VALUE.block
            break
        }
    }
    
    $newOps = New-Object System.Collections.Generic.List[PSObject]
    
    foreach ($fId in $mapping[$id]) {
        $f = $formulas[$fId]
        # replace_operation
        $newOps.Add(@{
            type = "replace_operation"
            inputs = @{
                VALUE = @{ block = $f.left }
                FORMULA = @{ type = "formula_$fId" }
                REPLACEMENT = @{ block = $f.right }
            }
        })
        # conclusion_operation
        $newOps.Add(@{
            type = "conclusion_operation"
            inputs = @{
                VALUE = @{ block = $f.right }
            }
        })
    }
    
    # common_denominator_operation
    $newOps.Add(@{
        type = "common_denominator_operation"
        inputs = @{
            VALUE = @{ block = $finalExprBlock }
            REPLACEMENT = @{ block = $finalExprBlock }
        }
    })
    
    # final conclusion_operation
    $newOps.Add(@{
        type = "conclusion_operation"
        inputs = @{
            VALUE = @{ block = $finalExprBlock }
        }
    })
    
    $json.answerState.proof_step.OPERATIONS = $newOps
    $json.requiredBlocks = @("\"type\":\"replace_operation\"", "\"type\":\"common_denominator_operation\"", "\"type\":\"conclusion_operation\"")
    
    $json | ConvertTo-Json -Depth 100 | Out-File $filePath -Encoding UTF8
}
