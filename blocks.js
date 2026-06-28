class FieldSpacer extends Blockly.Field {
  constructor(width) {
    super('');
    this.width_ = width || 10;
    // 見た目専用フィールドなので保存対象外（コンソール警告を解消）
    this.SERIALIZABLE = false;
  }
  initView() {
    this.size_ = new Blockly.utils.Size(this.width_, 24);
  }
  getSize() {
    return new Blockly.utils.Size(this.width_, 24);
  }
}

// ---------------------------------------------------
// （ここから下は、元からある const FORMULA_BLOCK_DEFS = ... などのコードをそのまま残してください）

// 公式ブロックの定義。各要素は [内部ID, 番号記号, 表示数式] の3つ組み。
// ブロックには「① sin²θ + cos²θ = 1」のように番号と数式を並べて表示する。
// 学習者が「公式①って何だっけ？」と迷わないように、数式自体を見える形にしてある。
const FORMULA_BLOCK_DEFS = [
  ['formula_1',  '①', 'sin²θ + cos²θ = 1'],
  ['formula_2',  '②', 'tanθ = sinθ/cosθ'],
  ['formula_3',  '③', '1 + tan²θ = 1/cos²θ'],
  ['formula_4',  '④', 'sin2θ = 2sinθcosθ'],
  ['formula_5',  '⑤', 'sin²θ = (1−cos2θ)/2'],
  ['formula_6',  '⑥', 'cos²θ = (1+cos2θ)/2'],
  ['formula_7',  '⑦', 'tanθ = sin2θ/(1+cos2θ)'],
  ['formula_8',  '⑧', 'tan²θ = (1−cos2θ)/(1+cos2θ)'],
  ['formula_9',  '⑨', '(sinθ+cosθ)² = sin²θ+2sinθcosθ+cos²θ'],
  ['formula_10', '⑩', 'sin⁴θ+cos⁴θ+2sin²θcos²θ = (sin²θ+cos²θ)²'],
  ['formula_11', '⑪', 'sin⁶θ+cos⁶θ = (sin²θ+cos²θ)(sin⁴θ−sin²θcos²θ+cos⁴θ)'],
  ['formula_12', '⑫', 'sin3θ = 3sinθ − 4sin³θ'],
  ['formula_13', '⑬', 'cos3θ = 4cos³θ − 3cosθ'],
  ['formula_14', '⑭', 'sinα+sinβ = 2sin((α+β)/2)·cos((α−β)/2)'],
  ['formula_15', '⑮', 'sinα·cosβ = (sin(α+β)+sin(α−β))/2'],
  ['formula_16', '⑯', 'tan2θ = 2tanθ/(1−tan²θ)'],
];

function defineMathBlocks() {
  Blockly.Blocks.custom_number = {
    init() {
      this.appendDummyInput().appendField(new Blockly.FieldNumber(1), 'NUM');
      this.setOutput(true, null);
      this.setColour(225);
    },
  };

  const basicTerms = [
    ['term_sin', 'sinθ'],
    ['term_cos', 'cosθ'],
    ['term_tan', 'tanθ'],
    ['term_sin2', 'sin2θ'],
    ['term_cos2', 'cos2θ'],
    ['term_theta', 'θ'],
    ['term_two_theta', '2θ'],
    ['term_three_theta', '3θ'],
    ['term_four_theta', '4θ'],
    ['term_five_theta', '5θ'],
    ['term_pi', 'π'],
    ['term_pi_sixth', 'π/6'],
    ['term_pi_quarter', 'π/4'],
    ['term_pi_third', 'π/3'],
    ['term_pi_half', 'π/2'],
    ['term_two_pi_thirds', '2π/3'],
    ['term_three_pi_quarters', '3π/4'],
    ['term_five_pi_sixths', '5π/6'],
    ['term_half_value', '1/2'],
    ['term_sqrt2_half', '√2/2'],
    ['term_sqrt3_half', '√3/2'],
  ];

  basicTerms.forEach(([type, label]) => {
    Blockly.Blocks[type] = {
      init() {
        this.appendDummyInput().appendField(label);
        this.setOutput(true, null);
        this.setColour(200);
      },
    };
  });

  const trigOfTerms = [
    ['term_sin_of', 'sin'],
    ['term_cos_of', 'cos'],
    ['term_tan_of', 'tan'],
  ];

  trigOfTerms.forEach(([type, label]) => {
    Blockly.Blocks[type] = {
      init() {
        this.appendValueInput('ANGLE').appendField(`${label}(`);
        this.appendDummyInput().appendField(')');
        this.setOutput(true, null);
        this.setColour(200);
      },
    };
  });

  Blockly.Blocks.math_add = {
    init() {
      this.appendValueInput('A');
      this.appendValueInput('B').appendField('+');
      this.setInputsInline(true);
      this.setOutput(true, null);
      this.setColour(30);
    },
  };

  Blockly.Blocks.math_negate = {
    init() {
      this.appendValueInput('A').appendField('-(');
      this.appendDummyInput().appendField(')');
      this.setInputsInline(true);
      this.setOutput(true, null);
      this.setColour(30);
    },
  };

  Blockly.Blocks.math_multiply = {
    init() {
      this.appendValueInput('A');
      this.appendValueInput('B').appendField('×');
      this.setInputsInline(true);
      this.setOutput(true, null);
      this.setColour(30);
    },
  };

  Blockly.Blocks.math_fraction = {
    init() {
      this.appendValueInput('NUMERATOR')
        .appendField(new FieldSpacer(0), 'NUMERATOR_PAD');
      this.appendDummyInput('FRACTION_LINE')
        .appendField(new FieldSpacer(0), 'LINE_PAD')
        .appendField('—', 'FRACTION_LINE');
      this.appendValueInput('DENOMINATOR')
        .appendField(new FieldSpacer(0), 'DENOMINATOR_PAD');
      this.setInputsInline(false);
      this.setOutput(true, null);
      this.setColour(30);
    },
    onchange(event) {
      if (!this.workspace || this.workspace.isDragging()) return;
      if (event && event.isUiEvent) return;

      const numeratorBlock = this.getInputTargetBlock('NUMERATOR');
      const denominatorBlock = this.getInputTargetBlock('DENOMINATOR');
      const numeratorWidth = numeratorBlock?.getHeightWidth?.().width || 0;
      const denominatorWidth = denominatorBlock?.getHeightWidth?.().width || 0;
      const maxWidth = Math.max(numeratorWidth, denominatorWidth, 24);

      const numeratorPad = Math.max(0, Math.round((maxWidth - numeratorWidth) / 2));
      const denominatorPad = Math.max(0, Math.round((maxWidth - denominatorWidth) / 2));
      const numeratorPadField = this.getField('NUMERATOR_PAD');
      const denominatorPadField = this.getField('DENOMINATOR_PAD');
      const linePadField = this.getField('LINE_PAD');
      if (numeratorPadField?.setWidth) numeratorPadField.setWidth(numeratorPad);
      if (denominatorPadField?.setWidth) denominatorPadField.setWidth(denominatorPad);
      if (linePadField?.setWidth) linePadField.setWidth(0);

      const dashCount = Math.max(3, Math.min(18, Math.round(maxWidth / 12)));
      const line = '—'.repeat(dashCount);
      const field = this.getField('FRACTION_LINE');
      if (field && field.getText && field.getText() !== line) {
        field.setValue(line);
      }
    },
  };

  Blockly.Blocks.math_square = {
    init() {
      this.appendValueInput('A');
      this.appendDummyInput().appendField('²');
      this.setInputsInline(true);
      this.setOutput(true, null);
      this.setColour(30);
    },
  };

  FORMULA_BLOCK_DEFS.forEach(([type, numberLabel, formulaLabel]) => {
    Blockly.Blocks[type] = {
      init() {
        // 番号と数式を別フィールドにすることで、見た目の区切りが分かりやすくなる
        // 番号は太字に、数式はそれより小さめに見せたい場合はCSSで .blocklyText を調整
        this.appendDummyInput()
          .appendField(numberLabel, 'FORMULA_NUMBER')
          .appendField(formulaLabel, 'FORMULA_TEXT');
        this.setOutput(true, null);
        this.setColour(260);
        // ホバー時のツールチップ（番号＋数式の両方を表示）
        this.setTooltip(`${numberLabel}  ${formulaLabel}`);
      },
    };
  });

  Blockly.Blocks.proof_step = {
    init() {
      this.appendDummyInput().appendField('証明');
      this.appendStatementInput('OPERATIONS').appendField('操作');
      this.setColour(210);
      this.setMovable(true);
      this.setDeletable(true);
    },
  };

  Blockly.Blocks.replace_operation = {
    init() {
      this.appendValueInput('VALUE').appendField('置き換え 式');
      this.appendDummyInput().appendField('【');
      this.appendValueInput('FORMULA').appendField('公式');
      this.appendDummyInput().appendField('】 →');
      this.appendValueInput('REPLACEMENT');
      this.setInputsInline(true);
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(120);
    },
  };

  Blockly.Blocks.common_denominator_operation = {
    init() {
      this.appendValueInput('VALUE').appendField('通分');
      this.appendDummyInput().appendField('→');
      this.appendValueInput('REPLACEMENT').appendField('後');
      this.setInputsInline(true);
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(120);
    },
  };

  Blockly.Blocks.conclusion_operation = {
    init() {
      this.appendValueInput('VALUE').appendField('よって');
      this.appendDummyInput().appendField('となる');
      this.setPreviousStatement(true, null);
      this.setNextStatement(false);
      this.setColour(20);
    },
  };

}
defineMathBlocks();