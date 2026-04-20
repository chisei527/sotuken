$ErrorActionPreference = 'Stop'

function Clone-Obj($obj) {
  return ($obj | ConvertTo-Json -Depth 100 -Compress | ConvertFrom-Json)
}

function Num([double]$n) { return [ordered]@{ type='custom_number'; fields=[ordered]@{ NUM=$n } } }
function Pi4() { return [ordered]@{ type='term_pi_quarter' } }
function SinOf($arg) { return [ordered]@{ type='term_sin_of'; inputs=[ordered]@{ ANGLE=[ordered]@{ block=$arg } } } }
function CosOf($arg) { return [ordered]@{ type='term_cos_of'; inputs=[ordered]@{ ANGLE=[ordered]@{ block=$arg } } } }
function TanOf($arg) { return [ordered]@{ type='term_tan_of'; inputs=[ordered]@{ ANGLE=[ordered]@{ block=$arg } } } }
function Square($a) { return [ordered]@{ type='math_square'; inputs=[ordered]@{ A=[ordered]@{ block=$a } } } }
function Add($a,$b) { return [ordered]@{ type='math_add'; inputs=[ordered]@{ A=[ordered]@{ block=$a }; B=[ordered]@{ block=$b } } } }
function Frac($n,$d) { return [ordered]@{ type='math_fraction'; inputs=[ordered]@{ NUMERATOR=[ordered]@{ block=$n }; DENOMINATOR=[ordered]@{ block=$d } } } }

function ReplaceOp([int]$formulaNum, $before, $after) {
  return [ordered]@{
    type = 'replace_operation'
    inputs = [ordered]@{
      VALUE = [ordered]@{ block = $before }
      FORMULA = [ordered]@{ block = [ordered]@{ type = "formula_$formulaNum" } }
      REPLACEMENT = [ordered]@{ block = $after }
    }
  }
}

function CommonOp($before,$after) {
  return [ordered]@{
    type = 'common_denominator_operation'
    inputs = [ordered]@{
      VALUE = [ordered]@{ block = $before }
      REPLACEMENT = [ordered]@{ block = $after }
    }
  }
}

function ConclusionOp($value) {
  return [ordered]@{
    type = 'conclusion_operation'
    inputs = [ordered]@{
      VALUE = [ordered]@{ block = $value }
    }
  }
}

$formulaMap = @{
  1 = @('formula_2','formula_1')
  2 = @('formula_2','formula_1')
  3 = @('formula_2','formula_1')
  4 = @('formula_2')
  5 = @('formula_2')
  6 = @('formula_3')
  7 = @('formula_2','formula_1')
  8 = @('formula_1')
  9 = @('formula_1')
  10 = @('formula_1','formula_3')
}

$requiredBlocks = @('"type":"replace_operation"','"type":"common_denominator_operation"','"type":"conclusion_operation"')

foreach ($id in 1..10) {
  $path = "problems/$id.json"
  if (-not (Test-Path $path)) { continue }
  $json = Get-Content -Raw -Path $path | ConvertFrom-Json

  $A = TanOf (Pi4)
  $B = Frac (SinOf (Pi4)) (CosOf (Pi4))
  $C = Add (Square (SinOf (Pi4))) (Square (CosOf (Pi4)))
  $D = Num 1
  $E = Add (Num 1) (Square (TanOf (Num 0)))
  $F = Frac (Num 1) (Square (CosOf (Num 0)))
  $G = Add (Square (SinOf (Num 0))) (Square (CosOf (Num 0)))

  $ops = @()
  if ($id -in @(1,2,3,7)) {
    $ops += ReplaceOp 2 (Clone-Obj $A) (Clone-Obj $B)
    $ops += ReplaceOp 1 (Clone-Obj $B) (Clone-Obj $C)
    $endExpr = Clone-Obj $C
  } elseif ($id -in @(4,5)) {
    $ops += ReplaceOp 2 (Clone-Obj $A) (Clone-Obj $B)
    $endExpr = Clone-Obj $B
  } elseif ($id -eq 6) {
    $ops += ReplaceOp 3 (Clone-Obj $E) (Clone-Obj $F)
    $endExpr = Clone-Obj $F
  } elseif ($id -in @(8,9)) {
    $ops += ReplaceOp 1 (Clone-Obj $D) (Clone-Obj $C)
    $endExpr = Clone-Obj $C
  } elseif ($id -eq 10) {
    $ops += ReplaceOp 1 (Clone-Obj $D) (Clone-Obj $G)
    $ops += ReplaceOp 3 (Clone-Obj $G) (Clone-Obj $F)
    $endExpr = Clone-Obj $F
  } else {
    continue
  }

  $ops += CommonOp (Clone-Obj $endExpr) (Clone-Obj $endExpr)
  $ops += ConclusionOp (Clone-Obj $endExpr)

  for ($i = 0; $i -lt $ops.Count - 1; $i++) {
    $ops[$i].next = [ordered]@{ block = $ops[$i+1] }
  }

  $initialBlocks = @($json.initialState.blocks.blocks)
  if ($initialBlocks.Count -lt 2) { throw "initialState blocks missing in $path" }

  $proofStep = [ordered]@{
    type = 'proof_step'
    x = 50
    y = 150
    inputs = [ordered]@{
      OPERATIONS = [ordered]@{ block = $ops[0] }
    }
  }

  if ($json.PSObject.Properties.Name -contains 'requiredBlocks') {
    $json.requiredBlocks = $requiredBlocks
  } else {
    $json | Add-Member -MemberType NoteProperty -Name requiredBlocks -Value $requiredBlocks
  }

  if ($json.PSObject.Properties.Name -contains 'requiredFormulas') {
    $json.requiredFormulas = $formulaMap[$id]
  } else {
    $json | Add-Member -MemberType NoteProperty -Name requiredFormulas -Value $formulaMap[$id]
  }

  $json.answerState = [pscustomobject]@{
    blocks = [pscustomobject]@{
      languageVersion = 0
      blocks = @(
        (Clone-Obj $initialBlocks[0]),
        (Clone-Obj $initialBlocks[1]),
        $proofStep
      )
    }
  }

  $out = $json | ConvertTo-Json -Depth 100
  [System.IO.File]::WriteAllText((Resolve-Path $path), $out, (New-Object System.Text.UTF8Encoding($false)))
}

