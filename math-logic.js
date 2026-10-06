// ------------------------------------------------------------
// MathBlock math logic module
// 目的:
// - 数式評価ロジックを UI から分離
// - 公式レジストリと検証処理を一箇所に集約
// ------------------------------------------------------------

(function bootstrapMathLogic(globalScope) {
  const FORMULA_REGISTRY = {
    formula_1: {
      id: 'formula_1',
      text: 'sin(x)^2+cos(x)^2=1',
      label: '公式①',
      concept: 'pythagorean_identity',
      getSides: (thetaExpr = 'theta') => [`sin(${thetaExpr})^2 + cos(${thetaExpr})^2`, '1'],
    },
    formula_2: {
      id: 'formula_2',
      text: 'tan(x)=sin(x)/cos(x)',
      label: '公式②',
      concept: 'tan_as_sin_over_cos',
      getSides: (thetaExpr = 'theta') => [`tan(${thetaExpr})`, `(sin(${thetaExpr}) / cos(${thetaExpr}))`],
    },
    formula_3: {
      id: 'formula_3',
      text: '1+tan(x)^2=1/cos(x)^2',
      label: '公式③',
      concept: 'tan_pythagorean_relation',
      getSides: (thetaExpr = 'theta') => [`1 + tan(${thetaExpr})^2`, `(1 / cos(${thetaExpr})^2)`],
    },
    formula_4: {
      id: 'formula_4',
      text: 'sin(2*x)=2*sin(x)*cos(x)',
      label: '公式④',
      concept: 'double_angle_sin',
      getSides: (thetaExpr = 'theta') => [`sin(2 * ${thetaExpr})`, `(2 * sin(${thetaExpr}) * cos(${thetaExpr}))`],
    },
    formula_5: {
      id: 'formula_5',
      text: 'sin(x)^2=(1-cos(2*x))/2',
      label: '公式⑤',
      concept: 'half_angle_sin_square',
      getSides: (thetaExpr = 'theta') => [`sin(${thetaExpr})^2`, `((1 - cos(2 * ${thetaExpr})) / 2)`],
    },
    formula_6: {
      id: 'formula_6',
      text: 'cos(x)^2=(1+cos(2*x))/2',
      label: '公式⑥',
      concept: 'half_angle_cos_square',
      getSides: (thetaExpr = 'theta') => [`cos(${thetaExpr})^2`, `((1 + cos(2 * ${thetaExpr})) / 2)`],
    },
    formula_7: {
      id: 'formula_7',
      text: 'tan(x)=sin(2*x)/(1+cos(2*x))',
      label: '公式⑦',
      concept: 'double_angle_tan',
      getSides: (thetaExpr = 'theta') => [`tan(${thetaExpr})`, `(sin(2 * ${thetaExpr}) / (1 + cos(2 * ${thetaExpr})))`],
    },
    formula_8: {
      id: 'formula_8',
      text: 'tan(x)^2=(1-cos(2*x))/(1+cos(2*x))',
      label: '公式⑧',
      concept: 'tan_square_with_cos2',
      getSides: (thetaExpr = 'theta') => [`tan(${thetaExpr})^2`, `((1 - cos(2 * ${thetaExpr})) / (1 + cos(2 * ${thetaExpr})))`],
    },
    formula_9: {
      id: 'formula_9',
      text: '(sin(x)+cos(x))^2=sin(x)^2+2*sin(x)*cos(x)+cos(x)^2',
      label: '公式⑨',
      concept: 'square_expansion',
      getSides: (thetaExpr = 'theta') => [
        `(sin(${thetaExpr}) + cos(${thetaExpr}))^2`,
        `(sin(${thetaExpr})^2 + 2 * sin(${thetaExpr}) * cos(${thetaExpr}) + cos(${thetaExpr})^2)`,
      ],
    },
    formula_10: {
      id: 'formula_10',
      text: 'sin(x)^4+cos(x)^4+2*sin(x)^2*cos(x)^2=(sin(x)^2+cos(x)^2)^2',
      label: '公式⑩',
      concept: 'perfect_square_identity',
      getSides: (thetaExpr = 'theta') => [
        `(sin(${thetaExpr})^4 + cos(${thetaExpr})^4 + 2 * sin(${thetaExpr})^2 * cos(${thetaExpr})^2)`,
        `(sin(${thetaExpr})^2 + cos(${thetaExpr})^2)^2`,
      ],
    },
    formula_11: {
      id: 'formula_11',
      text: 'sin(x)^6+cos(x)^6=(sin(x)^2+cos(x)^2)*(sin(x)^4-sin(x)^2*cos(x)^2+cos(x)^4)',
      label: '公式⑪',
      concept: 'sixth_power_factorization',
      getSides: (thetaExpr = 'theta') => [
        `(sin(${thetaExpr})^6 + cos(${thetaExpr})^6)`,
        `(sin(${thetaExpr})^2 + cos(${thetaExpr})^2) * (sin(${thetaExpr})^4 - sin(${thetaExpr})^2 * cos(${thetaExpr})^2 + cos(${thetaExpr})^4)`,
      ],
    },
    formula_12: {
      id: 'formula_12',
      text: 'sin(3*x)=3*sin(x)-4*sin(x)^3',
      label: '公式⑫',
      concept: 'triple_angle_sin',
      getSides: (thetaExpr = 'theta') => [
        `sin(3 * ${thetaExpr})`,
        `(3 * sin(${thetaExpr}) - 4 * sin(${thetaExpr})^3)`,
      ],
    },
    formula_13: {
      id: 'formula_13',
      text: 'cos(3*x)=4*cos(x)^3-3*cos(x)',
      label: '公式⑬',
      concept: 'triple_angle_cos',
      getSides: (thetaExpr = 'theta') => [
        `cos(3 * ${thetaExpr})`,
        `(4 * cos(${thetaExpr})^3 - 3 * cos(${thetaExpr}))`,
      ],
    },
    formula_14: {
      id: 'formula_14',
      text: 'sin(x)+sin(y)=2*sin((x+y)/2)*cos((x-y)/2)',
      label: '公式⑭',
      concept: 'sum_to_product',
      getSides: (thetaExpr = 'theta') => {
        const parts = splitAngleExpression(thetaExpr);
        const a = parts?.a || thetaExpr;
        const b = parts?.b || '0';
        return [
          `sin(${a}) + sin(${b})`,
          `2 * sin(((${a}) + (${b})) / 2) * cos(((${a}) - (${b})) / 2)`,
        ];
      },
    },
    formula_15: {
      id: 'formula_15',
      text: 'sin(x)*cos(y)=(sin(x+y)+sin(x-y))/2',
      label: '公式⑮',
      concept: 'product_to_sum',
      getSides: (thetaExpr = 'theta') => {
        const parts = splitAngleExpression(thetaExpr);
        const a = parts?.a || thetaExpr;
        const b = parts?.b || '0';
        return [
          `sin(${a}) * cos(${b})`,
          `(sin((${a}) + (${b})) + sin((${a}) - (${b}))) / 2`,
        ];
      },
    },
    formula_16: {
      id: 'formula_16',
      text: 'tan(2*x)=(2*tan(x))/(1-tan(x)^2)',
      label: '公式⑯',
      concept: 'double_angle_tan',
      getSides: (thetaExpr = 'theta') => [
        `tan(2 * ${thetaExpr})`,
        `(2 * tan(${thetaExpr})) / (1 - tan(${thetaExpr})^2)`,
      ],
    },
    formula_addition_sin: {
      id: 'formula_addition_sin',
      text: 'sin(x+y)=sin(x)*cos(y)+cos(x)*sin(y)',
      label: '加法公式 sin',
      concept: 'addition_sin',
      getSides: (thetaExpr = 'theta') => {
        const parts = splitAngleExpression(thetaExpr);
        const a = parts?.a || thetaExpr;
        const b = parts?.b || '0';
        return [
          `sin((${a}) + (${b}))`,
          `sin(${a}) * cos(${b}) + cos(${a}) * sin(${b})`,
        ];
      },
    },
    formula_addition_cos: {
      id: 'formula_addition_cos',
      text: 'cos(x+y)=cos(x)*cos(y)-sin(x)*sin(y)',
      label: '加法公式 cos',
      concept: 'addition_cos',
      getSides: (thetaExpr = 'theta') => {
        const parts = splitAngleExpression(thetaExpr);
        const a = parts?.a || thetaExpr;
        const b = parts?.b || '0';
        return [
          `cos((${a}) + (${b}))`,
          `cos(${a}) * cos(${b}) - sin(${a}) * sin(${b})`,
        ];
      },
    },
    formula_addition_tan: {
      id: 'formula_addition_tan',
      text: 'tan(x+y)=(tan(x)+tan(y))/(1-tan(x)*tan(y))',
      label: '加法公式 tan',
      concept: 'addition_tan',
      getSides: (thetaExpr = 'theta') => {
        const parts = splitAngleExpression(thetaExpr);
        const a = parts?.a || thetaExpr;
        const b = parts?.b || '0';
        return [
          `tan((${a}) + (${b}))`,
          `(tan(${a}) + tan(${b})) / (1 - tan(${a}) * tan(${b}))`,
        ];
      },
    },
  };

  const OPERATION_TO_CONCEPT = {
    common_denominator_operation: 'common_denominator',
  };

  const CIRCLED_FORMULA_DIGIT_TO_NUMBER = {
    '①': 1,
    '②': 2,
    '③': 3,
    '④': 4,
    '⑤': 5,
    '⑥': 6,
    '⑦': 7,
    '⑧': 8,
    '⑨': 9,
    '⑩': 10,
    '⑪': 11,
    '⑫': 12,
    '⑬': 13,
    '⑭': 14,
    '⑮': 15,
    '⑯': 16,
  };

  const VALIDATION_EPSILON = 0.0001;

  // 数値サンプリングで同値判定するときのテスト点。
  // 各行が「1回のテスト」に対応し、行の中の値を変数へ順に割り当てる。
  // 変数が行の長さより多い場合はループして使い回す。
  //
  // ⚠️ 重要: 変数ごとに“違う値”を入れること。
  //   以前は全変数に同じ値を入れていたため、
  //     sin(a)+sin(b) と 2*sin(a) / a-b と 0 / sin(x)cos(y) と sin(y)cos(x)
  //   がすべて「同値」と誤判定されていた。θ 単独の問題では表面化しないが、
  //   公式⑭⑮や加法定理（2変数）を使う問題で破綻する。
  //
  // 点は「きれいな値」を避ける（π の倍数や 0 は偶然一致しやすいため）。
  const VALIDATION_SAMPLING_POINTS = [
    [0.5,  1.2,  2.3],
    [1.2,  0.37, 0.83],
    [2.3,  1.71, 0.29],
    [0.37, 2.11, 1.43],
    [0.83, 0.61, 1.97],
    [1.71, 2.53, 0.47],
    [-0.9, 0.73, 1.31],
  ];
  const RESERVED_MATH_SYMBOLS = new Set(['pi', 'e', 'i', 'Infinity', 'NaN']);

  function normalizeFormulaText(text) {
    return String(text || '').replace(/\s+/g, '').trim();
  }

  function formulaTextToId(formulaText) {
    const normalized = normalizeFormulaText(formulaText);
    const matched = Object.values(FORMULA_REGISTRY).find((entry) => entry.text === normalized);
    return matched ? matched.id : null;
  }

  function formulaIdToLabel(formulaId) {
    return FORMULA_REGISTRY[formulaId]?.label || formulaId;
  }

  function splitAngleExpression(thetaExpr) {
    const parsed = tryParseMathNode(thetaExpr);
    if (!parsed) return null;

    const normalized = unwrapParenthesisNode(parsed);
    if (!normalized || normalized.type !== 'OperatorNode') return null;
    if (!Array.isArray(normalized.args) || normalized.args.length !== 2) return null;
    if (normalized.op !== '+' && normalized.op !== '-') return null;

    const aExpr = nodeToExpression(normalized.args[0]);
    const bExprRaw = nodeToExpression(normalized.args[1]);
    if (!aExpr || !bExprRaw) return null;

    const bExpr = normalized.op === '-' ? `(-(${bExprRaw}))` : bExprRaw;
    return { a: aExpr, b: bExpr };
  }

  function toFormulaIdFromToken(token) {
    if (typeof token !== 'string') return null;
    const trimmed = token.trim();
    if (!trimmed) return null;

    if (/^formula_[a-z0-9_]+$/i.test(trimmed)) {
      return trimmed.toLowerCase();
    }

    const circledMatch = trimmed.match(/[①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯]/);
    if (circledMatch) {
      const number = CIRCLED_FORMULA_DIGIT_TO_NUMBER[circledMatch[0]];
      return number ? `formula_${number}` : null;
    }

    const numberMatch = trimmed.match(/^公式\s*(1[0-6]|[1-9])$/);
    if (numberMatch) {
      return `formula_${numberMatch[1]}`;
    }

    if (/^(1[0-6]|[1-9])$/.test(trimmed)) {
      return `formula_${trimmed}`;
    }

    return null;
  }

  function parseRequiredFormulaIds(requiredFormulaList) {
    if (!Array.isArray(requiredFormulaList)) return [];
    return requiredFormulaList
      .map((item) => toFormulaIdFromToken(typeof item === 'string' ? item : ''))
      .filter((id) => !!id);
  }

  function extractRequiredFormulaIdsFromHints(problemData) {
    if (!Array.isArray(problemData?.hints)) return [];

    const formulaIdSet = new Set();
    problemData.hints.forEach((hint) => {
      if (typeof hint !== 'string') return;

      const circledMatches = hint.match(/[①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯]/g) || [];
      circledMatches.forEach((char) => {
        const number = CIRCLED_FORMULA_DIGIT_TO_NUMBER[char];
        if (number) formulaIdSet.add(`formula_${number}`);
      });

      const plainMatches = hint.match(/公式\s*(1[0-6]|[1-9])/g) || [];
      plainMatches.forEach((match) => {
        const formulaId = toFormulaIdFromToken(match);
        if (formulaId) formulaIdSet.add(formulaId);
      });
    });

    return Array.from(formulaIdSet);
  }

  function getAnswerFormulaTypeSequence(problemData) {
    const proofBlock = problemData?.answerState?.blocks?.blocks?.find((block) => block?.type === 'proof_step');
    let current = proofBlock?.inputs?.OPERATIONS?.block || null;
    const formulas = [];

    while (current) {
      const formulaType = current?.inputs?.FORMULA?.block?.type;
      if (typeof formulaType === 'string' && formulaType.startsWith('formula_')) {
        formulas.push(formulaType);
      }
      current = current?.next?.block || null;
    }

    return formulas;
  }

  function getRequiredFormulaIdsForProblem(problemData) {
    const explicit = parseRequiredFormulaIds(problemData?.requiredFormulas || problemData?.requiredFormulaIds);
    if (explicit.length > 0) return Array.from(new Set(explicit));

    const fromHints = extractRequiredFormulaIdsFromHints(problemData);
    if (fromHints.length > 0) return Array.from(new Set(fromHints));

    const fromAnswer = getAnswerFormulaTypeSequence(problemData);
    return Array.from(new Set(fromAnswer));
  }

  function isSupportedFormulaId(formulaId) {
    return !!FORMULA_REGISTRY[formulaId];
  }

  function collectUsedFormulaIdsFromAST(astArray) {
    const used = new Set();
    if (!Array.isArray(astArray)) return used;

    astArray.forEach((stepData) => {
      const formulaId = formulaTextToId(stepData?.formula);
      if (formulaId) used.add(formulaId);
    });

    return used;
  }

  // (旧 safeValueToCode は削除。parseBlocksToAST が Blockly の
  //  シリアライズ結果を直接読む方式に変わり、generator を使わなくなったため)

  /**
   * Blockly ワークスペースを AST 配列へ変換する。
   * @param {object} targetWorkspace Blockly workspace
   * @returns {Array<{step:number,type:string,before:string,formula:string|null,after:string|null}>}
   */
  function parseBlocksToAST(targetWorkspace) {
    const ast = [];
    if (!targetWorkspace) return ast;

    // ライブのワークスペースを Blockly 標準 JSON にシリアライズし、
    // 保存データ用と同じ expressionFromSerializedBlock で式へ変換する。
    // （旧実装は未定義の mathGenerator に依存していたため常に空文字になっていた）
    let serialized = null;
    try {
      serialized = Blockly.serialization.workspaces.save(targetWorkspace);
    } catch (error) {
      serialized = null;
    }
    if (!serialized || !serialized.blocks || !Array.isArray(serialized.blocks.blocks)) {
      return ast;
    }

    const exprFromInput = (operationBlock, inputName) => {
      const inputBlock = readInputBlock(operationBlock, inputName);
      if (!inputBlock) return '';
      return expressionFromSerializedBlock(inputBlock) || '';
    };

    // FORMULA 入力には公式ブロック（formula_1 など）が入る。
    // expressionFromSerializedBlock は公式ブロック非対応なので、
    // ブロック type から FORMULA_REGISTRY の数式テキストを直接引く。
    const formulaTextFromInput = (operationBlock) => {
      const inputBlock = readInputBlock(operationBlock, 'FORMULA');
      const type = inputBlock && typeof inputBlock.type === 'string' ? inputBlock.type : '';
      if (type && FORMULA_REGISTRY[type] && typeof FORMULA_REGISTRY[type].text === 'string') {
        return FORMULA_REGISTRY[type].text;
      }
      return '';
    };

    const proofSteps = serialized.blocks.blocks.filter(
      (block) => block && block.type === 'proof_step',
    );
    if (proofSteps.length === 0) {
      return ast;
    }

    let stepIndex = 1;

    console.log('[parseBlocksToAST] シリアライズされたトップブロック数:', serialized.blocks.blocks.length, 'proof_step数:', proofSteps.length);
    proofSteps.forEach((proofStep) => {
      let currentOperation = proofStep?.inputs?.OPERATIONS?.block || null;
      console.log('[parseBlocksToAST] proof_step内の最初の操作ブロック:', currentOperation?.type);

      while (currentOperation) {
        const type = String(currentOperation.type || '');

        const before = exprFromInput(currentOperation, 'VALUE');
        const formula = type === 'replace_operation'
          ? formulaTextFromInput(currentOperation)
          : null;
        
        // after の決定:
        //   - conclusion_operation: null
        //   - common_denominator_operation: REPLACEMENT があればそれ、なければ自動計算
        //   - その他: REPLACEMENT そのまま
        let after;
        if (type === 'conclusion_operation') {
          after = null;
        } else if (type === 'common_denominator_operation') {
          const fromInput = exprFromInput(currentOperation, 'REPLACEMENT');
          if (fromInput) {
            after = fromInput;
          } else if (before) {
            after = computeCommonDenominator(String(before));
          } else {
            after = '';
          }
        } else {
          after = exprFromInput(currentOperation, 'REPLACEMENT');
        }

        ast.push({
          step: stepIndex,
          type,
          before: before == null ? '' : String(before),
          formula: formula == null ? null : String(formula),
          after: after == null ? null : String(after),
        });

        stepIndex += 1;
        currentOperation = currentOperation?.next?.block || null;
      }
    });

    console.log('[parseBlocksToAST] 完成したAST:', JSON.stringify(ast));
    return ast;
  }

  function readInputBlock(serializedBlock, inputName) {
    return serializedBlock?.inputs?.[inputName]?.block || null;
  }

  function expressionFromSerializedBlock(block) {
    if (!block || typeof block.type !== 'string') return '';

    switch (block.type) {
      case 'custom_number': {
        const num = block?.fields?.NUM;
        return num == null ? '0' : String(num);
      }
      case 'term_sin':
        return 'sin(theta)';
      case 'term_cos':
        return 'cos(theta)';
      case 'term_tan':
        return 'tan(theta)';
      case 'term_sin2':
        return 'sin(2 * theta)';
      case 'term_cos2':
        return 'cos(2 * theta)';
      case 'term_theta':
        return 'theta';
      case 'term_alpha':
        return 'alpha';
      case 'term_beta':
        return 'beta';
      case 'term_two_theta':
        return '(2 * theta)';
      case 'term_three_theta':
        return '(3 * theta)';
      case 'term_four_theta':
        return '(4 * theta)';
      case 'term_five_theta':
        return '(5 * theta)';
      case 'term_pi':
        return 'pi';
      case 'term_pi_sixth':
        return '(pi/6)';
      case 'term_pi_quarter':
        return '(pi/4)';
      case 'term_pi_third':
        return '(pi/3)';
      case 'term_pi_half':
        return '(pi/2)';
      case 'term_two_pi_thirds':
        return '((2*pi)/3)';
      case 'term_three_pi_quarters':
        return '((3*pi)/4)';
      case 'term_five_pi_sixths':
        return '((5*pi)/6)';
      case 'term_half_value':
        return '(1/2)';
      case 'term_sqrt2_half':
        return '(sqrt(2)/2)';
      case 'term_sqrt3_half':
        return '(sqrt(3)/2)';
      case 'term_sin_of': {
        const angle = expressionFromSerializedBlock(readInputBlock(block, 'ANGLE')) || '0';
        return `sin(${angle})`;
      }
      case 'term_cos_of': {
        const angle = expressionFromSerializedBlock(readInputBlock(block, 'ANGLE')) || '0';
        return `cos(${angle})`;
      }
      case 'term_tan_of': {
        const angle = expressionFromSerializedBlock(readInputBlock(block, 'ANGLE')) || '0';
        return `tan(${angle})`;
      }
      case 'math_add': {
        const a = expressionFromSerializedBlock(readInputBlock(block, 'A')) || '0';
        const b = expressionFromSerializedBlock(readInputBlock(block, 'B')) || '0';
        return `(${a} + ${b})`;
      }
      case 'math_subtract': {
        const a = expressionFromSerializedBlock(readInputBlock(block, 'A')) || '0';
        const b = expressionFromSerializedBlock(readInputBlock(block, 'B')) || '0';
        return `(${a} - ${b})`;
      }
      case 'math_negate': {
        const a = expressionFromSerializedBlock(readInputBlock(block, 'A')) || '0';
        return `(-(${a}))`;
      }
      case 'math_multiply': {
        const a = expressionFromSerializedBlock(readInputBlock(block, 'A')) || '1';
        const b = expressionFromSerializedBlock(readInputBlock(block, 'B')) || '1';
        return `(${a} * ${b})`;
      }
      case 'math_fraction': {
        const numerator = expressionFromSerializedBlock(readInputBlock(block, 'NUMERATOR')) || '0';
        const denominator = expressionFromSerializedBlock(readInputBlock(block, 'DENOMINATOR')) || '1';
        return `(${numerator}) / (${denominator})`;
      }
      case 'math_square': {
        const a = expressionFromSerializedBlock(readInputBlock(block, 'A')) || '0';
        return `(${a})^2`;
      }
      default:
        return '';
    }
  }

  // 問題の左辺（証明開始時の式）を取得 = initialState のトップブロック1番目
  function getInitialLeftExpression(problemData) {
    const top = (problemData?.initialState?.blocks?.blocks || []).filter(
      (block) => block && block.type !== 'proof_step',
    );
    if (top.length >= 1) {
      return expressionFromSerializedBlock(top[0]) || '';
    }
    return '';
  }

  // 問題の右辺（証明のゴール）を取得 = initialState のトップブロック2番目
  function getInitialRightExpression(problemData) {
    const top = (problemData?.initialState?.blocks?.blocks || []).filter(
      (block) => block && block.type !== 'proof_step',
    );
    if (top.length >= 2) {
      return expressionFromSerializedBlock(top[1]) || '';
    }
    return '';
  }

  function getExpectedConclusionExpression(problemData) {
    
    // 優先1: answerState のトップブロック2番目（問題の右辺 = 証明のゴール）
    // proof_step内のconclusionはブロック接続が不完全なことがあるため使わない
    const topMathBlocks = (problemData?.answerState?.blocks?.blocks || []).filter(
      (block) => block && block.type !== 'proof_step',
    );
    if (topMathBlocks.length >= 2) {
      const rightSideExpr = expressionFromSerializedBlock(topMathBlocks[1]);
      if (rightSideExpr) return rightSideExpr;
    }

    // 優先2: initialState のトップブロック2番目（フォールバック）
    const initTopBlocks = (problemData?.initialState?.blocks?.blocks || []).filter(
      (block) => block && block.type !== 'proof_step',
    );
    if (initTopBlocks.length >= 2) {
      const rightSideExpr = expressionFromSerializedBlock(initTopBlocks[1]);
      if (rightSideExpr) return rightSideExpr;
    }

    return '';
  }

  function tryParseMathNode(expr) {
    const text = String(expr || '').trim();
    if (!text) return null;
    try {
      return math.parse(text);
    } catch (error) {
      return null;
    }
  }

  /**
   * 式文字列から変数名を抽出する。
   * @param {string} exprString math.js で解釈可能な式
   * @returns {string[]}
   */
  function extractVariables(exprString) {
    const parsed = tryParseMathNode(exprString);
    if (!parsed) return [];

    const variableSet = new Set();

    parsed.traverse((node, _path, parent) => {
      if (!node || node.type !== 'SymbolNode' || typeof node.name !== 'string') return;
      const isFunctionName = !!(parent && parent.type === 'FunctionNode' && parent.fn === node);
      if (isFunctionName) return;
      if (RESERVED_MATH_SYMBOLS.has(node.name)) return;
      variableSet.add(node.name);
    });

    return Array.from(variableSet);
  }

  /**
   * 2 つの式が数学的に同値かをサンプリング評価で判定する。
   * @param {string} leftExpr
   * @param {string} rightExpr
   * @returns {{ok: boolean, reason?: string}}
   */
  // ============================================
  // 構造的等価判定: 順序入れ替えは許すが簡単化はしない（B案）
  // 例: 1+tan²θ と tan²θ+1 は等価、sin²θ+cos²θ と 1 は別扱い
  // ============================================
  function canonicalizeAst(node) {
    if (!node) return node;
    // mathjs の AST に対して、加算・乗算の引数を正規順序にソートする
    // 数値の単純な簡約 (1+1 → 2 など) は一切しない
    try {
      const transformed = node.transform(function (n) {
        if (n && n.isOperatorNode && (n.op === '+' || n.op === '*') && Array.isArray(n.args)) {
          // 各子ノードも先に正規化済みになる（transformは深さ優先）
          // ソートキーは正規化後の文字列表現
          const sorted = n.args.slice().sort((a, b) => {
            const sa = a && typeof a.toString === 'function' ? a.toString() : String(a);
            const sb = b && typeof b.toString === 'function' ? b.toString() : String(b);
            return sa < sb ? -1 : sa > sb ? 1 : 0;
          });
          // 引数を入れ替えた新ノードを作る
          if (typeof math.OperatorNode === 'function') {
            return new math.OperatorNode(n.op, n.fn, sorted);
          }
        }
        return n;
      });
      return transformed;
    } catch (e) {
      return node;
    }
  }

  function canonicalExpression(exprString) {
    // 文字列 → AST → 正規化 → 文字列
    if (typeof exprString !== 'string') return '';
    const trimmed = exprString.trim();
    if (!trimmed) return '';
    try {
      const node = math.parse(trimmed);
      const canon = canonicalizeAst(node);
      return canon && typeof canon.toString === 'function' ? canon.toString() : trimmed;
    } catch (e) {
      return trimmed;
    }
  }

  // 二つの式が「構造として等価」(順序入れ替えのみ許容、簡単化なし) を判定
  function isStructurallyEquivalent(leftExpr, rightExpr) {
    const leftCanon = canonicalExpression(leftExpr);
    const rightCanon = canonicalExpression(rightExpr);
    if (!leftCanon || !rightCanon) return false;
    return leftCanon === rightCanon;
  }

  // ---- 式のコンパイル結果キャッシュ ----------------------------------
  // math.evaluate(expr, scope) は呼ぶたびにパース＋コンパイルを行う。
  // 同じ式をサンプル点7つぶん評価し、それを公式19個ぶん繰り返すため、
  // 同一文字列のコンパイルが何百回も走っていた。
  // math.compile() の結果を使い回してパースを1回に減らす。
  const compiledCache = new Map();
  const COMPILED_CACHE_LIMIT = 400; // 際限なく増えないよう上限を設ける

  function getCompiled(expr) {
    const key = String(expr);
    if (compiledCache.has(key)) return compiledCache.get(key);

    let compiled = null;
    try {
      compiled = math.compile(key);
    } catch (_) {
      compiled = null; // パース不能。null もキャッシュして再試行を防ぐ
    }
    if (compiledCache.size >= COMPILED_CACHE_LIMIT) compiledCache.clear();
    compiledCache.set(key, compiled);
    return compiled;
  }

  // ---- 同値判定の結果キャッシュ --------------------------------------
  // detectMatchingFormulaIds は同じ (左辺, 右辺) の組を何度も問い合わせる。
  const equivalenceCache = new Map();
  const EQUIVALENCE_CACHE_LIMIT = 600;

  function evaluateEquivalence(leftExpr, rightExpr) {
    // 完全一致なら計算するまでもない
    if (String(leftExpr) === String(rightExpr)) return { ok: true };

    const cacheKey = leftExpr + '\u0000' + rightExpr;
    const cached = equivalenceCache.get(cacheKey);
    if (cached !== undefined) return cached;

    const result = evaluateEquivalenceUncached(leftExpr, rightExpr);
    if (equivalenceCache.size >= EQUIVALENCE_CACHE_LIMIT) equivalenceCache.clear();
    equivalenceCache.set(cacheKey, result);
    return result;
  }

  function evaluateEquivalenceUncached(leftExpr, rightExpr) {
    const variables = Array.from(new Set([
      ...extractVariables(leftExpr),
      ...extractVariables(rightExpr),
    ]));

    if (variables.length === 0) {
      try {
        const lc = getCompiled(leftExpr);
        const rc = getCompiled(rightExpr);
        if (!lc || !rc) return { ok: false, reason: 'eval-error' };
        const leftValue = lc.evaluate({});
        const rightValue = rc.evaluate({});

        if (!Number.isFinite(leftValue) || !Number.isFinite(rightValue)) {
          return { ok: false, reason: 'non-finite' };
        }

        if (Math.abs(leftValue - rightValue) > VALIDATION_EPSILON) {
          return { ok: false, reason: 'mismatch' };
        }

        return { ok: true };
      } catch (error) {
        const rawMessage = error && error.message ? String(error.message) : '';
        const isDivisionByZero = /division\s+by\s+zero|divide\s+by\s+zero|Infinity/i.test(rawMessage);
        return { ok: false, reason: isDivisionByZero ? 'division-by-zero' : 'eval-error' };
      }
    }

    // 変数名を固定順にソートしておく（毎回同じ値が入るように＝判定を再現可能にする）
    const sortedVariables = variables.slice().sort();

    let evaluatedCount = 0; // 実際に比較できた点の数

    for (const samplePoint of VALIDATION_SAMPLING_POINTS) {
      try {
        const scope = {};
        sortedVariables.forEach((varName, varIndex) => {
          // 変数ごとに違う値を割り当てる。変数が多い場合は点をループして使う。
          scope[varName] = samplePoint[varIndex % samplePoint.length];
        });

        const leftValue = math.evaluate(leftExpr, scope);
        const rightValue = math.evaluate(rightExpr, scope);

        if (!Number.isFinite(leftValue) || !Number.isFinite(rightValue)) {
          // tan(θ) が発散する点など、その1点だけ評価できないケースは
          // 「不一致」ではなく「この点はスキップ」として扱う。
          // ただし全点がスキップになった場合は下で non-finite を返す。
          continue;
        }

        if (Math.abs(leftValue - rightValue) > VALIDATION_EPSILON) {
          return { ok: false, reason: 'mismatch' };
        }

        evaluatedCount += 1;
      } catch (error) {
        const rawMessage = error && error.message ? String(error.message) : '';
        const isDivisionByZero = /division\s+by\s+zero|divide\s+by\s+zero|Infinity/i.test(rawMessage);
        return { ok: false, reason: isDivisionByZero ? 'division-by-zero' : 'eval-error' };
      }
    }

    // 全ての点で発散していた（例: 分母が恒等的に0）場合は同値と認めない
    if (evaluatedCount === 0) {
      return { ok: false, reason: 'non-finite' };
    }

    return { ok: true };
  }

  function unwrapParenthesisNode(node) {
    let current = node || null;
    while (current && current.type === 'ParenthesisNode') {
      current = current.content;
    }
    return current;
  }

  function nodeToExpression(node) {
    const unwrapped = unwrapParenthesisNode(node);
    if (!unwrapped || typeof unwrapped.toString !== 'function') return '';
    return unwrapped.toString({ parenthesis: 'auto' }).trim();
  }

  function getFunctionNodeName(node) {
    if (!node || node.type !== 'FunctionNode') return '';
    if (typeof node.name === 'string' && node.name) return node.name;
    const fnNode = node.fn;
    if (fnNode && fnNode.type === 'SymbolNode' && typeof fnNode.name === 'string') {
      return fnNode.name;
    }
    return '';
  }

  function isNumericConstantNode(node, expectedValue) {
    const target = unwrapParenthesisNode(node);
    if (!target || target.type !== 'ConstantNode') return false;
    const numericValue = Number(target.value);
    if (!Number.isFinite(numericValue)) return false;
    return Math.abs(numericValue - expectedValue) <= Number.EPSILON;
  }

  function stripOuterParens(expr) {
    const parsed = tryParseMathNode(expr);
    if (!parsed) return String(expr || '').trim();
    return nodeToExpression(parsed);
  }

  function extractTrigArguments(expr) {
    const parsed = tryParseMathNode(expr);
    if (!parsed) return [];

    const args = [];
    parsed.traverse((node) => {
      if (!node || node.type !== 'FunctionNode') return;

      const functionName = getFunctionNodeName(node);
      if (functionName !== 'sin' && functionName !== 'cos' && functionName !== 'tan') return;

      const argNode = Array.isArray(node.args) ? node.args[0] : null;
      const argExpr = nodeToExpression(argNode);
      if (argExpr) {
        args.push(argExpr);
      }
    });

    return args;
  }

  function extractTrigFunctionCounts(expr) {
    const parsed = tryParseMathNode(expr);
    if (!parsed) return null;

    const counts = {
      sin: 0,
      cos: 0,
      tan: 0,
    };

    parsed.traverse((node) => {
      if (!node || node.type !== 'FunctionNode') return;
      const functionName = getFunctionNodeName(node);
      if (functionName === 'sin' || functionName === 'cos' || functionName === 'tan') {
        counts[functionName] += 1;
      }
    });

    return counts;
  }

  function hasEquivalentSubexpression(targetExpr, containerExpr) {
    const parsed = tryParseMathNode(containerExpr);
    if (!parsed) return false;

    let found = false;
    let visited = 0;
    const maxNodes = 240;

    parsed.traverse((node) => {
      if (found || visited >= maxNodes) return;
      visited += 1;

      const candidate = nodeToExpression(node);
      if (!candidate) return;
      if (evaluateEquivalence(targetExpr, candidate).ok) {
        found = true;
      }
    });

    return found;
  }

  function canSkipChainMismatch(prevStepData, currentStepData) {
    const prevType = String(prevStepData?.type || '');
    const currentType = String(currentStepData?.type || '');
    if (!prevType || !currentType) return false;
    return prevType === 'replace_operation' && currentType === 'replace_operation';
  }

  function hasTrigProfileChanged(beforeExpr, afterExpr) {
    const beforeCounts = extractTrigFunctionCounts(beforeExpr);
    const afterCounts = extractTrigFunctionCounts(afterExpr);
    if (!beforeCounts || !afterCounts) return false;

    return beforeCounts.sin !== afterCounts.sin
      || beforeCounts.cos !== afterCounts.cos
      || beforeCounts.tan !== afterCounts.tan;
  }

  function deriveHalfAngleCandidate(expr) {
    const parsed = tryParseMathNode(expr);
    if (!parsed) return null;

    const normalizedNode = unwrapParenthesisNode(parsed);
    if (!normalizedNode || normalizedNode.type !== 'OperatorNode') return null;
    if (normalizedNode.op !== '*' || !Array.isArray(normalizedNode.args) || normalizedNode.args.length !== 2) return null;

    const leftNode = normalizedNode.args[0];
    const rightNode = normalizedNode.args[1];

    if (isNumericConstantNode(leftNode, 2)) {
      return nodeToExpression(rightNode) || null;
    }

    if (isNumericConstantNode(rightNode, 2)) {
      return nodeToExpression(leftNode) || null;
    }

    return null;
  }

  function extractDivisionParts(expr) {
    const parsed = tryParseMathNode(expr);
    if (!parsed) return null;

    const normalizedNode = unwrapParenthesisNode(parsed);
    if (!normalizedNode || normalizedNode.type !== 'OperatorNode') return null;
    if (normalizedNode.op !== '/' || !Array.isArray(normalizedNode.args) || normalizedNode.args.length !== 2) return null;

    const numerator = nodeToExpression(normalizedNode.args[0]);
    const denominator = nodeToExpression(normalizedNode.args[1]);
    if (!numerator || !denominator) return null;

    return { numerator, denominator };
  }

  function verifyFormulaApplication(formulaId, beforeExpr, afterExpr) {
    const candidateSet = new Set(['theta']);
    const trigArgs = [
      ...extractTrigArguments(beforeExpr),
      ...extractTrigArguments(afterExpr),
    ];

    trigArgs.forEach((arg) => {
      const cleaned = stripOuterParens(arg);
      if (cleaned) candidateSet.add(cleaned);
      const half = deriveHalfAngleCandidate(cleaned);
      if (half) candidateSet.add(half);
    });

    const formulaDef = FORMULA_REGISTRY[formulaId];
    if (!formulaDef || typeof formulaDef.getSides !== 'function') return false;

    for (const thetaExpr of candidateSet) {
      const sides = formulaDef.getSides(`(${thetaExpr})`);
      if (!sides) continue;
      const [leftSide, rightSide] = sides;

      const direct = evaluateEquivalence(beforeExpr, leftSide).ok && evaluateEquivalence(afterExpr, rightSide).ok;
      if (direct) return true;

      const reverse = evaluateEquivalence(beforeExpr, rightSide).ok && evaluateEquivalence(afterExpr, leftSide).ok;
      if (reverse) return true;

      const beforeFraction = extractDivisionParts(beforeExpr);
      const afterFraction = extractDivisionParts(afterExpr);
      if (beforeFraction && afterFraction) {
        const denominatorCheck = evaluateEquivalence(beforeFraction.denominator, afterFraction.denominator);
        if (denominatorCheck.ok) {
          const numeratorDirect = evaluateEquivalence(beforeFraction.numerator, leftSide).ok
            && evaluateEquivalence(afterFraction.numerator, rightSide).ok;
          if (numeratorDirect) return true;

          const numeratorReverse = evaluateEquivalence(beforeFraction.numerator, rightSide).ok
            && evaluateEquivalence(afterFraction.numerator, leftSide).ok;
          if (numeratorReverse) return true;
        }
      }

      if (formulaId === 'formula_2') {
        const tanOverSin = `(tan(${thetaExpr}) / sin(${thetaExpr}))`;
        const oneOverCos = `(1 / cos(${thetaExpr}))`;
        const derivedDirect = evaluateEquivalence(beforeExpr, tanOverSin).ok
          && evaluateEquivalence(afterExpr, oneOverCos).ok;
        if (derivedDirect) return true;

        const derivedReverse = evaluateEquivalence(beforeExpr, oneOverCos).ok
          && evaluateEquivalence(afterExpr, tanOverSin).ok;
        if (derivedReverse) return true;

        const oneOverTan = `(1 / tan(${thetaExpr}))`;
        const cosOverSin = `(cos(${thetaExpr}) / sin(${thetaExpr}))`;
        const reciprocalDirect = evaluateEquivalence(beforeExpr, oneOverTan).ok
          && evaluateEquivalence(afterExpr, cosOverSin).ok;
        if (reciprocalDirect) return true;

        const reciprocalReverse = evaluateEquivalence(beforeExpr, cosOverSin).ok
          && evaluateEquivalence(afterExpr, oneOverTan).ok;
        if (reciprocalReverse) return true;
      }

      // 差分による検証（部分置換のケースを救う）
      // before - after の差が、公式の関係（左辺 - 右辺）の式と等価か
      // 例: before=「sin²θ - 1」、after=「sin²θ - (sin²θ + cos²θ)」のとき
      //     before - after = (sin²θ + cos²θ) - 1 これは公式①の左辺-右辺と等価
      const diffExpr = `((${beforeExpr}) - (${afterExpr}))`;
      const evidenceForward = `((${leftSide}) - (${rightSide}))`;
      const evidenceBackward = `((${rightSide}) - (${leftSide}))`;
      
      if (evaluateEquivalence(diffExpr, evidenceForward).ok) return true;
      if (evaluateEquivalence(diffExpr, evidenceBackward).ok) return true;
    }

    return false;
  }

  function detectMatchingFormulaIds(beforeExpr, afterExpr) {
    const allFormulaIds = Object.keys(FORMULA_REGISTRY);
    return allFormulaIds.filter((formulaId) => verifyFormulaApplication(formulaId, beforeExpr, afterExpr));
  }

  function collectAppliedFormulaIdsFromAST(astArray) {
    const applied = new Set();
    if (!Array.isArray(astArray)) return applied;

    astArray.forEach((stepData) => {
      const operationType = String(stepData?.type || '');
      if (operationType !== 'replace_operation') return;

      const formulaExpr = typeof stepData.formula === 'string' ? stepData.formula.trim() : '';
      const beforeExpr = typeof stepData.before === 'string' ? stepData.before.trim() : '';
      const afterExpr = typeof stepData.after === 'string' ? stepData.after.trim() : '';
      if (!formulaExpr || !beforeExpr || !afterExpr) return;

      const formulaId = formulaTextToId(formulaExpr);
      if (!formulaId) return;

      if (verifyFormulaApplication(formulaId, beforeExpr, afterExpr)) {
        applied.add(formulaId);
      }
    });

    return applied;
  }

  function getTransformSteps(astArray) {
    if (!Array.isArray(astArray)) return [];
    return astArray.filter((stepData) => {
      const operationType = String(stepData?.type || '');
      return operationType === 'replace_operation'
        || operationType === 'common_denominator_operation'
        || operationType === 'simplify_operation';
    });
  }

  // ============================================
  // 厳密な判定（2026-10 追加）
  //
  // 以前は「式の値が等しいか」だけを見ていた。三角関数の公式はどの θ でも成り立つので、
  //   - 「計算」ブロック1個で左辺 → 右辺に飛ぶ
  //   - 違う公式を指定して置き換える
  // といった答えも正解になっていた（verifyFormulaApplication の差分判定は事実上いつも true）。
  //
  // そこで sinθ・cosθ・tanθ を「互いに無関係な文字 S, C, T」に置き換えて比べる:
  //   free … S, C, T を全部バラバラの値にする（＝ふつうの文字式の計算だけで等しいか）
  //   f1   … S²+C²=1 だけ成り立つ値（公式①だけを使ってよい）
  //   f2   … T=S/C だけ成り立つ値（公式②だけを使ってよい）
  //   f3   … 1+T²=1/C² だけ成り立つ値（公式③だけを使ってよい）
  // ============================================
  // 公式ID → 「その公式だけが成り立つ世界」のモード名
  //   f1/f2/f3  … 同じ角どうしの関係（①②③）
  //   add_*     … 違う角をまたぐ関係（加法定理）。角どうしの足し算の関係を見つけて適用する
  const STRICT_FORMULA_MODES = {
    formula_1: 'f1',
    formula_2: 'f2',
    formula_3: 'f3',
    formula_addition_sin: 'add_sin',
    formula_addition_cos: 'add_cos',
    formula_addition_tan: 'add_tan',
  };
  const ADDITION_MODES = ['add_sin', 'add_cos', 'add_tan'];
  const STRICT_SAMPLE_COUNT = 12;

  function normalizeTrigArg(node) {
    let str = node.toString({ parenthesis: 'auto' }).replace(/\s+/g, '');
    while (/^\(.*\)$/.test(str)) {
      let depth = 0, wraps = true;
      for (let i = 0; i < str.length - 1; i++) {
        if (str[i] === '(') depth++;
        else if (str[i] === ')') depth--;
        if (depth === 0) { wraps = false; break; }
      }
      if (!wraps) break;
      str = str.slice(1, -1);
    }
    return str;
  }

  // 複数の式を、共通の S_i / C_i / T_i 記号に置き換えてコンパイルする
  function compileAlgebraic(exprs) {
    const args = [];
    const compiled = [];
    for (const expr of exprs) {
      let node;
      try { node = math.parse(String(expr)); } catch (_) { return null; }
      const replaced = node.transform((n) => {
        if (n && n.isFunctionNode && n.fn && ['sin', 'cos', 'tan'].includes(n.fn.name) && n.args.length === 1) {
          const key = normalizeTrigArg(n.args[0]);
          let idx = args.indexOf(key);
          if (idx < 0) { args.push(key); idx = args.length - 1; }
          return new math.SymbolNode(n.fn.name[0].toUpperCase() + '_' + idx);
        }
        return n;
      });
      try { compiled.push(replaced.compile()); } catch (_) { return null; }
    }
    return { args, compiled };
  }

  // 角どうしの足し算の関係を見つける。
  //   args = ['alpha', 'beta', 'alpha+beta'] のとき [{k:2, i:0, j:1}] を返す。
  //   （「3番目の角は、1番目と2番目の角を足したもの」という意味）
  // 加法定理は「違う角をまたぐ関係」なので、どの角とどの角の和なのかが分からないと判定できない。
  // 角の式に乱数を入れて実際に足し算が成り立つかを見る。偶然の一致を避けるため3通りで確かめる。
  function findAngleSums(args) {
    if (!Array.isArray(args) || args.length < 2) return [];
    let nodes;
    try { nodes = args.map((a) => math.parse(a)); } catch (_) { return []; }

    const vars = new Set();
    nodes.forEach((n) => n.traverse((x) => {
      if (x && x.isSymbolNode && !['pi', 'e', 'i'].includes(x.name)) vars.add(x.name);
    }));

    let candidates = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      const rng = makeRng(777 + attempt * 101);
      const scope = { pi: Math.PI, e: Math.E };
      vars.forEach((v) => { scope[v] = 0.3 + rng() * 2.1; });
      let values;
      try { values = nodes.map((n) => n.compile().evaluate(scope)); } catch (_) { return []; }
      if (values.some((v) => typeof v !== 'number' || !Number.isFinite(v))) return [];

      const found = new Set();
      for (let k = 0; k < values.length; k++) {
        for (let i = 0; i < values.length; i++) {
          for (let j = i; j < values.length; j++) {
            if (k === i || k === j) continue;
            if (Math.abs(values[k] - (values[i] + values[j])) < 1e-9) found.add(k + ',' + i + ',' + j);
          }
        }
      }
      candidates = candidates === null ? found : new Set([...candidates].filter((x) => found.has(x)));
      if (candidates.size === 0) return [];
    }
    return [...candidates].map((key) => {
      const [k, i, j] = key.split(',').map(Number);
      return { k, i, j };
    });
  }

  // 再現性のある疑似乱数（同じ答えには毎回同じ判定）
  function makeRng(seed) {
    let x = seed >>> 0;
    return () => { x = (x * 1664525 + 1013904223) >>> 0; return x / 4294967296; };
  }

  function strictScope(mode, argCount, rng, angleSums) {
    const scope = { theta: 0.3 + rng() * 1.1, pi: Math.PI, e: Math.E };
    const free = () => (rng() < 0.5 ? -1 : 1) * (0.35 + rng() * 1.6);
    for (let i = 0; i < argCount; i++) {
      const phi = 0.2 + rng() * 1.2 + (rng() < 0.5 ? 0 : Math.PI);
      let S = free(), C = free(), T = free();
      if (mode === 'f1') { S = Math.sin(phi); C = Math.cos(phi); }
      else if (mode === 'f2') { T = S / C; }
      else if (mode === 'f3') { C = Math.cos(phi); T = Math.tan(phi); }
      scope['S_' + i] = S; scope['C_' + i] = C; scope['T_' + i] = T;
    }

    // 加法定理のモードでは、和の角の値だけを「足し算の関係」から計算し直す。
    // それ以外（①②③の関係）は成り立たないままなので、公式の取り違えを見逃さない。
    if (ADDITION_MODES.includes(mode) && Array.isArray(angleSums) && angleSums.length > 0) {
      // 入れ子（(α+β)+γ など）に備えて数回まわす
      for (let pass = 0; pass < 3; pass++) {
        angleSums.forEach(({ k, i, j }) => {
          const Si = scope['S_' + i], Ci = scope['C_' + i], Ti = scope['T_' + i];
          const Sj = scope['S_' + j], Cj = scope['C_' + j], Tj = scope['T_' + j];
          if (mode === 'add_sin') scope['S_' + k] = Si * Cj + Ci * Sj;
          else if (mode === 'add_cos') scope['C_' + k] = Ci * Cj - Si * Sj;
          else if (mode === 'add_tan') scope['T_' + k] = (Ti + Tj) / (1 - Ti * Tj);
        });
      }
    }
    return scope;
  }

  /** mode の関係だけを使って exprA と exprB が等しいか */
  function strictEquivalent(exprA, exprB, mode) {
    if (String(exprA) === String(exprB)) return true;
    const c = compileAlgebraic([exprA, exprB]);
    if (!c) return false;
    const angleSums = ADDITION_MODES.includes(mode) ? findAngleSums(c.args) : null;
    const rng = makeRng(20261006);
    let checked = 0;
    for (let k = 0; k < STRICT_SAMPLE_COUNT; k++) {
      const scope = strictScope(mode, c.args.length, rng, angleSums);
      let a, b;
      try { a = c.compiled[0].evaluate(scope); b = c.compiled[1].evaluate(scope); } catch (_) { continue; }
      if (typeof a !== 'number' || typeof b !== 'number' || !Number.isFinite(a) || !Number.isFinite(b)) continue;
      if (Math.abs(a - b) > 1e-7 * Math.max(1, Math.abs(a), Math.abs(b))) return false;
      checked++;
    }
    return checked >= 4;
  }

  /** 置き換えブロックの判定: 'ok' | 'not-used' | 'mismatch' | null(厳密判定の対象外の公式) */
  function strictFormulaCheck(formulaId, beforeExpr, afterExpr) {
    const mode = STRICT_FORMULA_MODES[formulaId];
    if (!mode) return null;
    if (strictEquivalent(beforeExpr, afterExpr, 'free')) return 'not-used';
    return strictEquivalent(beforeExpr, afterExpr, mode) ? 'ok' : 'mismatch';
  }

  function strictMatchingFormulaLabels(beforeExpr, afterExpr) {
    return Object.keys(STRICT_FORMULA_MODES)
      .filter((id) => strictEquivalent(beforeExpr, afterExpr, STRICT_FORMULA_MODES[id]))
      .map((id) => formulaIdToLabel(id));
  }

  function getErrorMessage(errorCode, stepIndex, suggestions) {
    const stepPrefix = stepIndex == null ? '' : `${stepIndex}段目: `;
    const suggestionText = Array.isArray(suggestions) && suggestions.length > 0
      ? ` 候補: ${suggestions.join(' / ')}`
      : '';

    switch (errorCode) {
      case 'ERROR_NO_PROOF_BLOCK':
        return '「証明」ブロックが見つからないよ。左のメニューから出してみよう。';
      case 'ERROR_EMPTY_INPUT':
        return `${stepPrefix}空っぽの穴があるよ。ブロックをちゃんと繋げてね。`;
      case 'ERROR_DIVISION_BY_ZERO':
        return `${stepPrefix}計算がおかしくなっちゃった（分母が0かも？）。式を見直してみてね。`;
      case 'ERROR_EQUATION_MISMATCH':
        return `${stepPrefix}変身前と変身後が合っていないみたい。公式と式を見直してみよう！`;
      case 'ERROR_EVALUATION':
        return `${stepPrefix}ちゃんと繋がっていないブロックがあるみたい。確認してね。`;
      case 'ERROR_FORMULA_REQUIRED':
        return `${stepPrefix}置き換えには「公式」ブロックが必要だよ。穴に入れてね。`;
      case 'ERROR_UNSUPPORTED_FORMULA':
        return `${stepPrefix}その公式は使えないよ。別の公式を試そう。`;
      case 'ERROR_FORMULA_MISMATCH':
        return `${stepPrefix}使った公式と、式の変身が合っていないよ。${suggestionText}`.trim();
      case 'ERROR_FORMULA_NOT_USED':
        return `${stepPrefix}この置き換えでは公式を使っていないよ。ふつうの計算なら「計算」ブロックを使おう。`;
      case 'ERROR_SIMPLIFY_NEEDS_FORMULA':
        return `${stepPrefix}「計算」「通分」ブロックでは公式を使った書き換えはできないよ。公式を使うところは「置き換え」ブロックで、使う公式を入れてね。`;
      case 'ERROR_COMMON_DENOMINATOR_RULE':
        return `${stepPrefix}「通分」ブロックでは公式は使えないよ。「置き換え」ブロックを使おう！`;
      case 'ERROR_CHAIN_EMPTY_INPUT':
        return `${stepPrefix}前の段とつながっていないよ。式を確認してね。`;
      case 'ERROR_CHAIN_DIVISION_BY_ZERO':
        return `${stepPrefix}前の式との比較で0割が発生したよ。`;
      case 'ERROR_CHAIN_MISMATCH':
        return `${stepPrefix}前の式とつながっていないよ。もう一度見直してね。`;
      case 'ERROR_CHAIN_EVALUATION':
        return `${stepPrefix}前の式とつながっているか確認できないよ。`;
      case 'ERROR_NO_CONCLUSION':
        return '最後は「よって〜となる」ブロックで終わらせてね。';
      case 'ERROR_FINAL_EMPTY':
        return '結論の式が空だよ！正しい式を入れてね。';
      case 'ERROR_FINAL_DIVISION_BY_ZERO':
        return '結論の式で0割が起きているよ。';
      case 'ERROR_FINAL_MISMATCH':
        return '最後の式が目標と違うみたい。もっと変身させてみよう！';
      case 'ERROR_FINAL_EVALUATION':
        return '結論の式が正しく読み取れないよ。';
      case 'ERROR_INITIAL_LEFT_MISMATCH':
        return `${stepPrefix}最初の式が、問題の左辺と一致していないよ。問題の左側の式から始めよう。`;
      case 'ERROR_CONCLUSION_NOT_GOAL':
        return '「よって」の中身が、問題の右辺と一致していないよ。ゴールの式を入れてね。';
      case 'ERROR_CONCLUSION_NOT_LAST_RESULT':
        return '「よって」の中身が、最後の変形結果と一致していないよ。';
      case 'ERROR_NO_TRANSFORM':
        return '「よって」だけでは証明にならないよ。式を変形するブロック（置き換え・通分・計算）を入れて、左辺から右辺へ変形しよう。';
      case 'ERROR_NO_CHANGE':
        return `${stepPrefix}変形前と変形後が同じだよ。実際に式を変えてね。`;
      case 'ERROR_PROBLEM_DATA_MISSING':
        return '問題データに左辺・右辺が定義されていません。問題JSONの initialState を確認してください（コンソールに詳細あり）。';
      default:
        return 'エラーが起きたよ。ブロックと式を見直してみよう！';
    }
  }

  /**
   * AST と問題データを突き合わせて証明全体を検証する。
   * @param {Array} astArray parseBlocksToAST の結果
   * @param {object} problemData 現在の問題 JSON
   * @returns {{isValid:boolean,errorStepIndex:number|null,errorCode:string|null,suggestions:string[]}}
   */
  /**
   * 証明全体を検証する（仕様B案: 順序入れ替えは許すが簡単化は許さない）
   * 
   * 検証ステップ:
   *   1. 最初の操作の before が、問題の左辺と「構造的に等価」
   *   2. 各 replace の before → after が選んだ公式の正しい適用
   *   3. 各通分の前後で三角関数の構成が不変
   *   4. 直前の after と次の before が「構造的に等価」
   *   5. 最後の操作の after（よって以外）が問題の右辺と「構造的に等価」
   *   6. 「よって」の中身が問題の右辺と「構造的に等価」
   */
  /**
   * 証明全体を検証する（最新仕様）
   * 要件:
   *   1. 操作（replace / common_denominator / simplify）が1個以上
   *   2. 最初の操作の before が問題の左辺と「数値的に等価」
   *   3. 最後の操作の after が問題の右辺と「数値的に等価」
   *   4. 各操作で before と after が「構造的に異なる」（実際に変えた）
   *   5. 各操作の before/after が「数値的に等価」（変形が正しい）
   *   6. 連鎖: 直前の after ≡ 次の before（数値的等価）
   *   7. よってブロックの中身 ≡ 問題の右辺（数値的に等価）
   *   8. replace の場合は公式IDが妥当で verifyFormulaApplication が通る
   *
   * 「数値的に等価」 = evaluateEquivalence（簡単化を許す数値サンプリング）
   * 「構造的に等価」 = isStructurallyEquivalent（順序入れ替えのみ許す）
   *
   * simplify_operation: 公式を使わず単純に計算・整理するだけ。
   *   要件4と5（構造的に違う＋数値的に等価）だけチェックし、公式適用チェックは行わない。
   */
  function validateProof(astArray, problemData) {
    if (!Array.isArray(astArray) || astArray.length === 0) {
      return { isValid: false, errorStepIndex: null, errorCode: 'ERROR_NO_PROOF_BLOCK', suggestions: [] };
    }

    const initialLeftExpr = getInitialLeftExpression(problemData);
    const initialRightExpr = getInitialRightExpression(problemData);
    console.log('[validateProof] 左辺=', initialLeftExpr, ' 右辺=', initialRightExpr);

    if (!initialLeftExpr || !initialRightExpr) {
      console.warn('[validateProof] 問題データに左辺または右辺が定義されていません', {
        initialLeft: initialLeftExpr,
        initialRight: initialRightExpr,
        problemData_initialState: problemData?.initialState,
      });
      return { isValid: false, errorStepIndex: null, errorCode: 'ERROR_PROBLEM_DATA_MISSING', suggestions: [] };
    }

    // 「よって」ブロックの存在チェック
    const lastStep = astArray[astArray.length - 1] || null;
    if (!lastStep || lastStep.type !== 'conclusion_operation') {
      return {
        isValid: false,
        errorStepIndex: lastStep && Number.isFinite(lastStep.step) ? lastStep.step : astArray.length,
        errorCode: 'ERROR_NO_CONCLUSION',
        suggestions: [],
      };
    }

    // 要件1: 変形ステップが1個以上
    const transformSteps = getTransformSteps(astArray);
    if (transformSteps.length === 0) {
      return {
        isValid: false,
        errorStepIndex: lastStep.step || 1,
        errorCode: 'ERROR_NO_TRANSFORM',
        suggestions: [],
      };
    }

    // 要件2: 最初の操作の before が問題の左辺と数値的に等価
    const firstStep = transformSteps[0];
    const firstBefore = typeof firstStep.before === 'string' ? firstStep.before.trim() : '';
    console.log('[validateProof] 最初の操作のbefore=', firstBefore);
    if (!firstBefore) {
      return { isValid: false, errorStepIndex: firstStep.step || 1, errorCode: 'ERROR_EMPTY_INPUT', suggestions: [] };
    }
    const leftCheck = evaluateEquivalence(firstBefore, initialLeftExpr);
    if (!leftCheck.ok || !strictEquivalent(firstBefore, initialLeftExpr, 'free')) {
      return { isValid: false, errorStepIndex: firstStep.step || 1, errorCode: 'ERROR_INITIAL_LEFT_MISMATCH', suggestions: [] };
    }

    // 要件4, 5, 8: 各操作を個別に検証
    for (const stepData of transformSteps) {
      const stepIndex = Number.isFinite(stepData.step) ? stepData.step : 1;
      const operationType = String(stepData.type || '');
      const beforeExpr = typeof stepData.before === 'string' ? stepData.before.trim() : '';
      const afterExpr = typeof stepData.after === 'string' ? stepData.after.trim() : '';
      const formulaExpr = typeof stepData.formula === 'string' ? stepData.formula.trim() : '';

      if (!beforeExpr || !afterExpr) {
        return { isValid: false, errorStepIndex: stepIndex, errorCode: 'ERROR_EMPTY_INPUT', suggestions: [] };
      }

      // 要件4: before と after が構造的に違う（実際に変形した）
      if (isStructurallyEquivalent(beforeExpr, afterExpr)) {
        return { isValid: false, errorStepIndex: stepIndex, errorCode: 'ERROR_NO_CHANGE', suggestions: [] };
      }

      // 要件5: before と after が数値的に等価（変形が正しい）
      const sameStepCheck = evaluateEquivalence(beforeExpr, afterExpr);
      if (!sameStepCheck.ok) {
        if (sameStepCheck.reason === 'non-finite' || sameStepCheck.reason === 'division-by-zero') {
          return { isValid: false, errorStepIndex: stepIndex, errorCode: 'ERROR_DIVISION_BY_ZERO', suggestions: [] };
        }
        if (sameStepCheck.reason === 'mismatch') {
          return { isValid: false, errorStepIndex: stepIndex, errorCode: 'ERROR_EQUATION_MISMATCH', suggestions: [] };
        }
        return { isValid: false, errorStepIndex: stepIndex, errorCode: 'ERROR_EVALUATION', suggestions: [] };
      }

      // 要件8: replace_operation の公式チェック（他の操作には適用しない）
      if (operationType === 'replace_operation') {
        if (!formulaExpr) {
          return { isValid: false, errorStepIndex: stepIndex, errorCode: 'ERROR_FORMULA_REQUIRED', suggestions: [] };
        }
        const formulaId = formulaTextToId(formulaExpr);
        if (!formulaId) {
          return { isValid: false, errorStepIndex: stepIndex, errorCode: 'ERROR_UNSUPPORTED_FORMULA', suggestions: [] };
        }
        const strict = strictFormulaCheck(formulaId, beforeExpr, afterExpr);
        if (strict === 'not-used') {
          return { isValid: false, errorStepIndex: stepIndex, errorCode: 'ERROR_FORMULA_NOT_USED', suggestions: [] };
        }
        if (strict === 'mismatch') {
          const candidates = strictMatchingFormulaLabels(beforeExpr, afterExpr).filter((l) => l !== formulaIdToLabel(formulaId));
          return { isValid: false, errorStepIndex: stepIndex, errorCode: 'ERROR_FORMULA_MISMATCH', suggestions: candidates };
        }
        const formulaMatch = strict === 'ok' || verifyFormulaApplication(formulaId, beforeExpr, afterExpr);
        if (!formulaMatch) {
          const candidates = (typeof detectMatchingFormulaIds === 'function'
            ? detectMatchingFormulaIds(beforeExpr, afterExpr)
            : []
          ).filter((c) => c !== formulaId).map((c) => formulaIdToLabel(c));
          return { isValid: false, errorStepIndex: stepIndex, errorCode: 'ERROR_FORMULA_MISMATCH', suggestions: candidates };
        }
      }
      // 「計算」「通分」は公式を使わない計算だけを許す（S, C, T を独立した文字として等しいこと）
      if ((operationType === 'simplify_operation' || operationType === 'common_denominator_operation')
          && !strictEquivalent(beforeExpr, afterExpr, 'free')) {
        return { isValid: false, errorStepIndex: stepIndex, errorCode: 'ERROR_SIMPLIFY_NEEDS_FORMULA', suggestions: [] };
      }
    }

    // 要件6: 操作間の連鎖（直前の after ≡ 次の before）
    for (let i = 1; i < transformSteps.length; i++) {
      const prevAfterExpr = typeof transformSteps[i - 1].after === 'string' ? transformSteps[i - 1].after.trim() : '';
      const currentBeforeExpr = typeof transformSteps[i].before === 'string' ? transformSteps[i].before.trim() : '';
      const currentStepIndex = Number.isFinite(transformSteps[i].step) ? transformSteps[i].step : i + 1;

      if (!prevAfterExpr || !currentBeforeExpr) {
        return { isValid: false, errorStepIndex: currentStepIndex, errorCode: 'ERROR_CHAIN_EMPTY_INPUT', suggestions: [] };
      }
      const chainCheck = evaluateEquivalence(prevAfterExpr, currentBeforeExpr);
      if (chainCheck.ok && !strictEquivalent(prevAfterExpr, currentBeforeExpr, 'free')) {
        return { isValid: false, errorStepIndex: currentStepIndex, errorCode: 'ERROR_CHAIN_MISMATCH', suggestions: [] };
      }
      if (!chainCheck.ok) {
        if (chainCheck.reason === 'non-finite' || chainCheck.reason === 'division-by-zero') {
          return { isValid: false, errorStepIndex: currentStepIndex, errorCode: 'ERROR_CHAIN_DIVISION_BY_ZERO', suggestions: [] };
        }
        if (chainCheck.reason === 'mismatch') {
          return { isValid: false, errorStepIndex: currentStepIndex, errorCode: 'ERROR_CHAIN_MISMATCH', suggestions: [] };
        }
        return { isValid: false, errorStepIndex: currentStepIndex, errorCode: 'ERROR_CHAIN_EVALUATION', suggestions: [] };
      }
    }

    // 要件3: 最後の操作の after が問題の右辺と数値的に等価
    const lastTransform = transformSteps[transformSteps.length - 1];
    const lastAfterExpr = typeof lastTransform.after === 'string' ? lastTransform.after.trim() : '';
    console.log('[validateProof] 最後の操作のafter=', lastAfterExpr, ' 右辺=', initialRightExpr);
    if (!lastAfterExpr) {
      return { isValid: false, errorStepIndex: lastTransform.step || transformSteps.length, errorCode: 'ERROR_FINAL_EMPTY', suggestions: [] };
    }
    const finalAfterCheck = evaluateEquivalence(lastAfterExpr, initialRightExpr);
    if (!finalAfterCheck.ok || !strictEquivalent(lastAfterExpr, initialRightExpr, 'free')) {
      return { isValid: false, errorStepIndex: lastTransform.step || transformSteps.length, errorCode: 'ERROR_FINAL_MISMATCH', suggestions: [] };
    }

    // 要件7: よってブロックの中身が問題の右辺と数値的に等価
    const conclusionExpr = typeof lastStep.before === 'string' ? lastStep.before.trim() : '';
    console.log('[validateProof] よっての中身=', conclusionExpr, ' 右辺=', initialRightExpr);
    if (!conclusionExpr) {
      return { isValid: false, errorStepIndex: lastStep.step || astArray.length, errorCode: 'ERROR_FINAL_EMPTY', suggestions: [] };
    }
    const conclusionCheck = evaluateEquivalence(conclusionExpr, initialRightExpr);
    if (!conclusionCheck.ok || !strictEquivalent(conclusionExpr, initialRightExpr, 'free')) {
      return { isValid: false, errorStepIndex: lastStep.step || astArray.length, errorCode: 'ERROR_CONCLUSION_NOT_GOAL', suggestions: [] };
    }

    return { isValid: true, errorStepIndex: null, errorCode: null, suggestions: [] };
  }

  // ============================================
  // 通分の自動計算
  // 戦略: 式の構文木(AST)を辿り、sin/cos/tan の呼び出しを
  //       （引数が何であれ）一時変数に置換 → math.rationalize → 元に戻す。
  //       正規表現の決め打ちではなく AST ベースなので、
  //       cos(2*theta) や sin(theta/2) のような任意の角度にも対応できる。
  // ============================================

  // 通分計算で扱う異なる三角関数項の数の上限（重さ対策）
  const COMMON_DENOMINATOR_MAX_TRIG_TERMS = 8;

  /**
   * 式の AST を辿り、sin/cos/tan の FunctionNode を一時変数 (SymbolNode) に置換する。
   * 同じ関数名・同じ引数（文字列表現が一致）の呼び出しは同じ変数にまとめる。
   * 戻り値: { substitutedNode, restoreMap }
   *   restoreMap: 一時変数名 → 元の FunctionNode（クローン）
   */
  function substituteTrigFunctionsInNode(node) {
    const restoreMap = new Map(); // varName -> 元のFunctionNodeクローン
    const keyToVarName = new Map(); // "fnName|argString" -> varName
    let counter = 0;

    const substitutedNode = node.transform((n) => {
      if (n.isFunctionNode) {
        const fnName = n.fn && n.fn.name;
        if (fnName === 'sin' || fnName === 'cos' || fnName === 'tan') {
          const argString = n.args && n.args[0] ? n.args[0].toString() : '';
          const key = `${fnName}|${argString}`;
          let varName = keyToVarName.get(key);
          if (!varName) {
            varName = `_TRIGVAR${counter}`;
            counter += 1;
            keyToVarName.set(key, varName);
            restoreMap.set(varName, n.clone());
          }
          return new math.SymbolNode(varName);
        }
      }
      return n;
    });

    return { substitutedNode, restoreMap, distinctCount: keyToVarName.size };
  }

  /**
   * AST を辿り、一時変数 (SymbolNode) を元の三角関数呼び出しに復元する。
   */
  function restoreTrigFunctionsInNode(node, restoreMap) {
    return node.transform((n) => {
      if (n.isSymbolNode && restoreMap.has(n.name)) {
        return restoreMap.get(n.name).clone();
      }
      return n;
    });
  }

  /**
   * 式を通分する。
   * sin/cos/tan の呼び出しを（引数を問わず）一時変数に置換してから
   * math.rationalize で通分し、元の三角関数表記に復元する。
   * 通分できない・不要な場合や、異なる三角関数項が多すぎる場合は入力をそのまま返す。
   */
  function computeCommonDenominator(expr) {
    const trimmed = String(expr || '').trim();
    if (!trimmed) return '';
    try {
      const node = math.parse(trimmed);
      const { substitutedNode, restoreMap, distinctCount } = substituteTrigFunctionsInNode(node);

      // 異なる三角関数項が多すぎる場合は自動化を諦める（重さ対策）
      if (distinctCount > COMMON_DENOMINATOR_MAX_TRIG_TERMS) {
        return trimmed;
      }

      const ratNode = math.rationalize(substitutedNode);
      const restoredNode = restoreTrigFunctionsInNode(ratNode, restoreMap);
      return restoredNode.toString();
    } catch (e) {
      // rationalize できないときは入力をそのまま返す（通分不要扱い）
      return trimmed;
    }
  }

  /**
   * 内部表記の式を、人間が読みやすい形にフォーマットする。
   * 例: sin(theta)^2 → sin²θ,  tan(theta) → tanθ,  * → ·
   */
  /**
   * 内部表現の式を、人が読める形に整える。
   *
   * 以前は生の文字列に正規表現をかけるだけだったので、実データにある
   * `(sin(theta))^2` のように括弧でくるまれた形にマッチせず、
   * `((sinθ)^2 + (cosθ)^2)` のような読みにくい文字列がそのまま出ていた。
   * 一度 mathjs にパースさせて括弧を最小化してから置換する。
   *
   * 例: (((sin(theta))^2+(cos(theta))^2))/((sin(theta)*cos(theta)))
   *     → (sin²θ + cos²θ)/(sinθ·cosθ)
   *
   * @param {string} expr 内部表現の式
   * @returns {string} 表示用の文字列
   */
  function prettyFormatExpression(expr) {
    if (!expr) return '';
    let s = String(expr);

    // ① mathjs に整形させて冗長な括弧を落とす（失敗したら元の文字列で続行）
    try {
      s = math.parse(s).toString({ parenthesis: 'auto', implicit: 'hide' });
    } catch (_) { /* パースできない式はそのまま扱う */ }

    // ② 累乗を上付き文字に
    s = s.replace(/\s*\^\s*2\b/g, '²').replace(/\s*\^\s*3\b/g, '³');

    // ③ 三角関数を日本語表記に。いったん空白付きにしてから
    //    「sin θ²」→「sin²θ」の順に組み替える
    [['theta', 'θ'], ['alpha', 'α'], ['beta', 'β']].forEach(([name, mark]) => {
      const fn = new RegExp('(sin|cos|tan)\\(' + name + '\\)', 'g');
      s = s.replace(fn, '$1 ' + mark);
      s = s.replace(new RegExp('(sin|cos|tan) ' + mark + '([²³])', 'g'), '$1$2' + mark);
      s = s.replace(new RegExp('(sin|cos|tan) ' + mark, 'g'), '$1' + mark);
      s = s.replace(new RegExp('\\b' + name + '\\b', 'g'), mark);
    });

    // ④ 記号の見た目を整える
    s = s.replace(/\s*\*\s*/g, '·');
    s = s.replace(/\s*\/\s*/g, '/');

    return s.replace(/\s+/g, ' ').trim();
  }

  // ============================================
  // mathjs の式（文字列または AST）→ Blockly ブロックの JSON 構造への変換
  // ユーザーが通分結果を「実際のブロック」として扱えるようにするため。
  // 対応する Blockly ブロック:
  //   custom_number, term_theta, term_sin_of/cos_of/tan_of,
  //   math_add, math_subtract, math_negate, math_multiply, math_fraction, math_square
  // ============================================

  // 内部ヘルパ: 1つの数値で `custom_number` ブロック JSON を作る
  function _bNumber(n) {
    return { type: 'custom_number', fields: { NUM: n } };
  }
  function _bTermTheta() { return { type: 'term_theta' }; }
  function _bSinOf(angle) {
    return { type: 'term_sin_of', inputs: { ANGLE: { block: angle } } };
  }
  function _bCosOf(angle) {
    return { type: 'term_cos_of', inputs: { ANGLE: { block: angle } } };
  }
  function _bTanOf(angle) {
    return { type: 'term_tan_of', inputs: { ANGLE: { block: angle } } };
  }
  function _bAdd(a, b) {
    return { type: 'math_add', inputs: { A: { block: a }, B: { block: b } } };
  }
  function _bSubtract(a, b) {
    return { type: 'math_subtract', inputs: { A: { block: a }, B: { block: b } } };
  }
  function _bNegate(a) {
    return { type: 'math_negate', inputs: { A: { block: a } } };
  }
  function _bMultiply(a, b) {
    return { type: 'math_multiply', inputs: { A: { block: a }, B: { block: b } } };
  }
  function _bFraction(num, den) {
    return { type: 'math_fraction', inputs: { NUMERATOR: { block: num }, DENOMINATOR: { block: den } } };
  }
  function _bSquare(a) {
    return { type: 'math_square', inputs: { A: { block: a } } };
  }

  // 既製の短縮ブロック（sin2θ, cos2θ など）
  function _bTermSin2() { return { type: 'term_sin2' }; }
  function _bTermCos2() { return { type: 'term_cos2' }; }
  // 角度の短縮ブロック (2θ, 3θ, 4θ, 5θ)
  const _N_THETA_BLOCKS = {
    2: 'term_two_theta',
    3: 'term_three_theta',
    4: 'term_four_theta',
    5: 'term_five_theta',
  };

  /**
   * arg ノードが N*theta（または theta*N）の形か判定し、N が整数で対応する
   * 短縮角度ブロック (term_two_theta 等) があれば、そのブロック JSON を返す。
   * 合致しなければ null。
   */
  function _matchNThetaShortcut(argNode) {
    if (!argNode || !argNode.isOperatorNode) return null;
    if (argNode.op !== '*' || !argNode.args || argNode.args.length !== 2) return null;
    const [a, b] = argNode.args;
    let nVal = null;
    let isTheta = false;
    if (a.isConstantNode && b.isSymbolNode && b.name === 'theta') {
      nVal = a.value; isTheta = true;
    } else if (b.isConstantNode && a.isSymbolNode && a.name === 'theta') {
      nVal = b.value; isTheta = true;
    }
    if (!isTheta || typeof nVal !== 'number' || !Number.isInteger(nVal)) return null;
    const typeName = _N_THETA_BLOCKS[nVal];
    return typeName ? { type: typeName } : null;
  }

  /**
   * sin/cos(N*theta) のような典型パターンに既製ブロック（term_sin2, term_cos2 等）が
   * あれば、それを返す。なければ null（呼び出し元で通常の term_sin_of などにフォールバック）。
   */
  function _detectTrigShortcut(fnName, argNode) {
    if (!argNode) return null;
    // sin(2*theta) / cos(2*theta) -> term_sin2 / term_cos2
    if (argNode.isOperatorNode && argNode.op === '*' && argNode.args && argNode.args.length === 2) {
      const [a, b] = argNode.args;
      const isTwoTheta =
        (a.isConstantNode && a.value === 2 && b.isSymbolNode && b.name === 'theta') ||
        (b.isConstantNode && b.value === 2 && a.isSymbolNode && a.name === 'theta');
      if (isTwoTheta) {
        if (fnName === 'sin') return _bTermSin2();
        if (fnName === 'cos') return _bTermCos2();
      }
    }
    return null;
  }

  /**
   * mathjs の AST ノードを Blockly ブロック JSON に変換する。
   * 未対応のノードや変換失敗時は null を返す。
   */
  function mathNodeToBlocklyJson(node) {
    if (!node) return null;

    // 数値リテラル
    if (node.isConstantNode) {
      const v = node.value;
      if (typeof v === 'number') {
        // 負の数は math_negate で包む（custom_number は正の数前提）
        if (v < 0) return _bNegate(_bNumber(-v));
        return _bNumber(v);
      }
      return _bNumber(0);
    }

    // シンボル（変数）
    if (node.isSymbolNode) {
      if (node.name === 'theta') return _bTermTheta();
      if (node.name === 'alpha') return { type: 'term_alpha' };
      if (node.name === 'beta') return { type: 'term_beta' };
      return null; // それ以外の変数は未対応
    }

    // 関数呼び出し（sin, cos, tan）
    if (node.isFunctionNode) {
      const fnName = node.fn?.name || node.name;
      const arg = node.args && node.args[0];

      // ショートカット: sin(N*theta), cos(N*theta) の N=2,3,4,5 は既製ブロックがある
      // (tan には対応する term_tan2 等が無いので扱わない)
      const shortcut = _detectTrigShortcut(fnName, arg);
      if (shortcut) return shortcut;

      const argBlock = mathNodeToBlocklyJson(arg);
      if (!argBlock) return null;
      if (fnName === 'sin') return _bSinOf(argBlock);
      if (fnName === 'cos') return _bCosOf(argBlock);
      if (fnName === 'tan') return _bTanOf(argBlock);
      return null;
    }

    // 演算子
    if (node.isOperatorNode) {
      const op = node.op;
      const args = node.args || [];

      // 単項マイナス: -A
      if (op === '-' && args.length === 1) {
        const a = mathNodeToBlocklyJson(args[0]);
        return a ? _bNegate(a) : null;
      }

      // 二項マイナス: A - B → math_subtract（1ブロックで A − B を表現）
      if (op === '-' && args.length === 2) {
        const a = mathNodeToBlocklyJson(args[0]);
        const b = mathNodeToBlocklyJson(args[1]);
        if (!a || !b) return null;
        return _bSubtract(a, b);
      }

      // 加算: 多項のときは左結合で reduce
      if (op === '+' && args.length >= 2) {
        const parts = args.map(mathNodeToBlocklyJson);
        if (parts.some((p) => !p)) return null;
        return parts.reduce((acc, p) => _bAdd(acc, p));
      }

      // 乗算: N*theta なら短縮角度ブロックに、それ以外は通常通り
      if (op === '*' && args.length >= 2) {
        // 2項のときだけ N*theta 短縮を試みる
        if (args.length === 2) {
          const nthetaShortcut = _matchNThetaShortcut(node);
          if (nthetaShortcut) return nthetaShortcut;
        }
        const parts = args.map(mathNodeToBlocklyJson);
        if (parts.some((p) => !p)) return null;
        return parts.reduce((acc, p) => _bMultiply(acc, p));
      }

      // 除算: A / B → math_fraction
      if (op === '/' && args.length === 2) {
        const num = mathNodeToBlocklyJson(args[0]);
        const den = mathNodeToBlocklyJson(args[1]);
        if (!num || !den) return null;
        return _bFraction(num, den);
      }

      // べき乗: A ^ 2 → math_square、A ^ n（n が整数）は再帰的に積で展開
      if (op === '^' && args.length === 2) {
        const base = mathNodeToBlocklyJson(args[0]);
        if (!base) return null;
        // 指数が定数の整数か確認
        const expNode = args[1];
        if (expNode.isConstantNode && typeof expNode.value === 'number') {
          const exp = expNode.value;
          if (exp === 2) return _bSquare(base);
          if (exp === 1) return base;
          // 3以上の小さい整数は積で展開
          if (Number.isInteger(exp) && exp > 2 && exp <= 6) {
            // base^n = base * base * ... * base
            let result = base;
            for (let i = 1; i < exp; i++) {
              // 各回新しいブロックインスタンスが必要なので JSON.parse(JSON.stringify(...)) で複製
              result = _bMultiply(result, JSON.parse(JSON.stringify(base)));
            }
            return result;
          }
        }
        return null; // それ以外のべき乗は未対応
      }

      // 括弧（ParenthesisNode が来た場合の念のため）
      if (op === '' && args.length === 1) {
        return mathNodeToBlocklyJson(args[0]);
      }

      return null;
    }

    // 括弧ノード
    if (node.isParenthesisNode) {
      return mathNodeToBlocklyJson(node.content);
    }

    return null;
  }

  /**
   * 式文字列 → Blockly ブロック JSON 構造
   * 失敗時は null を返す。
   */
  function mathExprToBlocklyJson(exprString) {
    if (typeof exprString !== 'string' || !exprString.trim()) return null;
    try {
      const node = math.parse(exprString);
      return mathNodeToBlocklyJson(node);
    } catch (e) {
      console.warn('[mathExprToBlocklyJson] 変換失敗:', e.message, '入力:', exprString);
      return null;
    }
  }

  Object.assign(globalScope, {
    FORMULA_REGISTRY,
    OPERATION_TO_CONCEPT,
    formulaTextToId,
    formulaIdToLabel,
    getRequiredFormulaIdsForProblem,
    isSupportedFormulaId,
    collectUsedFormulaIdsFromAST,
    getAnswerFormulaTypeSequence,
    parseBlocksToAST,
    extractVariables,
    evaluateEquivalence,
    collectAppliedFormulaIdsFromAST,
    getErrorMessage,
    validateProof,
    strictEquivalent,
    computeCommonDenominator,
    prettyFormatExpression,
    expressionFromSerializedBlock,
    mathExprToBlocklyJson,
  });
  console.log('[math-logic.js] 実行完了、FORMULA_REGISTRY 公開');
}(window));
console.log('[math-logic.js] IIFE 呼び出し完了');