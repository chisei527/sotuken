$ErrorActionPreference = 'Stop'

function Num([double]$n) {
  return @{ type = 'custom_number'; fields = @{ NUM = $n } }
}

function Pi() {
  return @{ type = 'term_pi' }
}

function Add($a, $b) {
  return @{ type = 'math_add'; inputs = @{ A = @{ block = $a }; B = @{ block = $b } } }
}

function Mul($a, $b) {
  return @{ type = 'math_multiply'; inputs = @{ A = @{ block = $a }; B = @{ block = $b } } }
}

function Frac($n, $d) {
  return @{ type = 'math_fraction'; inputs = @{ NUMERATOR = @{ block = $n }; DENOMINATOR = @{ block = $d } } }
}

function Sq($a) {
  return @{ type = 'math_square'; inputs = @{ A = @{ block = $a } } }
}

function SinOf($angle) {
  return @{ type = 'term_sin_of'; inputs = @{ ANGLE = @{ block = $angle } } }
}

function CosOf($angle) {
  return @{ type = 'term_cos_of'; inputs = @{ ANGLE = @{ block = $angle } } }
}

function TanOf($angle) {
  return @{ type = 'term_tan_of'; inputs = @{ ANGLE = @{ block = $angle } } }
}

function AnglePiOver([int]$den) {
  return Frac (Pi) (Num $den)
}

function AngleThreePiOverTwo() {
  return Frac (Mul (Num 3) (Pi)) (Num 2)
}

function AngleTwoPi() {
  return Mul (Num 2) (Pi)
}

function GetProblemSpec([int]$id) {
  switch ($id) {
    21 {
      return @{
        mathText = '\[ \sin(0) = 0 \]'
        hint = 'In radian measure, 0 rad is the starting direction. Evaluate sin(0).'
        leftBuilder = { SinOf (Num 0) }
        rightBuilder = { Num 0 }
      }
    }
    22 {
      return @{
        mathText = '\[ \cos(0) = 1 \]'
        hint = 'Use the unit circle at 0 rad and read the x-coordinate.'
        leftBuilder = { CosOf (Num 0) }
        rightBuilder = { Num 1 }
      }
    }
    23 {
      return @{
        mathText = '\[ \tan(0) = 0 \]'
        hint = 'Use tan = sin/cos with the values at 0 rad.'
        leftBuilder = { TanOf (Num 0) }
        rightBuilder = { Num 0 }
      }
    }
    24 {
      return @{
        mathText = '\[ \sin\left(\frac{\pi}{2}\right) = 1 \]'
        hint = 'pi/2 rad corresponds to 90 degrees on the unit circle.'
        leftBuilder = { SinOf (AnglePiOver 2) }
        rightBuilder = { Num 1 }
      }
    }
    25 {
      return @{
        mathText = '\[ \cos(\pi) = -1 \]'
        hint = 'pi rad corresponds to 180 degrees on the unit circle.'
        leftBuilder = { CosOf (Pi) }
        rightBuilder = { Num -1 }
      }
    }
    26 {
      return @{
        mathText = '\[ \tan\left(\frac{\pi}{4}\right) = 1 \]'
        hint = 'At pi/4 rad, sin and cos have the same magnitude.'
        leftBuilder = { TanOf (AnglePiOver 4) }
        rightBuilder = { Num 1 }
      }
    }
    27 {
      return @{
        mathText = '\[ \sin(\pi) + \cos(0) = 1 \]'
        hint = 'Evaluate each term with radian values, then add.'
        leftBuilder = { Add (SinOf (Pi)) (CosOf (Num 0)) }
        rightBuilder = { Num 1 }
      }
    }
    28 {
      return @{
        mathText = '\[ \tan\left(\frac{\pi}{4}\right) + \cos(\pi) = 0 \]'
        hint = 'Compute tan(pi/4) and cos(pi), then combine them.'
        leftBuilder = { Add (TanOf (AnglePiOver 4)) (CosOf (Pi)) }
        rightBuilder = { Num 0 }
      }
    }
    29 {
      return @{
        mathText = '\[ \sin\left(\frac{3\pi}{2}\right) = -1 \]'
        hint = '3pi/2 rad corresponds to 270 degrees on the unit circle.'
        leftBuilder = { SinOf (AngleThreePiOverTwo) }
        rightBuilder = { Num -1 }
      }
    }
    30 {
      return @{
        mathText = '\[ \cos(2\pi) = 1 \]'
        hint = '2pi rad is one full rotation, same direction as 0 rad.'
        leftBuilder = { CosOf (AngleTwoPi) }
        rightBuilder = { Num 1 }
      }
    }
    default {
      throw "Unsupported stage id: $id"
    }
  }
}

function BuildProblem([int]$id) {
  $spec = GetProblemSpec -id $id

  $leftForInitial = & $spec.leftBuilder
  $rightForInitial = & $spec.rightBuilder
  $leftForAnswer = & $spec.leftBuilder
  $rightForAnswer = & $spec.rightBuilder
  $leftForReplace = & $spec.leftBuilder
  $rightForReplace = & $spec.rightBuilder
  $rightForConclusion = & $spec.rightBuilder

  $initialBlocks = @(
    ($leftForInitial + @{ x = 50; y = 50 }),
    ($rightForInitial + @{ x = 600; y = 50 }),
    @{ type = 'proof_step'; x = 50; y = 150 }
  )

  $answerBlocks = @(
    ($leftForAnswer + @{ x = 50; y = 50 }),
    ($rightForAnswer + @{ x = 600; y = 50 }),
    @{
      type = 'proof_step'
      x = 50
      y = 150
      inputs = @{
        OPERATIONS = @{
          block = @{
            type = 'replace_operation'
            inputs = @{
              VALUE = @{ block = $leftForReplace }
              FORMULA = @{ block = @{ type = 'formula_1' } }
              REPLACEMENT = @{ block = $rightForReplace }
            }
            next = @{
              block = @{
                type = 'conclusion_operation'
                inputs = @{
                  VALUE = @{ block = $rightForConclusion }
                }
              }
            }
          }
        }
      }
    }
  )

  return @{
    id = $id
    mathText = $spec.mathText
    requiredBlocks = @('"type":"replace_operation"', '"type":"conclusion_operation"')
    hints = @(
      $spec.hint,
      'Angles are in radians. Use pi directly as the angle input value.'
    )
    initialState = @{ blocks = @{ languageVersion = 0; blocks = $initialBlocks } }
    answerState = @{ blocks = @{ languageVersion = 0; blocks = $answerBlocks } }
  }
}

foreach ($id in 21..30) {
  $problem = BuildProblem -id $id
  $path = "problems/$id.json"
  $problem | ConvertTo-Json -Depth 40 | Set-Content -Path $path -Encoding UTF8
  Write-Host "Generated $path"
}

$allValid = $true
foreach ($id in 21..30) {
  $path = "problems/$id.json"
  $json = Get-Content $path -Raw -Encoding UTF8 | ConvertFrom-Json
  $proof = $json.answerState.blocks.blocks | Where-Object { $_.type -eq 'proof_step' } | Select-Object -First 1
  $hasOps = $null -ne $proof -and $null -ne $proof.inputs -and $null -ne $proof.inputs.OPERATIONS -and $null -ne $proof.inputs.OPERATIONS.block
  $initCount = @($json.initialState.blocks.blocks).Count
  $idOk = $json.id -eq $id
  if (-not ($idOk -and $hasOps -and $initCount -ge 3)) {
    $allValid = $false
  }
  Write-Host "$id -> id=$($json.id), initBlocks=$initCount, hasOps=$hasOps"
}

if ($allValid) {
  Write-Host 'RADIAN_21_30_GENERATION_OK'
} else {
  Write-Host 'RADIAN_21_30_GENERATION_FAIL'
  exit 1
}
