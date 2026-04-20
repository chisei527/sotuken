$formulaById = @{
  30="formula_4";31="formula_5";32="formula_6";33="formula_7";34="formula_8";
  35="formula_4";36="formula_5";37="formula_6";38="formula_7";39="formula_8";
  40="formula_4";41="formula_5";42="formula_6";43="formula_8"
}

function Num([double]$n){ @{ type="custom_number"; fields=@{ NUM=$n } } }
function Sin(){ @{ type="term_sin" } }
function Cos(){ @{ type="term_cos" } }
function Tan(){ @{ type="term_tan" } }
function Sin2(){ @{ type="term_sin2" } }
function Cos2(){ @{ type="term_cos2" } }
function Add($a,$b){ @{ type="math_add"; inputs=@{ A=@{block=$a}; B=@{block=$b} } } }
function Mul($a,$b){ @{ type="math_multiply"; inputs=@{ A=@{block=$a}; B=@{block=$b} } } }
function Frac($n,$d){ @{ type="math_fraction"; inputs=@{ NUMERATOR=@{block=$n}; DENOMINATOR=@{block=$d} } } }
function Sq($a){ @{ type="math_square"; inputs=@{ A=@{block=$a} } } }
function OneMinusCos2(){ Add (Num 1) (Mul (Num -1) (Cos2)) }
function OnePlusCos2(){ Add (Num 1) (Cos2) }

function BuildSpec([string]$formula,[int]$id){
  $lhs = $null
  $rhs = $null
  $value = $null
  $replacement = $null
  $mathText = ""
  $hint = ""

  switch($formula){
    "formula_4" {
      $lhs = Frac (Sin2) (Mul (Num 2) (Cos))
      $rhs = Sin
      $value = Sin2
      $replacement = Mul (Mul (Num 2) (Sin)) (Cos)
      $mathText="\\[ \\frac{\\sin 2\\theta}{2\\cos\\theta} = \\sin\\theta \\]"
      $hint="公式④を使って sin2θ を展開しよう。"
    }
    "formula_5" {
      $lhs = Frac (OneMinusCos2) (Num 2)
      $rhs = Sq (Sin)
      $value = Sq (Sin)
      $replacement = Frac (OneMinusCos2) (Num 2)
      $mathText="\\[ \\frac{1-\\cos 2\\theta}{2} = \\sin^2\\theta \\]"
      $hint="公式⑤を使って sin²θ を変形しよう。"
    }
    "formula_6" {
      $lhs = Frac (OnePlusCos2) (Num 2)
      $rhs = Sq (Cos)
      $value = Sq (Cos)
      $replacement = Frac (OnePlusCos2) (Num 2)
      $mathText="\\[ \\frac{1+\\cos 2\\theta}{2} = \\cos^2\\theta \\]"
      $hint="公式⑥を使って cos²θ を変形しよう。"
    }
    "formula_7" {
      $lhs = Tan
      $rhs = Frac (Sin2) (OnePlusCos2)
      $value = Tan
      $replacement = Frac (Sin2) (OnePlusCos2)
      $mathText="\\[ \\tan\\theta = \\frac{\\sin 2\\theta}{1+\\cos 2\\theta} \\]"
      $hint="公式⑦をそのまま置き換える問題です。"
    }
    default {
      $lhs = Sq (Tan)
      $rhs = Frac (OneMinusCos2) (OnePlusCos2)
      $value = Sq (Tan)
      $replacement = Frac (OneMinusCos2) (OnePlusCos2)
      $mathText="\\[ \\tan^2\\theta = \\frac{1-\\cos 2\\theta}{1+\\cos 2\\theta} \\]"
      $hint="公式⑧を使って tan²θ を変形しよう。"
    }
  }

  $initialBlocks = @(
    ($lhs + @{ x=50; y=50 }),
    ($rhs + @{ x=600; y=50 }),
    @{ type="proof_step"; x=50; y=150 }
  )

  $answerBlocks = @(
    ($lhs + @{ x=50; y=50 }),
    ($rhs + @{ x=600; y=50 }),
    @{
      type="proof_step"; x=50; y=150;
      inputs=@{
        OPERATIONS=@{ block=@{
          type="replace_operation";
          inputs=@{
            VALUE=@{block=$value};
            FORMULA=@{block=@{type=$formula}};
            REPLACEMENT=@{block=$replacement}
          };
          next=@{ block=@{ type="conclusion_operation"; inputs=@{ VALUE=@{block=$rhs} } } }
        } }
      }
    }
  )

  return @{
    id = $id
    mathText = $mathText
    requiredBlocks = @('"type":"replace_operation"', '"type":"conclusion_operation"')
    hints = @($hint, "左辺と右辺が同じ値になることを確認しよう。")
    initialState = @{ blocks=@{ languageVersion=0; blocks=$initialBlocks } }
    answerState = @{ blocks=@{ languageVersion=0; blocks=$answerBlocks } }
  }
}

foreach($id in 30..43){
  $formula = $formulaById[$id]
  $problem = BuildSpec -formula $formula -id $id
  $path = "problems/$id.json"
  $problem | ConvertTo-Json -Depth 30 | Set-Content -Path $path -Encoding UTF8
}

$ok = $true
foreach($id in 30..43){
  $p = "problems/$id.json"
  $j = Get-Content $p -Raw -Encoding UTF8 | ConvertFrom-Json
  $proof = $j.answerState.blocks.blocks | Where-Object { $_.type -eq "proof_step" } | Select-Object -First 1
  $hasOps = $null -ne $proof -and $null -ne $proof.inputs.OPERATIONS.block
  $initCount = @($j.initialState.blocks.blocks).Count
  if($j.id -ne $id -or -not $hasOps -or $initCount -lt 3){ $ok = $false }
  Write-Host "$id -> id=$($j.id) initBlocks=$initCount ops=$hasOps"
}
if($ok){ Write-Host "VALIDATION_OK" } else { Write-Host "VALIDATION_FAIL" }
