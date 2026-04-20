$ErrorActionPreference = 'Stop'
Set-Location 'c:\Users\hasec\Downloads\sotuken'

function BNum($n){ @{ type='custom_number'; fields=@{ NUM=$n } } }
function BPi(){ @{ type='term_pi' } }
function BPi6(){ @{ type='term_pi_sixth' } }
function BPi4(){ @{ type='term_pi_quarter' } }
function BPi3(){ @{ type='term_pi_third' } }
function BPi2(){ @{ type='term_pi_half' } }
function B2Pi3(){ @{ type='term_two_pi_thirds' } }
function B3Pi4(){ @{ type='term_three_pi_quarters' } }
function B5Pi6(){ @{ type='term_five_pi_sixths' } }
function BHalf(){ @{ type='term_half_value' } }
function BSqrt2Half(){ @{ type='term_sqrt2_half' } }
function BSqrt3Half(){ @{ type='term_sqrt3_half' } }

function BAdd($a,$b){ @{ type='math_add'; inputs=@{ A=@{ block=$a }; B=@{ block=$b } } } }
function BMul($a,$b){ @{ type='math_multiply'; inputs=@{ A=@{ block=$a }; B=@{ block=$b } } } }
function BFrac($n,$d){ @{ type='math_fraction'; inputs=@{ NUMERATOR=@{ block=$n }; DENOMINATOR=@{ block=$d } } } }
function BSquare($a){ @{ type='math_square'; inputs=@{ A=@{ block=$a } } } }
function BNeg($a){ @{ type='math_negate'; inputs=@{ A=@{ block=$a } } } }
function BSin($ang){ @{ type='term_sin_of'; inputs=@{ ANGLE=@{ block=$ang } } } }
function BCos($ang){ @{ type='term_cos_of'; inputs=@{ ANGLE=@{ block=$ang } } } }
function BTan($ang){ @{ type='term_tan_of'; inputs=@{ ANGLE=@{ block=$ang } } } }

function New-Problem($id, $mathText, $hints, $formulaType, [scriptblock]$leftFn, [scriptblock]$rightFn) {
  $leftInitial = & $leftFn
  $rightInitial = & $rightFn
  $leftAnswerTop = & $leftFn
  $rightAnswerTop = & $rightFn
  $leftReplace = & $leftFn
  $rightReplace = & $rightFn
  $rightConclusion = & $rightFn

  $replaceOp = @{
    type = 'replace_operation'
    inputs = @{
      VALUE = @{ block = $leftReplace }
      FORMULA = @{ block = @{ type = $formulaType } }
      REPLACEMENT = @{ block = $rightReplace }
    }
    next = @{
      block = @{
        type = 'conclusion_operation'
        inputs = @{ VALUE = @{ block = $rightConclusion } }
      }
    }
  }

  return [ordered]@{
    id = $id
    mathText = $mathText
    requiredBlocks = @('"type":"replace_operation"', '"type":"conclusion_operation"')
    hints = $hints
    initialState = @{
      blocks = @{
        languageVersion = 0
        blocks = @(
          (@{ type = $leftInitial.type; x = 50; y = 50 } + ($leftInitial | Select-Object -ExcludeProperty type)),
          (@{ type = $rightInitial.type; x = 600; y = 50 } + ($rightInitial | Select-Object -ExcludeProperty type)),
          @{ type = 'proof_step'; x = 50; y = 150 }
        )
      }
    }
    answerState = @{
      blocks = @{
        languageVersion = 0
        blocks = @(
          (@{ type = $leftAnswerTop.type; x = 50; y = 50 } + ($leftAnswerTop | Select-Object -ExcludeProperty type)),
          (@{ type = $rightAnswerTop.type; x = 600; y = 50 } + ($rightAnswerTop | Select-Object -ExcludeProperty type)),
          @{
            type = 'proof_step'
            x = 50
            y = 150
            inputs = @{ OPERATIONS = @{ block = $replaceOp } }
          }
        )
      }
    }
  }
}

$problems = @(
  @{ id=11; math='\\\[ \\sin(\\frac{\\pi}{6}+\\frac{\\pi}{3}) = 1 \\\]'; formula='formula_4'; hints=@('\\(\\frac{\\pi}{6}+\\frac{\\pi}{3}=\\frac{\\pi}{2}\\) を先に作る。','sin の有名角 \\(\\frac{\\pi}{2}\\) の値に変形する。'); left={ BSin (BAdd (BPi6) (BPi3)) }; right={ BNum 1 } },
  @{ id=12; math='\\\[ \\cos(\\frac{\\pi}{4}+\\frac{\\pi}{4}) = 0 \\\]'; formula='formula_6'; hints=@('同じ角の和は倍角として見られる。','\\(\\frac{\\pi}{4}+\\frac{\\pi}{4}=\\frac{\\pi}{2}\\) を使う。'); left={ BCos (BAdd (BPi4) (BPi4)) }; right={ BNum 0 } },
  @{ id=13; math='\\\[ \\sin(2 \\cdot \\frac{\\pi}{6}) = \\frac{\\sqrt{3}}{2} \\]'; formula='formula_4'; hints=@('まず角度を \\(\\frac{\\pi}{3}\\) に整理する。','\\sin(\\frac{\\pi}{3}) の値を使う。'); left={ BSin (BMul (BNum 2) (BPi6)) }; right={ BSqrt3Half } },
  @{ id=14; math='\\\[ \\cos(2 \\cdot \\frac{\\pi}{3}) = -\\frac{1}{2} \\]'; formula='formula_6'; hints=@('\\(2\\cdot\\frac{\\pi}{3}=\\frac{2\\pi}{3}\\) に変形する。','第2象限の cos は負になる。'); left={ BCos (BMul (BNum 2) (BPi3)) }; right={ BNeg (BHalf) } },
  @{ id=15; math='\\\[ \\sin(\\frac{\\pi}{3}+\\frac{\\pi}{6}) = 1 \\]'; formula='formula_4'; hints=@('加法で \\(\\frac{\\pi}{2}\\) を作る。','sin の最大値になる角度を確認する。'); left={ BSin (BAdd (BPi3) (BPi6)) }; right={ BNum 1 } },
  @{ id=16; math='\\\[ \\cos(\\frac{\\pi}{6}+\\frac{\\pi}{6}) = \\frac{1}{2} \\]'; formula='formula_6'; hints=@('同じ角の和は \\(\\frac{\\pi}{3}\\) になる。','\\cos(\\frac{\\pi}{3}) の有名角を使う。'); left={ BCos (BAdd (BPi6) (BPi6)) }; right={ BHalf } },
  @{ id=17; math='\\\[ \\sin(\\frac{3\\pi}{4}) = \\frac{\\sqrt{2}}{2} \\]'; formula='formula_1'; hints=@('\\(\\frac{3\\pi}{4}\\) は第2象限。','基準角 \\(\\frac{\\pi}{4}\\) の値を思い出す。'); left={ BSin (B3Pi4) }; right={ BSqrt2Half } },
  @{ id=18; math='\\\[ \\cos(\\frac{3\\pi}{4}) = -\\frac{\\sqrt{2}}{2} \\]'; formula='formula_1'; hints=@('第2象限では cos は負。','大きさは \\(\\frac{\\pi}{4}\\) の値と同じ。'); left={ BCos (B3Pi4) }; right={ BNeg (BSqrt2Half) } },
  @{ id=19; math='\\\[ \\sin(\\frac{5\\pi}{6}) = \\frac{1}{2} \\]'; formula='formula_1'; hints=@('\\(\\frac{5\\pi}{6}\\) の基準角は \\(\\frac{\\pi}{6}\\)。','第2象限の sin は正。'); left={ BSin (B5Pi6) }; right={ BHalf } },
  @{ id=20; math='\\\[ \\cos(\\frac{5\\pi}{6}) = -\\frac{\\sqrt{3}}{2} \\]'; formula='formula_1'; hints=@('\\(\\frac{5\\pi}{6}\\) の基準角は \\(\\frac{\\pi}{6}\\)。','第2象限の cos は負。'); left={ BCos (B5Pi6) }; right={ BNeg (BSqrt3Half) } },

  @{ id=21; math='\\\[ \\sin^2(\\frac{\\pi}{3}) + \\cos^2(\\frac{\\pi}{3}) = 1 \\]'; formula='formula_1'; hints=@('公式①の角度を \\(\\frac{\\pi}{3}\\) に固定して使う。','左辺をそのまま公式①の形として見る。'); left={ BAdd (BSquare (BSin (BPi3))) (BSquare (BCos (BPi3))) }; right={ BNum 1 } },
  @{ id=22; math='\\\[ \\tan(\\frac{\\pi}{6}) = \\frac{\\frac{1}{2}}{\\frac{\\sqrt{3}}{2}} \\]'; formula='formula_2'; hints=@('公式② \\(\\tan\\theta=\\frac{\\sin\\theta}{\\cos\\theta}\\) を使う。','\\(\\theta=\\frac{\\pi}{6}\\) を代入する。'); left={ BTan (BPi6) }; right={ BFrac (BHalf) (BSqrt3Half) } },
  @{ id=23; math='\\\[ 1 + \\tan^2(\\frac{\\pi}{6}) = \\frac{1}{\\cos^2(\\frac{\\pi}{6})} \\]'; formula='formula_3'; hints=@('公式③の \\(\\theta\\) に \\(\\frac{\\pi}{6}\\) を入れる。','左辺と右辺の公式対応を確認する。'); left={ BAdd (BNum 1) (BSquare (BTan (BPi6))) }; right={ BFrac (BNum 1) (BSquare (BCos (BPi6))) } },
  @{ id=24; math='\\\[ \\sin(2\\cdot\\frac{\\pi}{6}) = 2\\sin(\\frac{\\pi}{6})\\cos(\\frac{\\pi}{6}) \\]'; formula='formula_4'; hints=@('公式④そのものの角度代入。','右辺の 2sinθcosθ の形を作る。'); left={ BSin (BMul (BNum 2) (BPi6)) }; right={ BMul (BMul (BNum 2) (BSin (BPi6))) (BCos (BPi6)) } },
  @{ id=25; math='\\\[ \\sin^2(\\frac{\\pi}{6}) = \\frac{1-\\cos(2\\cdot\\frac{\\pi}{6})}{2} \\]'; formula='formula_5'; hints=@('公式⑤は \\(\\sin^2\\theta\\) を変形する式。','引き算は「1 + 負の項」で表せる。'); left={ BSquare (BSin (BPi6)) }; right={ BFrac (BAdd (BNum 1) (BNeg (BCos (BMul (BNum 2) (BPi6))))) (BNum 2) } },
  @{ id=26; math='\\\[ \\cos^2(\\frac{\\pi}{3}) = \\frac{1+\\cos(2\\cdot\\frac{\\pi}{3})}{2} \\]'; formula='formula_6'; hints=@('公式⑥で \\(\\cos^2\\theta\\) を変形する。','角度は \\(\\frac{\\pi}{3}\\) を代入。'); left={ BSquare (BCos (BPi3)) }; right={ BFrac (BAdd (BNum 1) (BCos (BMul (BNum 2) (BPi3)))) (BNum 2) } },
  @{ id=27; math='\\\[ \\tan(\\frac{\\pi}{6}) = \\frac{\\sin(2\\cdot\\frac{\\pi}{6})}{1+\\cos(2\\cdot\\frac{\\pi}{6})} \\]'; formula='formula_7'; hints=@('公式⑦をそのまま使う。','分母は \\(1+\\cos 2\\theta\\) の形。'); left={ BTan (BPi6) }; right={ BFrac (BSin (BMul (BNum 2) (BPi6))) (BAdd (BNum 1) (BCos (BMul (BNum 2) (BPi6)))) } },
  @{ id=28; math='\\\[ \\tan^2(\\frac{\\pi}{3}) = \\frac{1-\\cos(2\\cdot\\frac{\\pi}{3})}{1+\\cos(2\\cdot\\frac{\\pi}{3})} \\]'; formula='formula_8'; hints=@('公式⑧の角度を \\(\\frac{\\pi}{3}\\) にする。','分子の引き算は負号ブロックで作る. '); left={ BSquare (BTan (BPi3)) }; right={ BFrac (BAdd (BNum 1) (BNeg (BCos (BMul (BNum 2) (BPi3))))) (BAdd (BNum 1) (BCos (BMul (BNum 2) (BPi3)))) } },
  @{ id=29; math='\\\[ \\sin(\\frac{\\pi}{4})\\cos(\\frac{\\pi}{4}) = \\frac{1}{2} \\]'; formula='formula_4'; hints=@('有名角の積を計算する。','必要なら倍角公式からも確認できる。'); left={ BMul (BSin (BPi4)) (BCos (BPi4)) }; right={ BHalf } },
  @{ id=30; math='\\\[ \\tan(\\frac{\\pi}{3})\\tan(\\frac{\\pi}{6}) = 1 \\]'; formula='formula_2'; hints=@('それぞれを \\(\\sin/\\cos\\) で考える。','有名角の値で積を計算すると 1 になる。'); left={ BMul (BTan (BPi3)) (BTan (BPi6)) }; right={ BNum 1 } }
)

foreach ($p in $problems) {
  $obj = New-Problem -id $p.id -mathText $p.math -hints $p.hints -formulaType $p.formula -leftFn $p.left -rightFn $p.right
  $json = $obj | ConvertTo-Json -Depth 40
  $path = Join-Path 'problems' ("$($p.id).json")
  Set-Content -Path $path -Value $json -Encoding utf8
}

Write-Output "Regenerated files: 11-30"
