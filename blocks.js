// ===== Blocklyコンテキストメニューの日本語化 =====
// 右クリックメニュー項目の文言を日本語化し、ショートカットキーを併記する。
// Blockly本体読み込み後、ブロック定義より前に実行する必要がある。
(function localizeBlocklyMessages() {
  if (typeof Blockly === 'undefined' || !Blockly.Msg) return;
  const M = Blockly.Msg;
  // ブロックを右クリックしたときのメニュー
  M.DUPLICATE_BLOCK = '複製  (Ctrl+C → Ctrl+V)';
  M.ADD_COMMENT = 'コメントを追加';
  M.REMOVE_COMMENT = 'コメントを削除';
  M.DUPLICATE_COMMENT = 'コメントを複製';
  M.EDIT_COMMENT = 'コメントを編集';
  M.EXTERNAL_INPUTS = '外側に表示';
  M.INLINE_INPUTS = 'インラインに表示';
  M.DELETE_BLOCK = 'ブロックを削除  (Delete)';
  M.DELETE_X_BLOCKS = '%1個のブロックを削除  (Delete)';
  M.DELETE_ALL_BLOCKS = '全 %1 ブロックを削除しますか？';
  M.COLLAPSE_BLOCK = 'ブロックを折りたたむ';
  M.COLLAPSE_ALL = '全ブロックを折りたたむ';
  M.EXPAND_BLOCK = 'ブロックを展開';
  M.EXPAND_ALL = '全ブロックを展開';
  M.DISABLE_BLOCK = 'ブロックを無効化';
  M.ENABLE_BLOCK = 'ブロックを有効化';
  M.HELP = 'ヘルプ';
  // ワークスペース（背景）を右クリックしたときのメニュー
  M.UNDO = '元に戻す  (Ctrl+Z)';
  M.REDO = 'やり直し  (Ctrl+Shift+Z)';
  M.CLEAN_UP = 'ブロックを整列';
  // その他のよく出てくる文言
  M.CHANGE_VALUE_TITLE = '値を変更:';
  M.RENAME_VARIABLE = '変数の名前を変更…';
  M.NEW_VARIABLE = '新しい変数…';
  M.IOS_OK = 'OK';
  M.IOS_CANCEL = 'キャンセル';
})();

// ===== 不要なコンテキストメニュー項目の撤去 =====
// コメント機能・折りたたむ機能・無効化機能はこのアプリでは使わないので、
// 右クリックメニューから取り除く。
(function removeUnusedContextMenuItems() {
  if (typeof Blockly === 'undefined' || !Blockly.ContextMenuRegistry) return;
  const registry = Blockly.ContextMenuRegistry.registry;
  const itemsToRemove = [
    'blockComment',          // コメントを追加/削除
    'workspaceComment',      // ワークスペースコメント
    'collapseWorkspace',     // 全ブロックを折りたたむ
    'expandWorkspace',       // 全ブロックを展開
    'collapseBlock',         // ブロックを折りたたむ
    'expandBlock',           // ブロックを展開
    'blockDisable',          // ブロックを無効化/有効化
  ];
  itemsToRemove.forEach((id) => {
    try { registry.unregister(id); } catch (_) { /* 既に未登録なら無視 */ }
  });
})();


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

  // (A) - (B) の二項マイナス。math_add(A, math_negate(B)) の組み合わせより見やすい1ブロック。
  Blockly.Blocks.math_subtract = {
    init() {
      this.appendValueInput('A');
      // マイナス記号を NEG_SIGN フィールドにすることで、CSS で大きく表示できる
      this.appendValueInput('B').appendField('−', 'NEG_SIGN');
      this.setInputsInline(true);
      this.setOutput(true, null);
      this.setColour(30);
    },
  };

  Blockly.Blocks.math_negate = {
    init() {
      // マイナス記号(U+2212 MINUS SIGN) と '(' を別フィールドにして、
      // マイナスだけCSSで大きく見せられるようにする (data-argument-name="NEG_SIGN")
      this.appendValueInput('A')
        .appendField('−', 'NEG_SIGN')
        .appendField('(');
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

  // 通分ブロック：VALUE 入力に式を入れると、通分後の式を「実際のブロック」として
  // REPLACEMENT に自動構築・接続する。ユーザーは結果ブロックをコピー・再利用できる。
  // 
  // パフォーマンス対策:
  //   1. onchange は debounce (300ms) して連発を抑制
  //   2. VALUE の式が長すぎる場合は自動変換をスキップ（処理時間が爆発するため）
  //   3. 関心のあるイベントタイプだけを拾う
  // 通分ブロック：ボタン押下式
  //   VALUE 入力に式を入れて「通分する」ボタンを押すと、通分結果を
  //   ブロック構造として REPLACEMENT 入力に自動構築・接続する。
  //   onchange は使わないことで、Blockly のイベント連鎖による暴走を完全に回避。
  Blockly.Blocks.common_denominator_operation = {
    init() {
      const self = this;

      // 通分する ボタン用の SVG（データURL）
      const buttonSvg =
        'data:image/svg+xml;utf8,' +
        encodeURIComponent(
          '<svg xmlns="http://www.w3.org/2000/svg" width="60" height="30" viewBox="0 0 60 30">' +
          '<rect x="1" y="1" width="58" height="28" rx="6" ry="6" fill="#f8f8f8" stroke="#666" stroke-width="1"/>' +
          '<text x="30" y="20" text-anchor="middle" font-size="14" font-family="sans-serif" fill="#222">通分する</text>' +
          '</svg>'
        );

      this.appendValueInput('VALUE').appendField('通分');
      this.appendDummyInput()
        .appendField(
          new Blockly.FieldImage(buttonSvg, 60, 30, 'compute', function () {
            if (self && typeof self.updateCommonDenominatorReplacement === 'function') {
              console.log('[通分] ボタンクリック → 通分計算開始');
              self.updateCommonDenominatorReplacement();
            }
          })
        )
        .appendField('→');
      this.appendValueInput('REPLACEMENT');
      this.setInputsInline(true);
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(120);
      this.setTooltip('VALUE に式を入れて「通分する」ボタンを押すと、通分結果が REPLACEMENT に出ます');

      // 再帰防止フラグ
      this._isUpdatingReplacement = false;
    },
    /**
     * VALUE 接続のブロックを式文字列に変換し、通分結果をブロック構造として
     * REPLACEMENT 入力に自動接続する。「通分する」ボタンが押されたときに呼ばれる。
     */
    updateCommonDenominatorReplacement() {
      const valueBlock = this.getInputTargetBlock('VALUE');
      console.log('[通分] updateCommonDenominatorReplacement 呼び出し VALUE=', !!valueBlock);

      if (!valueBlock) {
        this._setReplacementBlock(null);
        return;
      }

      let exprStr = '';
      try {
        if (typeof Blockly.serialization?.blocks?.save === 'function'
            && typeof window.expressionFromSerializedBlock === 'function') {
          const serialized = Blockly.serialization.blocks.save(valueBlock);
          exprStr = window.expressionFromSerializedBlock(serialized) || '';
        }
      } catch (e) {
        exprStr = '';
      }

      console.log('[通分] VALUE の式=', exprStr);

      if (!exprStr) {
        this._setReplacementBlock(null);
        return;
      }

      // 式が長すぎる場合は自動化を諦める（重さ対策）
      if (exprStr.length > 100) {
        console.log('[通分] 式が長すぎるため自動通分をスキップ:', exprStr.length, '文字');
        this._setReplacementBlock(null);
        return;
      }

      let computed = '';
      try {
        if (typeof window.computeCommonDenominator === 'function') {
          computed = window.computeCommonDenominator(exprStr);
        }
      } catch (e) {
        computed = '';
      }

      console.log('[通分] 計算結果=', computed);

      if (!computed || computed === exprStr) {
        console.log('[通分] 通分不要 or 失敗');
        this._setReplacementBlock(null);
        return;
      }

      let blockJson = null;
      try {
        if (typeof window.mathExprToBlocklyJson === 'function') {
          blockJson = window.mathExprToBlocklyJson(computed);
        }
      } catch (e) {
        blockJson = null;
      }

      if (!blockJson) {
        console.log('[通分] ブロックJSON変換失敗');
        this._setReplacementBlock(null);
        return;
      }

      console.log('[通分] ブロック構築開始');
      this._setReplacementBlock(blockJson);
    },
    /**
     * REPLACEMENT 入力に指定したブロック JSON を接続する。
     */
    _setReplacementBlock(blockJson) {
      this._isUpdatingReplacement = true;
      try {
        const replacementInput = this.getInput('REPLACEMENT');
        if (!replacementInput) return;
        const connection = replacementInput.connection;
        if (!connection) return;

        const existingBlock = connection.targetBlock();
        if (existingBlock) {
          existingBlock.dispose(false);
        }

        if (!blockJson) return;

        const newBlock = Blockly.serialization.blocks.append(blockJson, this.workspace);
        if (newBlock && newBlock.outputConnection) {
          connection.connect(newBlock.outputConnection);
        }
      } catch (e) {
        console.warn('[common_denominator_operation] REPLACEMENT 更新失敗:', e);
      } finally {
        this._isUpdatingReplacement = false;
      }
    },
  };

  // 公式を使わない単純な計算・整理（緑色）
  // 例: sin²θ - (sin²θ + cos²θ) → -cos²θ （展開・整理だけで公式適用ではない）
  Blockly.Blocks.simplify_operation = {
    init() {
      this.appendValueInput('VALUE').appendField('計算 式');
      this.appendDummyInput().appendField('→');
      this.appendValueInput('REPLACEMENT');
      this.setInputsInline(true);
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(160); // 緑系（replace_operationの120と区別）
      this.setTooltip('公式を使わず、ただ計算・整理するときに使う');
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