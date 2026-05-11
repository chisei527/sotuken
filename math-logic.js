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
  };

  const VALIDATION_EPSILON = 0.0001;
  const VALIDATION_SAMPLING_POINTS = [0.5, 1.2, 2.3];
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

  function toFormulaIdFromToken(token) {
    if (typeof token !== 'string') return null;
    const trimmed = token.trim();
    if (!trimmed) return null;

    if (/^formula_\d+$/i.test(trimmed)) {
      return trimmed.toLowerCase();
    }

    const circledMatch = trimmed.match(/[①-⑩]/);
    if (circledMatch) {
      const number = CIRCLED_FORMULA_DIGIT_TO_NUMBER[circledMatch[0]];
      return number ? `formula_${number}` : null;
    }

    const numberMatch = trimmed.match(/^公式\s*(10|[1-9])$/);
    if (numberMatch) {
      return `formula_${numberMatch[1]}`;
    }

    if (/^(10|[1-9])$/.test(trimmed)) {
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

      const circledMatches = hint.match(/[①-⑩]/g) || [];
      circledMatches.forEach((char) => {
        const number = CIRCLED_FORMULA_DIGIT_TO_NUMBER[char];
        if (number) formulaIdSet.add(`formula_${number}`);
      });

      const plainMatches = hint.match(/公式\s*(10|[1-9])/g) || [];
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

  function safeValueToCode(block, inputName, fallbackValue, generator) {
    if (!block || !generator) return fallbackValue;
    try {
      const generated = generator.valueToCode(block, inputName, 0);
      if (typeof generated !== 'string') return fallbackValue;
      return generated;
    } catch (error) {
      return fallbackValue;
    }
  }

  /**
   * Blockly ワークスペースを AST 配列へ変換する。
   * @param {object} targetWorkspace Blockly workspace
   * @param {object} generator Blockly generator
   * @returns {Array<{step:number,type:string,before:string,formula:string|null,after:string|null}>}
   */
  function parseBlocksToAST(targetWorkspace, generator = globalScope.mathGenerator) {
    const ast = [];
    if (!targetWorkspace) return ast;

    const proofSteps = targetWorkspace
      .getAllBlocks(false)
      .filter((block) => block.type === 'proof_step');

    if (proofSteps.length === 0) {
      return ast;
    }

    let stepIndex = 1;

    proofSteps.forEach((proofStep) => {
      let currentOperation = proofStep.getInputTargetBlock('OPERATIONS');

      while (currentOperation) {
        const before = safeValueToCode(currentOperation, 'VALUE', '', generator);
        const formula = currentOperation.type === 'replace_operation'
          ? safeValueToCode(currentOperation, 'FORMULA', null, generator)
          : null;
        const after = currentOperation.type === 'conclusion_operation'
          ? null
          : safeValueToCode(currentOperation, 'REPLACEMENT', null, generator);

        ast.push({
          step: stepIndex,
          type: String(currentOperation.type || ''),
          before: before == null ? '' : String(before),
          formula: formula == null ? null : String(formula),
          after: after == null ? null : String(after),
        });

        stepIndex += 1;
        currentOperation = currentOperation.getNextBlock();
      }
    });

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

  function getExpectedConclusionExpression(problemData) {
    const proofBlock = problemData?.answerState?.blocks?.blocks?.find((block) => block?.type === 'proof_step');
    let current = proofBlock?.inputs?.OPERATIONS?.block || null;
    let lastOperation = null;

    while (current) {
      lastOperation = current;
      current = current?.next?.block || null;
    }

    if (lastOperation?.type === 'conclusion_operation') {
      return expressionFromSerializedBlock(readInputBlock(lastOperation, 'VALUE'));
    }

    const topMathBlocks = (problemData?.answerState?.blocks?.blocks || []).filter(
      (block) => block && block.type !== 'proof_step',
    );
    if (topMathBlocks.length >= 2) {
      return expressionFromSerializedBlock(topMathBlocks[1]);
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
  function evaluateEquivalence(leftExpr, rightExpr) {
    const variables = Array.from(new Set([
      ...extractVariables(leftExpr),
      ...extractVariables(rightExpr),
    ]));

    if (variables.length === 0) {
      try {
        const leftValue = math.evaluate(leftExpr);
        const rightValue = math.evaluate(rightExpr);

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

    for (const xValue of VALIDATION_SAMPLING_POINTS) {
      try {
        const scope = {};
        variables.forEach((varName) => {
          scope[varName] = xValue;
        });

        const leftValue = math.evaluate(leftExpr, scope);
        const rightValue = math.evaluate(rightExpr, scope);

        if (!Number.isFinite(leftValue) || !Number.isFinite(rightValue)) {
          return { ok: false, reason: 'non-finite' };
        }

        if (Math.abs(leftValue - rightValue) > VALIDATION_EPSILON) {
          return { ok: false, reason: 'mismatch' };
        }
      } catch (error) {
        const rawMessage = error && error.message ? String(error.message) : '';
        const isDivisionByZero = /division\s+by\s+zero|divide\s+by\s+zero|Infinity/i.test(rawMessage);
        return { ok: false, reason: isDivisionByZero ? 'division-by-zero' : 'eval-error' };
      }
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
      return operationType === 'replace_operation' || operationType === 'common_denominator_operation';
    });
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
  function validateProof(astArray, problemData) {
    if (!Array.isArray(astArray) || astArray.length === 0) {
      return {
        isValid: false,
        errorStepIndex: null,
        errorCode: 'ERROR_NO_PROOF_BLOCK',
        suggestions: [],
      };
    }

    for (let i = 0; i < astArray.length; i++) {
      const stepData = astArray[i] || {};
      const stepIndex = Number.isFinite(stepData.step) ? stepData.step : i + 1;
      const operationType = String(stepData.type || '');

      if (operationType !== 'replace_operation' && operationType !== 'common_denominator_operation') {
        continue;
      }

      const beforeExpr = typeof stepData.before === 'string' ? stepData.before.trim() : '';
      const afterExpr = typeof stepData.after === 'string' ? stepData.after.trim() : '';
      const formulaExpr = typeof stepData.formula === 'string' ? stepData.formula.trim() : '';

      if (!beforeExpr || !afterExpr) {
        return {
          isValid: false,
          errorStepIndex: stepIndex,
          errorCode: 'ERROR_EMPTY_INPUT',
          suggestions: [],
        };
      }

      const sameStepCheck = evaluateEquivalence(beforeExpr, afterExpr);
      if (!sameStepCheck.ok) {
        if (sameStepCheck.reason === 'non-finite' || sameStepCheck.reason === 'division-by-zero') {
          return {
            isValid: false,
            errorStepIndex: stepIndex,
            errorCode: 'ERROR_DIVISION_BY_ZERO',
            suggestions: [],
          };
        }

        if (sameStepCheck.reason === 'mismatch') {
          return {
            isValid: false,
            errorStepIndex: stepIndex,
            errorCode: 'ERROR_EQUATION_MISMATCH',
            suggestions: [],
          };
        }

        return {
          isValid: false,
          errorStepIndex: stepIndex,
          errorCode: 'ERROR_EVALUATION',
          suggestions: [],
        };
      }

      if (operationType === 'replace_operation') {
        if (!formulaExpr) {
          return {
            isValid: false,
            errorStepIndex: stepIndex,
            errorCode: 'ERROR_FORMULA_REQUIRED',
            suggestions: [],
          };
        }

        const formulaId = formulaTextToId(formulaExpr);
        if (!formulaId) {
          return {
            isValid: false,
            errorStepIndex: stepIndex,
            errorCode: 'ERROR_UNSUPPORTED_FORMULA',
            suggestions: [],
          };
        }

        const formulaMatch = verifyFormulaApplication(formulaId, beforeExpr, afterExpr);
        if (!formulaMatch) {
          const candidates = detectMatchingFormulaIds(beforeExpr, afterExpr)
            .filter((candidate) => candidate !== formulaId)
            .map((candidate) => formulaIdToLabel(candidate));
          return {
            isValid: false,
            errorStepIndex: stepIndex,
            errorCode: 'ERROR_FORMULA_MISMATCH',
            suggestions: candidates,
          };
        }
      }

      if (operationType === 'common_denominator_operation') {
        if (hasTrigProfileChanged(beforeExpr, afterExpr)) {
          return {
            isValid: false,
            errorStepIndex: stepIndex,
            errorCode: 'ERROR_COMMON_DENOMINATOR_RULE',
            suggestions: [],
          };
        }
      }
    }

    const transformSteps = getTransformSteps(astArray);
    for (let i = 1; i < transformSteps.length; i++) {
      const prevStepData = transformSteps[i - 1] || {};
      const currentStepData = transformSteps[i] || {};
      const currentStepIndex = Number.isFinite(currentStepData.step) ? currentStepData.step : i + 1;

      const prevAfterExpr = typeof prevStepData.after === 'string' ? prevStepData.after.trim() : '';
      const currentBeforeExpr = typeof currentStepData.before === 'string' ? currentStepData.before.trim() : '';

      if (!prevAfterExpr || !currentBeforeExpr) {
        return {
          isValid: false,
          errorStepIndex: currentStepIndex,
          errorCode: 'ERROR_CHAIN_EMPTY_INPUT',
          suggestions: [],
        };
      }

      const chainCheck = evaluateEquivalence(prevAfterExpr, currentBeforeExpr);
      if (!chainCheck.ok) {
        if (canSkipChainMismatch(prevStepData, currentStepData)) {
          continue;
        }
        if (hasEquivalentSubexpression(prevAfterExpr, currentBeforeExpr)) {
          continue;
        }
        if (chainCheck.reason === 'non-finite' || chainCheck.reason === 'division-by-zero') {
          return {
            isValid: false,
            errorStepIndex: currentStepIndex,
            errorCode: 'ERROR_CHAIN_DIVISION_BY_ZERO',
            suggestions: [],
          };
        }

        if (chainCheck.reason === 'mismatch') {
          return {
            isValid: false,
            errorStepIndex: currentStepIndex,
            errorCode: 'ERROR_CHAIN_MISMATCH',
            suggestions: [],
          };
        }

        return {
          isValid: false,
          errorStepIndex: currentStepIndex,
          errorCode: 'ERROR_CHAIN_EVALUATION',
          suggestions: [],
        };
      }
    }

    const expectedFinalExpr = getExpectedConclusionExpression(problemData);

    for (let i = 1; i < astArray.length; i++) {
      const prevStepData = astArray[i - 1] || {};
      const currentStepData = astArray[i] || {};
      const currentStepIndex = Number.isFinite(currentStepData.step) ? currentStepData.step : i + 1;

      const prevAfterExpr = typeof prevStepData.after === 'string' ? prevStepData.after.trim() : '';
      const currentBeforeExpr = typeof currentStepData.before === 'string' ? currentStepData.before.trim() : '';

      if (!prevAfterExpr) {
        continue;
      }

      if (!currentBeforeExpr) {
        return {
          isValid: false,
          errorStepIndex: currentStepIndex,
          errorCode: 'ERROR_CHAIN_EMPTY_INPUT',
          suggestions: [],
        };
      }

      if (currentStepData.type === 'conclusion_operation' && expectedFinalExpr) {
        const finalCheck = evaluateEquivalence(currentBeforeExpr, expectedFinalExpr);
        if (finalCheck.ok) {
          continue;
        }
      }

      const chainCheck = evaluateEquivalence(prevAfterExpr, currentBeforeExpr);
      if (!chainCheck.ok) {
        if (canSkipChainMismatch(prevStepData, currentStepData)) {
          continue;
        }
        if (hasEquivalentSubexpression(prevAfterExpr, currentBeforeExpr)) {
          continue;
        }
        if (chainCheck.reason === 'non-finite' || chainCheck.reason === 'division-by-zero') {
          return {
            isValid: false,
            errorStepIndex: currentStepIndex,
            errorCode: 'ERROR_CHAIN_DIVISION_BY_ZERO',
            suggestions: [],
          };
        }

        if (chainCheck.reason === 'mismatch') {
          return {
            isValid: false,
            errorStepIndex: currentStepIndex,
            errorCode: 'ERROR_CHAIN_MISMATCH',
            suggestions: [],
          };
        }

        return {
          isValid: false,
          errorStepIndex: currentStepIndex,
          errorCode: 'ERROR_CHAIN_EVALUATION',
          suggestions: [],
        };
      }
    }

    const lastStep = astArray[astArray.length - 1] || null;
    if (!lastStep || lastStep.type !== 'conclusion_operation') {
      return {
        isValid: false,
        errorStepIndex: lastStep && Number.isFinite(lastStep.step) ? lastStep.step : astArray.length,
        errorCode: 'ERROR_NO_CONCLUSION',
        suggestions: [],
      };
    }

    
    if (expectedFinalExpr) {
      const actualFinalExpr = typeof lastStep.before === 'string' ? lastStep.before.trim() : '';
      if (!actualFinalExpr) {
        return {
          isValid: false,
          errorStepIndex: Number.isFinite(lastStep.step) ? lastStep.step : astArray.length,
          errorCode: 'ERROR_FINAL_EMPTY',
          suggestions: [],
        };
      }

      const finalCheck = evaluateEquivalence(actualFinalExpr, expectedFinalExpr);
      if (!finalCheck.ok) {
        if (finalCheck.reason === 'non-finite' || finalCheck.reason === 'division-by-zero') {
          return {
            isValid: false,
            errorStepIndex: Number.isFinite(lastStep.step) ? lastStep.step : astArray.length,
            errorCode: 'ERROR_FINAL_DIVISION_BY_ZERO',
            suggestions: [],
          };
        }

        if (finalCheck.reason === 'mismatch') {
          return {
            isValid: false,
            errorStepIndex: Number.isFinite(lastStep.step) ? lastStep.step : astArray.length,
            errorCode: 'ERROR_FINAL_MISMATCH',
            suggestions: [],
          };
        }

        return {
          isValid: false,
          errorStepIndex: Number.isFinite(lastStep.step) ? lastStep.step : astArray.length,
          errorCode: 'ERROR_FINAL_EVALUATION',
          suggestions: [],
        };
      }
    }

    return {
      isValid: true,
      errorStepIndex: null,
      errorCode: null,
      suggestions: [],
    };
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
  });
}(window));
