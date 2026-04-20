$ErrorActionPreference = 'Stop'

function Clone-Obj($obj) { return ($obj | ConvertTo-Json -Depth 100 -Compress | ConvertFrom-Json) }
function Num([double]$n) { return [ordered]@{ type='custom_number'; fields=[ordered]@{ NUM=$n } } }
function Pi4() { return [ordered]@{ type='term_pi_quarter' } }
function Pi6() { return [ordered]@{ type='term_pi_sixth' } }
function SinOf($arg) { return [ordered]@{ type='term_sin_of'; inputs=[ordered]@{ ANGLE=[ordered]@{ block=$arg } } } }
function CosOf($arg) { return [ordered]@{ type='term_cos_of'; inputs=[ordered]@{ ANGLE=[ordered]@{ block=$arg } } } }
function TanOf($arg) { return [ordered]@{ type='term_tan_of'; inputs=[ordered]@{ ANGLE=[ordered]@{ block=$arg } } } }
function Square($a) { return [ordered]@{ type='math_square'; inputs=[ordered]@{ A=[ordered]@{ block=$a } } } }
function Add($a,$b) { return [ordered]@{ type='math_add'; inputs=[ordered]@{ A=[ordered]@{ block=$a }; B=[ordered]@{ block=$b } } } }
function Mul($a,$b) { return [ordered]@{ type='math_multiply'; inputs=[ordered]@{ A=[ordered]@{ block=$a }; B=[ordered]@{ block=$b } } } }
function Neg($a) { return [ordered]@{ type='math_negate'; inputs=[ordered]@{ A=[ordered]@{ block=$a } } } }
function Frac($n,$d) { return [ordered]@{ type='math_fraction'; inputs=[ordered]@{ NUMERATOR=[ordered]@{ block=$n }; DENOMINATOR=[ordered]@{ block=$d } } } }

function ReplaceOp([int]$formulaNum, $before, $after) {
  return [ordered]@{
    type='replace_operation'
    inputs=[ordered]@{
      VALUE=[ordered]@{ block=$before }
      FORMULA=[ordered]@{ block=[ordered]@{ type="formula_$formulaNum" } }
      REPLACEMENT=[ordered]@{ block=$after }
    }
  }
}
function CommonOp($expr) { return [ordered]@{ type='common_denominator_operation'; inputs=[ordered]@{ VALUE=[ordered]@{ block=$expr }; REPLACEMENT=[ordered]@{ block=$expr } } } }
function ConclusionOp($expr) { return [ordered]@{ type='conclusion_operation'; inputs=[ordered]@{ VALUE=[ordered]@{ block=$expr } } } }

$map = @{
  11=@(2,1); 12=@(2,1); 13=@(4); 14=@(2,1); 15=@(2,1); 16=@(2,1); 17=@(2,1); 18=@(2,1); 19=@(2,1); 20=@(2,1)
  21=@(1); 22=@(2); 23=@(3); 24=@(4); 25=@(5); 26=@(6); 27=@(7); 28=@(8); 29=@(4); 30=@(2)
  31=@(5); 32=@(6); 33=@(7); 34=@(8); 35=@(4); 36=@(5); 37=@(6); 38=@(7); 39=@(8); 40=@(4); 41=@(5); 42=@(6); 43=@(8)
}
$requiredBlocks = @('"type":"replace_operation"','"type":"common_denominator_operation"','"type":"conclusion_operation"')

foreach($id in 11..43){
  $path = "problems/$id.json"
  if(-not (Test-Path $path)){ continue }
  $json = Get-Content -Raw -Encoding utf8 $path | ConvertFrom-Json

  $A = TanOf (Pi4)
  $B = Frac (SinOf (Pi4)) (CosOf (Pi4))
  $C = Add (Square (SinOf (Pi4))) (Square (CosOf (Pi4)))
  $D = Num 1
  $E = Add (Num 1) (Square (TanOf (Num 0)))
  $F = Frac (Num 1) (Square (CosOf (Num 0)))
  $H = SinOf (Mul (Num 2) (Pi6))
  $I = Mul (Mul (Num 2) (SinOf (Pi6))) (CosOf (Pi6))
  $J = Square (SinOf (Pi4))
  $K = Frac (Add (Num 1) (Neg (CosOf (Mul (Num 2) (Pi4))))) (Num 2)
  $L = Square (CosOf (Pi4))
  $M = Frac (Add (Num 1) (CosOf (Mul (Num 2) (Pi4)))) (Num 2)
  $N = TanOf (Pi6)
  $O = Frac (SinOf (Mul (Num 2) (Pi6))) (Add (Num 1) (CosOf (Mul (Num 2) (Pi6))))
  $P = Square (TanOf (Pi6))
  $Q = Frac (Add (Num 1) (Neg (CosOf (Mul (Num 2) (Pi6))))) (Add (Num 1) (CosOf (Mul (Num 2) (Pi6))))

  $ops = @()
  $seq = $map[$id]
  if($seq.Count -eq 2 -and $seq[0] -eq 2 -and $seq[1] -eq 1){
    $ops += ReplaceOp 2 (Clone-Obj $A) (Clone-Obj $B)
    $ops += ReplaceOp 1 (Clone-Obj $B) (Clone-Obj $C)
    $endExpr = Clone-Obj $C
  } else {
    $f = [int]$seq[0]
    switch($f){
      1 { $before=Clone-Obj $D; $after=Clone-Obj $C }
      2 { $before=Clone-Obj $A; $after=Clone-Obj $B }
      3 { $before=Clone-Obj $E; $after=Clone-Obj $F }
      4 { $before=Clone-Obj $H; $after=Clone-Obj $I }
      5 { $before=Clone-Obj $J; $after=Clone-Obj $K }
      6 { $before=Clone-Obj $L; $after=Clone-Obj $M }
      7 { $before=Clone-Obj $N; $after=Clone-Obj $O }
      8 { $before=Clone-Obj $P; $after=Clone-Obj $Q }
      default { $before=Clone-Obj $D; $after=Clone-Obj $C; $f=1 }
    }
    $ops += ReplaceOp $f $before $after
    $endExpr = Clone-Obj $after
  }

  $ops += CommonOp (Clone-Obj $endExpr)
  $ops += ConclusionOp (Clone-Obj $endExpr)
  for($i=0; $i -lt $ops.Count-1; $i++){ $ops[$i].next = [ordered]@{ block = $ops[$i+1] } }

  $initialBlocks = @($json.initialState.blocks.blocks)
  if($initialBlocks.Count -lt 2){ continue }
  $proofStep = [ordered]@{ type='proof_step'; x=50; y=150; inputs=[ordered]@{ OPERATIONS=[ordered]@{ block=$ops[0] } } }

  if($json.PSObject.Properties.Name -contains 'requiredBlocks'){ $json.requiredBlocks = $requiredBlocks } else { $json | Add-Member -MemberType NoteProperty -Name requiredBlocks -Value $requiredBlocks }
  $rf = @($seq | ForEach-Object { "formula_$_" })
  if($json.PSObject.Properties.Name -contains 'requiredFormulas'){ $json.requiredFormulas = $rf } else { $json | Add-Member -MemberType NoteProperty -Name requiredFormulas -Value $rf }

  $json.answerState = [pscustomobject]@{ blocks=[pscustomobject]@{ languageVersion=0; blocks=@((Clone-Obj $initialBlocks[0]),(Clone-Obj $initialBlocks[1]),$proofStep) } }
  ($json | ConvertTo-Json -Depth 100) | Set-Content -Path $path -Encoding utf8
}

$report=@()
foreach($id in 11..43){
  $p="problems/$id.json"
  $raw=Get-Content -Raw $p
  $j=$raw|ConvertFrom-Json
  $proof=($j.answerState.blocks.blocks|Where-Object {$_.type -eq 'proof_step'}|Select-Object -First 1)
  $cur=$proof.inputs.OPERATIONS.block
  $chain=@()
  while($cur){ $chain += [string]$cur.type; if($cur.next -and $cur.next.block){$cur=$cur.next.block}else{break} }
  $report += "id=$id chain=$($chain -join '->') rf=$($j.requiredFormulas -join ',') null=$([regex]::IsMatch($raw,'\"block\"\\s*:\\s*null'))"
}
$report | Set-Content problems/_report_11_43.txt -Encoding utf8
Get-Content problems/_report_11_43.txt

