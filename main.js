// ------------------------------------------------------------
// MathBlock main script
// 目的:
// - Blockly ワークスペースの初期化
// - 問題JSONの読み込みと表示
// - 証明判定、ヒント表示、画面遷移
// ------------------------------------------------------------

// ===== 状態管理 =====
let clearedStages = JSON.parse(localStorage.getItem('s')) || [];
let unlockAll = localStorage.getItem('unlock_all') === '1';
let currentStageNumber = 1;
let currentProblemData = null;
let currentHintIndex = 0;
let currentStreak = 0;
let currentStageSolved = false;
let currentSkipOffer = null;
let pendingSkipChallenge = null;
let hasBoundEventListeners = false;

const MAX_STAGE_NUMBER = 43;

const DIFFICULTY_THRESHOLDS = {
  BASIC_MAX: 3,
  STANDARD_MAX: 6,
};

const GREEN_OPERATION_TYPES = new Set(['replace_operation', 'common_denominator_operation']);

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

const CONCEPT_LABEL = {
  pythagorean_identity: '三角恒等式（sin^2 + cos^2 = 1）',
  tan_as_sin_over_cos: 'tan の定義（tan = sin/cos）',
  tan_pythagorean_relation: '1 + tan^2 = 1/cos^2',
  double_angle_sin: '倍角（sin2θ）',
  half_angle_sin_square: '半角（sin^2θ）',
  half_angle_cos_square: '半角（cos^2θ）',
  double_angle_tan: '倍角（tan）',
  tan_square_with_cos2: 'tan^2 と cos2θ の関係',
  common_denominator: '通分',
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

function parseRequiredConcepts(requiredConcepts) {
  if (!Array.isArray(requiredConcepts)) return [];
  return requiredConcepts
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter((item) => !!item);
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

function getRequiredConceptsForProblem(problemData) {
  const explicit = parseRequiredConcepts(problemData?.requiredConcepts);
  if (explicit.length > 0) return explicit;

  const conceptSet = new Set();
  const answerFormulaTypes = getAnswerFormulaTypeSequence(problemData);
  answerFormulaTypes.forEach((formulaType) => {
    const concept = FORMULA_REGISTRY[formulaType]?.concept;
    if (concept) conceptSet.add(concept);
  });

  const answerOperationTypes = getAnswerOperationTypeSequence(problemData);
  answerOperationTypes.forEach((operationType) => {
    const concept = OPERATION_TO_CONCEPT[operationType];
    if (concept) conceptSet.add(concept);
  });

  return Array.from(conceptSet);
}

function collectAchievedConceptsFromAST(astArray) {
  const achieved = new Set();
  if (!Array.isArray(astArray)) return achieved;

  astArray.forEach((stepData) => {
    const operationType = String(stepData?.type || '');
    const operationConcept = OPERATION_TO_CONCEPT[operationType];
    if (operationConcept) achieved.add(operationConcept);

    const formulaId = formulaTextToId(stepData?.formula);
    const formulaConcept = FORMULA_REGISTRY[formulaId]?.concept;
    if (formulaConcept) achieved.add(formulaConcept);
  });

  return achieved;
}

function getConceptLabel(conceptId) {
  return CONCEPT_LABEL[conceptId] || conceptId;
}

function getProofScaffoldMode() {
  const allowedModes = new Set(['guided', 'standard', 'challenge']);
  const urlMode = new URLSearchParams(window.location.search).get('scaffold');
  const storedMode = localStorage.getItem('proof_scaffold_mode');

  if (urlMode && allowedModes.has(urlMode)) {
    localStorage.setItem('proof_scaffold_mode', urlMode);
    return urlMode;
  }

  if (storedMode && allowedModes.has(storedMode)) {
    return storedMode;
  }

  return 'guided';
}

function setProofScaffoldMode(mode) {
  const allowedModes = new Set(['guided', 'standard', 'challenge']);
  if (!allowedModes.has(mode)) return false;
  localStorage.setItem('proof_scaffold_mode', mode);
  return true;
}

window.setProofScaffoldMode = setProofScaffoldMode;

function updateOverwritePermissionButton() {
  const button = document.getElementById('btn-overwrite-permission');
  if (!button) return;

  const mode = getProofScaffoldMode();
  const isEnabled = mode === 'guided';
  button.textContent = `上書き許可: ${isEnabled ? 'ON' : 'OFF'}`;
  button.classList.toggle('on', isEnabled);
  button.classList.toggle('off', !isEnabled);
}

// ===== Blockly カスタムフィールド =====
// 分数の見た目調整用: 幅だけを持つ透明フィールド
class FieldSpacer extends Blockly.Field {
  constructor(width) {
    super('');
    this.EDITABLE = false;
    this.spacerWidth_ = width || 0;
  }

  getSize() {
    return new Blockly.utils.Size(this.spacerWidth_, 0);
  }

  setWidth(width) {
    if (this.spacerWidth_ !== width) {
      this.spacerWidth_ = width;
      this.forceRerender();
    }
  }

  draw_() {}
}
Blockly.fieldRegistry.register('field_spacer', FieldSpacer);

// 分数線のベースラインを中央寄せするフィールド
class FieldFractionLine extends Blockly.FieldLabel {
  constructor(text) {
    super(text);
    this.className_ = 'fraction-line';
    this.EDITABLE = false;
  }

  draw_() {
    super.draw_();
    if (this.textElement_) {
      this.textElement_.setAttribute('dominant-baseline', 'central');
      this.textElement_.setAttribute('y', '0');
    }
  }
}
Blockly.fieldRegistry.register('field_fraction_line', FieldFractionLine);

// ===== 解析ヘルパー =====
// answerState を再帰走査し、操作ブロック数と公式種類数を数える
function countAllBlocks(block, operationCounter, formulasSet) {
  if (!block) return;

  if (
    block.type === 'replace_operation' ||
    block.type === 'common_denominator_operation' ||
    block.type === 'conclusion_operation'
  ) {
    operationCounter.count++;
  }

  if (block.type && block.type.startsWith('formula_')) {
    formulasSet.add(block.type);
  }

  if (block.next) {
    countAllBlocks(block.next, operationCounter, formulasSet);
  }

  if (block.inputs && typeof block.inputs === 'object') {
    Object.values(block.inputs).forEach((input) => {
      if (input && input.block) {
        countAllBlocks(input.block, operationCounter, formulasSet);
      }
    });
  }
}

// 問題の難易度を自動評価する
function evaluateDifficulty(problemData) {
  if (!problemData.answerState || !problemData.answerState.blocks || !problemData.answerState.blocks.blocks) {
    return { difficulty: '不明', score: 0, operationCount: 0, formulaCount: 0 };
  }

  const blocks = problemData.answerState.blocks.blocks;

  const operationCounter = { count: 0 };
  const formulasUsed = new Set();

  blocks.forEach((block) => countAllBlocks(block, operationCounter, formulasUsed));

  const operationCount = operationCounter.count;
  const formulaCount = formulasUsed.size;
  const score = operationCount + formulaCount * 1.5;

  let difficulty;
  if (score < DIFFICULTY_THRESHOLDS.BASIC_MAX) {
    difficulty = '基礎問';
  } else if (score < DIFFICULTY_THRESHOLDS.STANDARD_MAX) {
    difficulty = '標準問題';
  } else {
    difficulty = '発展問題';
  }

  return { difficulty, score, operationCount, formulaCount };
}

function parseRequiredBlockTypes(requiredBlocks) {
  if (!Array.isArray(requiredBlocks)) return [];

  return requiredBlocks
    .map((entry) => {
      if (typeof entry !== 'string') return null;

      // 例: "type":"replace_operation" / "type":"replace_operation"
      const match = entry.match(/type\"?\s*:\s*\"([a-zA-Z0-9_]+)\"/);
      if (match && match[1]) return match[1];

      // 念のため type 名だけが入っているケースも許容
      const plain = entry.match(/^[a-zA-Z0-9_]+$/);
      return plain ? entry : null;
    })
    .filter((type) => !!type);
}

function getAnswerOperationTypeSequence(problemData) {
  const proofBlock = problemData?.answerState?.blocks?.blocks?.find((block) => block?.type === 'proof_step');
  let current = proofBlock?.inputs?.OPERATIONS?.block || null;
  const sequence = [];

  while (current) {
    if (typeof current.type === 'string' && current.type) {
      sequence.push(current.type);
    }
    current = current?.next?.block || null;
  }

  return sequence;
}

function getInitialOperationTypeSequence(problemData) {
  const proofBlock = problemData?.initialState?.blocks?.blocks?.find((block) => block?.type === 'proof_step');
  let current = proofBlock?.inputs?.OPERATIONS?.block || null;
  const sequence = [];

  while (current) {
    if (typeof current.type === 'string' && current.type) {
      sequence.push(current.type);
    }
    current = current?.next?.block || null;
  }

  return sequence;
}

function getAnswerGreenOperationSequence(problemData) {
  return getAnswerOperationTypeSequence(problemData).filter((type) => GREEN_OPERATION_TYPES.has(type));
}

function getMissingTypesByRequiredOrder(requiredTypes, actualTypes) {
  const actualCounts = Object.create(null);
  actualTypes.forEach((type) => {
    if (!type) return;
    actualCounts[type] = (actualCounts[type] || 0) + 1;
  });

  const missing = [];
  requiredTypes.forEach((type) => {
    if (!type) return;
    if ((actualCounts[type] || 0) > 0) {
      actualCounts[type] -= 1;
      return;
    }
    missing.push(type);
  });

  return missing;
}

function formatOperationTypeLabel(type) {
  if (type === 'replace_operation') return '置き換え';
  if (type === 'common_denominator_operation') return '通分';
  if (type === 'conclusion_operation') return '結論';
  return type;
}

function summarizeTypeCounts(types) {
  const counts = Object.create(null);
  types.forEach((type) => {
    if (!type) return;
    counts[type] = (counts[type] || 0) + 1;
  });

  return Object.entries(counts)
    .map(([type, count]) => `${formatOperationTypeLabel(type)}${count > 1 ? ` ×${count}` : ''}`)
    .join(', ');
}

function ensureAnswerGreenBlocksPlaced(targetWorkspace, problemData) {
  const requiredGreenTypes = getAnswerGreenOperationSequence(problemData);
  if (requiredGreenTypes.length === 0 || !targetWorkspace) return;

  let proofStep = targetWorkspace.getTopBlocks(false).find((b) => b.type === 'proof_step');
  if (!proofStep) {
    proofStep = targetWorkspace.newBlock('proof_step');
    proofStep.initSvg();
    proofStep.render();
  }

  const existingTypes = [];
  let currentOp = proofStep.getInputTargetBlock('OPERATIONS');
  let lastOp = null;
  while (currentOp) {
    existingTypes.push(currentOp.type);
    lastOp = currentOp;
    currentOp = currentOp.getNextBlock();
  }

  const missingTypes = getMissingTypesByRequiredOrder(requiredGreenTypes, existingTypes);
  if (missingTypes.length === 0) return;

  missingTypes.forEach((type) => {
    if (!Blockly.Blocks[type]) return;
    const newOp = targetWorkspace.newBlock(type);
    newOp.initSvg();
    newOp.render();

    if (lastOp && lastOp.nextConnection && newOp.previousConnection) {
      lastOp.nextConnection.connect(newOp.previousConnection);
    } else if (proofStep.getInput('OPERATIONS')?.connection && newOp.previousConnection) {
      proofStep.getInput('OPERATIONS').connection.connect(newOp.previousConnection);
    }
    lastOp = newOp;
  });
}

function ensureAnswerOperationBlocksPlaced(targetWorkspace, problemData) {
  const requiredAnswerTypes = getAnswerOperationTypeSequence(problemData);
  if (requiredAnswerTypes.length === 0 || !targetWorkspace) return;

  let proofStep = targetWorkspace.getTopBlocks(false).find((b) => b.type === 'proof_step');
  if (!proofStep) {
    proofStep = targetWorkspace.newBlock('proof_step');
    proofStep.initSvg();
    proofStep.render();
  }

  const existingTypes = [];
  let currentOp = proofStep.getInputTargetBlock('OPERATIONS');
  let lastOp = null;
  while (currentOp) {
    existingTypes.push(currentOp.type);
    lastOp = currentOp;
    currentOp = currentOp.getNextBlock();
  }

  const missingTypes = getMissingTypesByRequiredOrder(requiredAnswerTypes, existingTypes);
  if (missingTypes.length === 0) return;

  missingTypes.forEach((type) => {
    if (!Blockly.Blocks[type]) return;
    const newOp = targetWorkspace.newBlock(type);
    newOp.initSvg();
    newOp.render();

    if (lastOp && lastOp.nextConnection && newOp.previousConnection) {
      lastOp.nextConnection.connect(newOp.previousConnection);
    } else if (proofStep.getInput('OPERATIONS')?.connection && newOp.previousConnection) {
      proofStep.getInput('OPERATIONS').connection.connect(newOp.previousConnection);
    }
    lastOp = newOp;
  });
}

function ensureInitialOperationBlocksPlaced(targetWorkspace, problemData) {
  const requiredInitialTypes = getInitialOperationTypeSequence(problemData);
  if (requiredInitialTypes.length === 0 || !targetWorkspace) return;

  let proofStep = targetWorkspace.getTopBlocks(false).find((b) => b.type === 'proof_step');
  if (!proofStep) {
    proofStep = targetWorkspace.newBlock('proof_step');
    proofStep.initSvg();
    proofStep.render();
  }

  const existingTypes = [];
  let currentOp = proofStep.getInputTargetBlock('OPERATIONS');
  let lastOp = null;
  while (currentOp) {
    existingTypes.push(currentOp.type);
    lastOp = currentOp;
    currentOp = currentOp.getNextBlock();
  }

  const missingTypes = getMissingTypesByRequiredOrder(requiredInitialTypes, existingTypes);
  if (missingTypes.length === 0) return;

  missingTypes.forEach((type) => {
    if (!Blockly.Blocks[type]) return;
    const newOp = targetWorkspace.newBlock(type);
    newOp.initSvg();
    newOp.render();

    if (lastOp && lastOp.nextConnection && newOp.previousConnection) {
      lastOp.nextConnection.connect(newOp.previousConnection);
    } else if (proofStep.getInput('OPERATIONS')?.connection && newOp.previousConnection) {
      proofStep.getInput('OPERATIONS').connection.connect(newOp.previousConnection);
    }
    lastOp = newOp;
  });
}

function isProofOrOperationBlockType(blockType) {
  return ['proof_step', 'replace_operation', 'common_denominator_operation', 'conclusion_operation'].includes(blockType);
}

function getTopLevelMathBlocksSortedByY(targetWorkspace) {
  if (!targetWorkspace) return [];
  return targetWorkspace
    .getTopBlocks(false)
    .filter((block) => block && block.outputConnection && !isProofOrOperationBlockType(block.type))
    .sort((a, b) => a.getRelativeToSurfaceXY().y - b.getRelativeToSurfaceXY().y);
}

function getOrCreateProofStep(targetWorkspace) {
  let proofStep = targetWorkspace.getTopBlocks(false).find((b) => b.type === 'proof_step');
  if (proofStep) return proofStep;

  proofStep = targetWorkspace.newBlock('proof_step');
  proofStep.initSvg();
  proofStep.render();
  return proofStep;
}

function getOperationChain(proofStep) {
  const operations = [];
  let currentOp = proofStep?.getInputTargetBlock('OPERATIONS') || null;
  while (currentOp) {
    operations.push(currentOp);
    currentOp = currentOp.getNextBlock();
  }
  return operations;
}

function createOperationBlock(targetWorkspace, operationType) {
  const operation = targetWorkspace.newBlock(operationType);
  operation.initSvg();
  operation.render();
  return operation;
}

function ensureStatementConnected(statementInputConnection, operationBlock) {
  if (!statementInputConnection || !operationBlock?.previousConnection) return;
  const currentTarget = statementInputConnection.targetBlock();
  if (currentTarget === operationBlock) return;

  if (currentTarget) {
    currentTarget.unplug(true);
  }

  statementInputConnection.connect(operationBlock.previousConnection);
}

function connectMathToInputIfEmpty(operationBlock, inputName, mathBlock) {
  if (!operationBlock || !mathBlock || !mathBlock.outputConnection) return;
  const inputConnection = operationBlock.getInput(inputName)?.connection;
  if (!inputConnection || inputConnection.targetBlock()) return;
  inputConnection.connect(mathBlock.outputConnection);
}

function applyConditionalInitialStateGeneration(targetWorkspace) {
  if (!targetWorkspace) return;

  const overwriteButton = document.getElementById('btn-overwrite-permission');
  const isOverwriteOn = !!overwriteButton && !overwriteButton.classList.contains('off');

  const proofStep = getOrCreateProofStep(targetWorkspace);
  const operationInputConnection = proofStep.getInput('OPERATIONS')?.connection;
  if (!operationInputConnection) return;

  const mathBlocks = getTopLevelMathBlocksSortedByY(targetWorkspace);
  const leftExpressionBlock = mathBlocks[0] || null;
  const rightExpressionBlock = mathBlocks.length >= 2 ? mathBlocks[mathBlocks.length - 1] : mathBlocks[0] || null;

  const operations = getOperationChain(proofStep);

  if (isOverwriteOn) {
    let replaceOp = operations.find((op) => op.type === 'replace_operation') || null;
    let conclusionOp = operations.find((op) => op.type === 'conclusion_operation') || null;

    if (!replaceOp) {
      replaceOp = createOperationBlock(targetWorkspace, 'replace_operation');
      ensureStatementConnected(operationInputConnection, replaceOp);
    }

    if (!conclusionOp) {
      conclusionOp = createOperationBlock(targetWorkspace, 'conclusion_operation');
      if (replaceOp.nextConnection) {
        const existingAfterReplace = replaceOp.nextConnection.targetBlock();
        if (existingAfterReplace && existingAfterReplace !== conclusionOp) {
          existingAfterReplace.unplug(true);
        }
        replaceOp.nextConnection.connect(conclusionOp.previousConnection);
      }
    }

    connectMathToInputIfEmpty(replaceOp, 'VALUE', leftExpressionBlock);
    connectMathToInputIfEmpty(conclusionOp, 'VALUE', rightExpressionBlock);
    return;
  }

  let conclusionOp = operations.find((op) => op.type === 'conclusion_operation') || null;
  if (!conclusionOp) {
    conclusionOp = createOperationBlock(targetWorkspace, 'conclusion_operation');
  }

  // OFF時は結論ブロックだけを証明チェーンに残す。
  ensureStatementConnected(operationInputConnection, conclusionOp);

  const refreshedOperations = getOperationChain(proofStep);
  refreshedOperations.forEach((op) => {
    if (op === conclusionOp) return;
    op.dispose(true);
  });

  if (conclusionOp.nextConnection?.targetBlock()) {
    conclusionOp.nextConnection.targetBlock().unplug(true);
  }

  connectMathToInputIfEmpty(conclusionOp, 'VALUE', rightExpressionBlock);
}

// ===== UIヘルパー =====
function switchScreen(screenId) {
  document.querySelectorAll('.a').forEach((screen) => screen.classList.remove('b'));
  const target = document.getElementById(screenId);
  if (target) target.classList.add('b');
}

// toast-message がある場合はトースト表示。
// ない場合は result-display にフォールバックする。
function showToast(htmlContent, isAutoClose = true) {
  const toastElement = document.getElementById('toast-message');
  const fallbackResult = document.getElementById('result-display');

  if (toastElement) {
    toastElement.innerHTML = htmlContent;
    toastElement.classList.remove('hidden');

    if (isAutoClose) {
      setTimeout(() => {
        toastElement.classList.add('hidden');
      }, 3000);
    }
    return;
  }

  if (fallbackResult) {
    fallbackResult.innerHTML = htmlContent;
  }
}

function updateStreakCounter(shouldAnimate = false) {
  const streakCounter = document.getElementById('streak-counter');
  if (!streakCounter) return;

  streakCounter.textContent = `🔥 ${currentStreak}`;
  streakCounter.classList.remove('streak-bounce');
  if (!shouldAnimate) return;

  // Use rAF to restart animation without forcing synchronous layout.
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      streakCounter.classList.add('streak-bounce');
    });
  });
}

function closeSkipChallengeModal() {
  const skipModal = document.getElementById('skip-challenge-modal');
  if (skipModal) skipModal.classList.add('hidden');
}

function openSkipChallengeModal(fromStage, targetStage) {
  const skipModal = document.getElementById('skip-challenge-modal');
  const message = document.getElementById('skip-challenge-message');
  if (!skipModal || !message) return;

  const bypassedStages = [];
  for (let stage = fromStage + 1; stage < targetStage; stage++) {
    bypassedStages.push(stage);
  }

  currentSkipOffer = {
    fromStage,
    targetStage,
    bypassedStages,
  };

  const bypassLabel = bypassedStages.length > 0 ? bypassedStages.join(', ') : 'なし';
  message.textContent = `ステージ ${targetStage} へ挑戦しますか？（スキップ候補: ${bypassLabel}）`;
  skipModal.classList.remove('hidden');
}

function applyPendingSkipClearIfNeeded() {
  if (!pendingSkipChallenge) return;
  if (currentStageNumber !== pendingSkipChallenge.targetStage) return;

  let changed = false;
  pendingSkipChallenge.bypassedStages.forEach((stage) => {
    if (stage < 1 || stage > MAX_STAGE_NUMBER) return;
    if (clearedStages.includes(stage)) return;
    clearedStages.push(stage);
    changed = true;
  });

  if (changed) {
    localStorage.setItem('s', JSON.stringify(clearedStages));
  }

  pendingSkipChallenge = null;
}

function forceWorkspaceLayoutSync() {
  if (typeof workspace.render === 'function') {
    workspace.render();
  }
  if (typeof Blockly.svgResize === 'function') {
    Blockly.svgResize(workspace);
  }
}

// トップブロックを左から順に並べる
function arrangeBlocks() {
  if (typeof Blockly.svgResize === 'function') {
    Blockly.svgResize(workspace);
  }

  let topBlocks = workspace.getTopBlocks(false);
  if (!topBlocks || topBlocks.length === 0) return;
  // 証明ブロック(proof_step)を一番左に
  topBlocks = topBlocks.slice(); // 破壊的変更防止
  const proofIdx = topBlocks.findIndex((b) => b.type === 'proof_step');
  if (proofIdx > 0) {
    const [proofBlock] = topBlocks.splice(proofIdx, 1);
    topBlocks.unshift(proofBlock);
  }

  // ツールボックス/フライアウトを避けつつ、アスペクト比に応じて中央寄りへ配置する
  const metrics = typeof workspace.getMetrics === 'function' ? workspace.getMetrics() : null;
  const toolboxWidthFromApi = workspace.getToolbox && workspace.getToolbox() && workspace.getToolbox().getWidth ? workspace.getToolbox().getWidth() : 0;
  const toolboxDiv = document.querySelector('#l .blocklyToolboxDiv');
  const flyoutSvg = document.querySelector('#l .blocklyFlyout');
  const parentRect = workspace.getParentSvg() ? workspace.getParentSvg().getBoundingClientRect() : null;

  const toolboxWidth = Math.max(metrics?.toolboxWidth || 0, toolboxWidthFromApi || 0, toolboxDiv ? toolboxDiv.getBoundingClientRect().width : 0);
  const flyoutWidth = Math.max(metrics?.flyoutWidth || 0, flyoutSvg ? flyoutSvg.getBoundingClientRect().width : 0);
  const leftInset = Math.max(250, Math.ceil(toolboxWidth + flyoutWidth + 24));

  const viewportWidth = Math.max(metrics?.viewWidth || 0, parentRect ? parentRect.width : 0);
  const viewportHeight = Math.max(metrics?.viewHeight || 0, parentRect ? parentRect.height : 0);
  const aspectRatio = viewportHeight > 0 ? viewportWidth / viewportHeight : 1;

  const gap = aspectRatio < 1 ? 24 : 32;
  const sizes = topBlocks.map((block) => block.getHeightWidth());
  const totalWidth = sizes.reduce((sum, size) => sum + (size?.width || 0), 0) + gap * (topBlocks.length - 1);
  const maxHeight = sizes.reduce((max, size) => Math.max(max, size?.height || 0), 0);

  const availableWidth = Math.max(120, viewportWidth - leftInset - 24);
  const centeredX = leftInset + Math.max(0, Math.floor((availableWidth - totalWidth) / 2));
  const nudgeLeft = Math.min(220, Math.max(60, Math.floor(availableWidth * 0.25)));
  const rightSafeX = Math.max(leftInset, viewportWidth - totalWidth - 12);
  let currentX = Math.min(Math.max(leftInset, centeredX - nudgeLeft), rightSafeX);

  let startY;
  if (aspectRatio < 0.9) {
    // 縦長画面は上寄りの中央に置いて、下方向の作業スペースを確保
    startY = Math.max(20, Math.floor(viewportHeight * 0.14));
  } else {
    // 横長〜標準画面は中央付近
    startY = Math.max(20, Math.floor((viewportHeight - maxHeight) / 2) - 90);
  }

  topBlocks.forEach((block) => {
    const xy = block.getRelativeToSurfaceXY();
    block.moveBy(currentX - xy.x, startY - xy.y);
    const blockSize = block.getHeightWidth();
    currentX += blockSize.width + gap;
  });
}

// 画面切替の認知負荷を下げるカーテントランジション
async function transitionToStage(stageNum) {
  const curtain = document.getElementById('transition-curtain');

  if (!curtain) {
    currentStageNumber = stageNum;
    switchScreen('p');
    if (typeof Blockly.svgResize === 'function') Blockly.svgResize(workspace);
    await loadStage(stageNum);
    return;
  }

  curtain.classList.remove('hidden');

  setTimeout(async () => {
    // 重要: 先に p 画面を表示してワークスペースのサイズを確定させる
    // 非表示状態で loadStage すると、Zelos の描画が崩れる場合がある
    switchScreen('p');
    if (typeof Blockly.svgResize === 'function') Blockly.svgResize(workspace);

    currentStageNumber = stageNum;
    await loadStage(stageNum);

    setTimeout(() => {
      curtain.classList.add('hidden');
    }, 200);
  }, 300);
}

// ===== ステージ選択描画 =====
async function renderStageSelectionDynamic() {
  const stageContainer = document.getElementById('n');
  if (!stageContainer) return;

  stageContainer.innerHTML = '<p>問題を読み込み中...</p>';

  try {
    const difficulties = {
      基礎問: [],
      標準問題: [],
      発展問題: [],
    };

    const maxStageNumber = 43;

    for (let stageNum = 1; stageNum <= maxStageNumber; stageNum++) {
      try {
        const response = await fetch(`problems/${stageNum}.json`);
        if (!response.ok) continue;

        const problemData = await response.json();
        const evaluation = evaluateDifficulty(problemData);

        if (difficulties[evaluation.difficulty]) {
          difficulties[evaluation.difficulty].push({
            id: stageNum,
            data: problemData,
          });
        }
      } catch (error) {
        console.warn(`問題 ${stageNum} の読み込みに失敗`, error);
      }
    }

    stageContainer.innerHTML = '';

    ['基礎問', '標準問題', '発展問題'].forEach((difficulty) => {
      const problems = difficulties[difficulty];
      if (!problems || problems.length === 0) return;

      const chapterTitle = document.createElement('h3');
      chapterTitle.innerText = difficulty;
      stageContainer.appendChild(chapterTitle);

      const buttonContainer = document.createElement('div');
      buttonContainer.className = 'stage-grid';

      problems.forEach((problem) => {
        const stageCard = document.createElement('div');
        const isCleared = clearedStages.includes(problem.id);
        const isUnlocked = unlockAll || problem.id === 1 || clearedStages.includes(problem.id - 1);

        stageCard.className = 'stage-card';
        if (isCleared) stageCard.classList.add('cleared');
        else if (isUnlocked) stageCard.classList.add('unlocked');

        stageCard.innerHTML = `<div class="stage-node">${problem.id}<span class="stage-icon">${isCleared ? '⭐' : isUnlocked ? '🔓' : '🔒'}</span></div><div class="stage-label">ステージ ${problem.id}</div>`;

        stageCard.onclick = () => {
          if (!isUnlocked) {
            showToast('まだ遊べません', true);
            return;
          }
          currentStageNumber = problem.id;
          transitionToStage(problem.id);
        };

        buttonContainer.appendChild(stageCard);
      });

      stageContainer.appendChild(buttonContainer);
    });

    const totalStages = 43;
    const clearedCount = clearedStages.length;
    const progressPercent = Math.round((clearedCount / totalStages) * 100);

    const progressBar = document.getElementById('overall-progress');
    const progressText = document.getElementById('progress-text');

    if (progressBar) progressBar.style.width = `${progressPercent}%`;
    if (progressText) progressText.innerText = `${clearedCount} / ${totalStages} クリア (${progressPercent}%)`;
  } catch (error) {
    stageContainer.innerHTML = '<p style="color:red;">問題の読み込みに失敗しました。</p>';
  }
}

// セーブデータ + チュートリアル既読フラグを初期化
function resetSaveData() {
  localStorage.removeItem('s');
  localStorage.removeItem('tutorial_seen');
  localStorage.removeItem('unlock_all');
  clearedStages = [];
  unlockAll = false;
  renderStageSelectionDynamic();
}

// 全問題を開放してチャレンジ可能にする
function unlockAllStages() {
  unlockAll = true;
  localStorage.setItem('unlock_all', '1');
  renderStageSelectionDynamic();
}

// ===== Blockly ブロック定義 =====
Blockly.Blocks.term_tan = {
  init: function () {
    this.appendDummyInput().appendField('tan θ');
    this.setOutput(true, 'Math');
    this.setColour(230);
  },
};

Blockly.Blocks.term_sin = {
  init: function () {
    this.appendDummyInput().appendField('sin θ');
    this.setOutput(true, 'Math');
    this.setColour('#1e40af');
  },
};

Blockly.Blocks.term_cos = {
  init: function () {
    this.appendDummyInput().appendField('cos θ');
    this.setOutput(true, 'Math');
    this.setColour('#1e40af');
  },
};

Blockly.Blocks.term_sin2 = {
  init: function () {
    this.appendDummyInput().appendField('sin 2θ');
    this.setOutput(true, 'Math');
    this.setColour('#1e40af');
  },
};

Blockly.Blocks.term_cos2 = {
  init: function () {
    this.appendDummyInput().appendField('cos 2θ');
    this.setOutput(true, 'Math');
    this.setColour('#1e40af');
  },
};

Blockly.Blocks.term_pi = {
  init: function () {
    this.appendDummyInput().appendField('π');
    this.setOutput(true, 'Math');
    this.setColour('#1e40af');
  },
};

Blockly.Blocks.term_pi_sixth = {
  init: function () {
    this.appendDummyInput().appendField('π/6');
    this.setOutput(true, 'Math');
    this.setColour('#1e40af');
  },
};

Blockly.Blocks.term_pi_quarter = {
  init: function () {
    this.appendDummyInput().appendField('π/4');
    this.setOutput(true, 'Math');
    this.setColour('#1e40af');
  },
};

Blockly.Blocks.term_pi_third = {
  init: function () {
    this.appendDummyInput().appendField('π/3');
    this.setOutput(true, 'Math');
    this.setColour('#1e40af');
  },
};

Blockly.Blocks.term_pi_half = {
  init: function () {
    this.appendDummyInput().appendField('π/2');
    this.setOutput(true, 'Math');
    this.setColour('#1e40af');
  },
};

Blockly.Blocks.term_two_pi_thirds = {
  init: function () {
    this.appendDummyInput().appendField('2π/3');
    this.setOutput(true, 'Math');
    this.setColour('#1e40af');
  },
};

Blockly.Blocks.term_three_pi_quarters = {
  init: function () {
    this.appendDummyInput().appendField('3π/4');
    this.setOutput(true, 'Math');
    this.setColour('#1e40af');
  },
};

Blockly.Blocks.term_five_pi_sixths = {
  init: function () {
    this.appendDummyInput().appendField('5π/6');
    this.setOutput(true, 'Math');
    this.setColour('#1e40af');
  },
};

Blockly.Blocks.term_half_value = {
  init: function () {
    this.appendDummyInput().appendField('1/2');
    this.setOutput(true, 'Math');
    this.setColour('#1e40af');
  },
};

Blockly.Blocks.term_sqrt2_half = {
  init: function () {
    this.appendDummyInput().appendField('√2/2');
    this.setOutput(true, 'Math');
    this.setColour('#1e40af');
  },
};

Blockly.Blocks.term_sqrt3_half = {
  init: function () {
    this.appendDummyInput().appendField('√3/2');
    this.setOutput(true, 'Math');
    this.setColour('#1e40af');
  },
};

Blockly.Blocks.term_sin_of = {
  init: function () {
    this.appendDummyInput().appendField('sin(');
    this.appendValueInput('ANGLE').setCheck('Math').setAlign(Blockly.ALIGN_CENTRE);
    this.appendDummyInput().appendField(')');
    this.setInputsInline(true);
    this.setOutput(true, 'Math');
    this.setColour('#1e40af');
  },
};

Blockly.Blocks.term_cos_of = {
  init: function () {
    this.appendDummyInput().appendField('cos(');
    this.appendValueInput('ANGLE').setCheck('Math').setAlign(Blockly.ALIGN_CENTRE);
    this.appendDummyInput().appendField(')');
    this.setInputsInline(true);
    this.setOutput(true, 'Math');
    this.setColour('#1e40af');
  },
};

Blockly.Blocks.term_tan_of = {
  init: function () {
    this.appendDummyInput().appendField('tan(');
    this.appendValueInput('ANGLE').setCheck('Math').setAlign(Blockly.ALIGN_CENTRE);
    this.appendDummyInput().appendField(')');
    this.setInputsInline(true);
    this.setOutput(true, 'Math');
    this.setColour('#1e40af');
  },
};

Blockly.Blocks.custom_number = {
  init: function () {
    this.appendDummyInput().appendField(new Blockly.FieldNumber(1), 'NUM');
    this.setOutput(true, 'Math');
    this.setColour('#1e40af');
  },
};

Blockly.Blocks.math_fraction = {
  init: function () {
    this.appendValueInput('NUMERATOR').setCheck('Math').setAlign(Blockly.ALIGN_CENTRE).appendField(new FieldSpacer(0), 'SPACER_NUM');
    this.appendDummyInput('DIVIDER_ROW').appendField(new FieldFractionLine('─────')).setAlign(Blockly.ALIGN_CENTRE);
    this.appendValueInput('DENOMINATOR').setCheck('Math').setAlign(Blockly.ALIGN_CENTRE).appendField(new FieldSpacer(0), 'SPACER_DEN');
    this.setInputsInline(false);
    this.setOutput(true, 'Math');
    this.setColour('#4a90e2');
    this.onchange = this.updateFractionLine_;
  },

  updateFractionLine_: function () {
    const numeratorBlock = this.getInputTargetBlock('NUMERATOR');
    const denominatorBlock = this.getInputTargetBlock('DENOMINATOR');

    const numWidth = numeratorBlock ? numeratorBlock.getHeightWidth()?.width || 20 : 20;
    const denWidth = denominatorBlock ? denominatorBlock.getHeightWidth()?.width || 20 : 20;

    const maxWidth = Math.max(numWidth, denWidth);
    const charCount = Math.ceil(maxWidth / 10);
    const newLineText = '─'.repeat(Math.max(3, charCount));

    const padNum = Math.max(0, (maxWidth - numWidth) / 2);
    const padDen = Math.max(0, (maxWidth - denWidth) / 2);

    const spacerNum = this.getField('SPACER_NUM');
    const spacerDen = this.getField('SPACER_DEN');
    if (spacerNum && typeof spacerNum.setWidth === 'function') spacerNum.setWidth(padNum);
    if (spacerDen && typeof spacerDen.setWidth === 'function') spacerDen.setWidth(padDen);

    const dividerRow = this.getInput('DIVIDER_ROW');
    if (dividerRow && dividerRow.fieldRow && dividerRow.fieldRow[0]) {
      const currentValue = dividerRow.fieldRow[0].getText();
      if (currentValue !== newLineText) dividerRow.fieldRow[0].setValue(newLineText);
    }

    if (this.workspace) this.render();
  },
};

Blockly.Blocks.math_add = {
  init: function () {
    this.appendValueInput('A').setCheck('Math').setAlign(Blockly.ALIGN_CENTRE);
    this.appendDummyInput('OPERATOR_ROW').setAlign(Blockly.ALIGN_CENTRE).appendField('＋');
    this.appendValueInput('B').setCheck('Math').setAlign(Blockly.ALIGN_CENTRE);
    this.setInputsInline(true);
    this.setOutput(true, 'Math');
    this.setColour('#0ea5e9');
  },
};

Blockly.Blocks.math_negate = {
  init: function () {
    this.appendDummyInput().setAlign(Blockly.ALIGN_CENTRE).appendField('−(');
    this.appendValueInput('A').setCheck('Math').setAlign(Blockly.ALIGN_CENTRE);
    this.appendDummyInput().setAlign(Blockly.ALIGN_CENTRE).appendField(')');
    this.setInputsInline(true);
    this.setOutput(true, 'Math');
    this.setColour('#0ea5e9');
  },
};

Blockly.Blocks.math_multiply = {
  init: function () {
    this.appendValueInput('A').setCheck('Math').setAlign(Blockly.ALIGN_CENTRE);
    this.appendDummyInput('OPERATOR_ROW').setAlign(Blockly.ALIGN_CENTRE).appendField('×');
    this.appendValueInput('B').setCheck('Math').setAlign(Blockly.ALIGN_CENTRE);
    this.setInputsInline(true);
    this.setOutput(true, 'Math');
    this.setColour('#0ea5e9');
  },
};

Blockly.Blocks.math_square = {
  init: function () {
    this.appendValueInput('A').setCheck('Math').setAlign(Blockly.ALIGN_CENTRE);
    this.appendDummyInput().setAlign(Blockly.ALIGN_CENTRE).appendField('²');
    this.setInputsInline(true);
    this.setOutput(true, 'Math');
    this.setColour('#0ea5e9');
  },
};

Blockly.Blocks.formula_1 = {
  init: function () {
    this.appendDummyInput().appendField('公式①: sin²θ + cos²θ = 1');
    this.setOutput(true, 'Formula');
    this.setColour(300);
  },
};

Blockly.Blocks.formula_2 = {
  init: function () {
    this.appendDummyInput().appendField('公式②: tanθ = sinθ / cosθ');
    this.setOutput(true, 'Formula');
    this.setColour(300);
  },
};

Blockly.Blocks.formula_3 = {
  init: function () {
    this.appendDummyInput().appendField('公式③: 1 + tan²θ = 1 / cos²θ');
    this.setOutput(true, 'Formula');
    this.setColour(300);
  },
};

Blockly.Blocks.formula_4 = {
  init: function () {
    this.appendDummyInput().appendField('公式④: sin2θ = 2sinθcosθ');
    this.setOutput(true, 'Formula');
    this.setColour(300);
  },
};

Blockly.Blocks.formula_5 = {
  init: function () {
    this.appendDummyInput().appendField('公式⑤: sin²θ = (1 - cos2θ) / 2');
    this.setOutput(true, 'Formula');
    this.setColour(300);
  },
};

Blockly.Blocks.formula_6 = {
  init: function () {
    this.appendDummyInput().appendField('公式⑥: cos²θ = (1 + cos2θ) / 2');
    this.setOutput(true, 'Formula');
    this.setColour(300);
  },
};

Blockly.Blocks.formula_7 = {
  init: function () {
    this.appendDummyInput().appendField('公式⑦: tanθ = sin2θ / (1 + cos2θ)');
    this.setOutput(true, 'Formula');
    this.setColour(300);
  },
};

Blockly.Blocks.formula_8 = {
  init: function () {
    this.appendDummyInput().appendField('公式⑧: tan²θ = (1 - cos2θ) / (1 + cos2θ)');
    this.setOutput(true, 'Formula');
    this.setColour(300);
  },
};

Blockly.Blocks.proof_step = {
  init: function () {
    this.appendDummyInput('TITLE').setAlign(Blockly.ALIGN_CENTRE).appendField('証明');
    this.appendStatementInput('OPERATIONS').setCheck('Operation');
    this.setPreviousStatement(true, 'ProofStep');
    this.setNextStatement(true, 'ProofStep');
    this.setColour(120);
  },
};

Blockly.Blocks.replace_operation = {
  init: function () {
    this.appendValueInput('VALUE').setCheck('Math').setAlign(Blockly.ALIGN_CENTRE).appendField('式');
    this.appendDummyInput().setAlign(Blockly.ALIGN_CENTRE).appendField('を');
    this.appendValueInput('FORMULA').setCheck('Formula').setAlign(Blockly.ALIGN_CENTRE);
    this.appendDummyInput().setAlign(Blockly.ALIGN_CENTRE).appendField('で');
    this.appendValueInput('REPLACEMENT').setCheck('Math').setAlign(Blockly.ALIGN_CENTRE);
    this.appendDummyInput().setAlign(Blockly.ALIGN_CENTRE).appendField('にする');
    this.setInputsInline(true);
    this.setPreviousStatement(true, 'Operation');
    this.setNextStatement(true, 'Operation');
    this.setColour(160);
  },
};

Blockly.Blocks.common_denominator_operation = {
  init: function () {
    this.appendValueInput('VALUE').setCheck('Math').setAlign(Blockly.ALIGN_CENTRE).appendField('式');
    this.appendDummyInput().setAlign(Blockly.ALIGN_CENTRE).appendField('を通分して');
    this.appendValueInput('REPLACEMENT').setCheck('Math').setAlign(Blockly.ALIGN_CENTRE);
    this.appendDummyInput().setAlign(Blockly.ALIGN_CENTRE).appendField('にする');
    this.setInputsInline(true);
    this.setPreviousStatement(true, 'Operation');
    this.setNextStatement(true, 'Operation');
    this.setColour(160);
  },
};

Blockly.Blocks.conclusion_operation = {
  init: function () {
    this.appendDummyInput().setAlign(Blockly.ALIGN_CENTRE).appendField('よって');
    this.appendValueInput('VALUE').setCheck('Math').setAlign(Blockly.ALIGN_CENTRE);
    this.appendDummyInput().setAlign(Blockly.ALIGN_CENTRE).appendField('となる');
    this.setInputsInline(true);
    this.setPreviousStatement(true, 'Operation');
    this.setColour(180);
  },
};

// ===== ツールボックス設定 =====
const toolboxConfig = {
  kind: 'categoryToolbox',
  contents: [
    {
      kind: 'category',
      name: '📂 ブロック一覧',
      expanded: true,
      contents: [
        {
          kind: 'category',
          name: '項',
          contents: [
            { kind: 'block', type: 'custom_number' },
            { kind: 'block', type: 'term_sin' },
            { kind: 'block', type: 'term_cos' },
            { kind: 'block', type: 'term_tan' },
            { kind: 'block', type: 'term_sin2' },
            { kind: 'block', type: 'term_cos2' },
            { kind: 'block', type: 'term_sin_of' },
            { kind: 'block', type: 'term_cos_of' },
            { kind: 'block', type: 'term_tan_of' },
          ],
        },
        {
          kind: 'category',
          name: '有名角',
          contents: [
            { kind: 'block', type: 'term_pi_sixth' },
            { kind: 'block', type: 'term_pi_quarter' },
            { kind: 'block', type: 'term_pi_third' },
            { kind: 'block', type: 'term_pi_half' },
            { kind: 'block', type: 'term_two_pi_thirds' },
            { kind: 'block', type: 'term_three_pi_quarters' },
            { kind: 'block', type: 'term_five_pi_sixths' },
            { kind: 'block', type: 'term_pi' },
            { kind: 'block', type: 'term_half_value' },
            { kind: 'block', type: 'term_sqrt2_half' },
            { kind: 'block', type: 'term_sqrt3_half' },
          ],
        },
        {
          kind: 'category',
          name: '演算',
          contents: [
            { kind: 'block', type: 'math_fraction' },
            { kind: 'block', type: 'math_add' },
            { kind: 'block', type: 'math_negate' },
            { kind: 'block', type: 'math_multiply' },
            { kind: 'block', type: 'math_square' },
          ],
        },
        {
          kind: 'category',
          name: '公式',
          contents: [
            { kind: 'block', type: 'formula_1' },
            { kind: 'block', type: 'formula_2' },
            { kind: 'block', type: 'formula_3' },
            { kind: 'block', type: 'formula_4' },
            { kind: 'block', type: 'formula_5' },
            { kind: 'block', type: 'formula_6' },
            { kind: 'block', type: 'formula_7' },
            { kind: 'block', type: 'formula_8' },
          ],
        },
        {
          kind: 'category',
          name: '証明',
          contents: [
            { kind: 'block', type: 'proof_step' },
            { kind: 'block', type: 'replace_operation' },
            { kind: 'block', type: 'common_denominator_operation' },
            { kind: 'block', type: 'conclusion_operation' },
          ],
        },
      ],
    },
  ],
};

// ===== テーマ + ワークスペース初期化 =====
const customTheme = Blockly.Theme.defineTheme('mathTheme', {
  base: Blockly.Themes.Classic,
  componentStyles: {
    workspaceBackgroundColour: '#ffffff',
    toolboxBackgroundColour: '#f5f5f5',
    toolboxForegroundColour: '#333',
    flyoutBackgroundColour: '#f9f9f9',
    flyoutForegroundColour: '#333',
    scrollbarColour: '#ccc',
    insertionMarkerColour: '#4a90e2',
    insertionMarkerOpacity: 0.3,
    scrollbarOpacity: 0.4,
    cursorColour: '#d0d0d0',
    blackBackground: '#333',
  },
});

const workspace = Blockly.inject('l', {
  toolbox: toolboxConfig,
  renderer: 'zelos',
  theme: customTheme,
  rendererOverrides: {
    ROW_PADDING: 0.3,
    MIN_BLOCK_HEIGHT: 10,
    STATEMENT_BOTTOM_SPACING: 0,
    EMPTY_INLINE_INPUT_PADDING: 0,
    DUMMY_INPUT_MIN_HEIGHT: 10,
    INLINE_PADDING_H: 2,
    INLINE_PADDING_V: 0,
  },
  move: {
    drag: true,
    wheel: true,
  },
  zoom: {
    controls: true,
    wheel: false,
    startScale: 1.2,
    maxScale: 3,
    minScale: 0.3,
  },
});

// ===== ステージロード =====
async function loadStage(stageNumber) {
  try {
    const response = await fetch(`problems/${stageNumber}.json`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    currentProblemData = await response.json();
    currentHintIndex = 0;
    currentStageSolved = false;
    currentSkipOffer = null;
    closeSkipChallengeModal();
    updateStreakCounter(false);

    const stageText = document.getElementById('r');
    const problemText = document.getElementById('s');
    if (stageText) stageText.innerText = `STAGE ${stageNumber}`;
    if (problemText) problemText.innerText = currentProblemData.mathText || '';

    const toastElement = document.getElementById('toast-message');
    if (toastElement) toastElement.classList.add('hidden');

    if (window.MathJax) {
      MathJax.typesetClear();
      MathJax.typesetPromise();
    }

    // 問題式カテゴリをツールボックス先頭に追加
    const updatedToolbox = JSON.parse(JSON.stringify(toolboxConfig));
    const problemBlocksCategory = { kind: 'category', name: '✨問題の式', contents: [] };

    if (currentProblemData.initialState?.blocks?.blocks) {
      currentProblemData.initialState.blocks.blocks.forEach((block) => {
        if (block.type !== 'proof_step') {
          const blockCopy = JSON.parse(JSON.stringify(block));
          blockCopy.kind = 'block';
          delete blockCopy.x;
          delete blockCopy.y;
          delete blockCopy.id;
          problemBlocksCategory.contents.push(blockCopy);
        }
      });
    }

    if (problemBlocksCategory.contents.length > 0) {
      updatedToolbox.contents[0].contents.unshift(problemBlocksCategory);
    }

    workspace.updateToolbox(updatedToolbox);
    workspace.clear();
  Blockly.serialization.workspaces.load(currentProblemData.initialState, workspace);

    applyConditionalInitialStateGeneration(workspace);

    forceWorkspaceLayoutSync();
    arrangeBlocks(); // 最後に整列

    const submitBtn = document.getElementById('btn-submit');
    const nextBtn = document.getElementById('btn-next');
    if (submitBtn) submitBtn.style.display = 'inline-block';
    if (nextBtn) {
      nextBtn.style.display = 'none';
      nextBtn.innerText = '次へ進む';
    }
  } catch (error) {
    const errorText = error && error.message ? String(error.message) : '';
    const isHttpError = /^HTTP\s+\d+/.test(errorText);
    const message = isHttpError
      ? `問題ファイルが見つかりません: problems/${stageNumber}.json (${errorText})`
      : `問題ファイルの内容が不正です: problems/${stageNumber}.json`;
    showToast(`<span style='color:red'>${message}</span>`, false);

    const stageText = document.getElementById('r');
    const problemText = document.getElementById('s');
    const submitBtn = document.getElementById('btn-submit');

    if (stageText) stageText.innerText = 'エラー';
    if (problemText) problemText.innerText = '';
    if (submitBtn) submitBtn.style.display = 'none';
  }
}

// ===== 判定用ジェネレーター =====
const mathGenerator = new Blockly.Generator('MATH');
mathGenerator.forBlock.custom_number = function (block) {
  return [String(block.getFieldValue('NUM')), 0];
};
mathGenerator.forBlock.term_sin = function () {
  return ['sin(theta)', 0];
};
mathGenerator.forBlock.term_cos = function () {
  return ['cos(theta)', 0];
};
mathGenerator.forBlock.term_sin2 = function () {
  return ['sin(2 * theta)', 0];
};
mathGenerator.forBlock.term_cos2 = function () {
  return ['cos(2 * theta)', 0];
};
mathGenerator.forBlock.term_pi = function () {
  return ['pi', 0];
};
mathGenerator.forBlock.term_pi_sixth = function () {
  return ['(pi/6)', 0];
};
mathGenerator.forBlock.term_pi_quarter = function () {
  return ['(pi/4)', 0];
};
mathGenerator.forBlock.term_pi_third = function () {
  return ['(pi/3)', 0];
};
mathGenerator.forBlock.term_pi_half = function () {
  return ['(pi/2)', 0];
};
mathGenerator.forBlock.term_two_pi_thirds = function () {
  return ['((2*pi)/3)', 0];
};
mathGenerator.forBlock.term_three_pi_quarters = function () {
  return ['((3*pi)/4)', 0];
};
mathGenerator.forBlock.term_five_pi_sixths = function () {
  return ['((5*pi)/6)', 0];
};
mathGenerator.forBlock.term_half_value = function () {
  return ['(1/2)', 0];
};
mathGenerator.forBlock.term_sqrt2_half = function () {
  return ['(sqrt(2)/2)', 0];
};
mathGenerator.forBlock.term_sqrt3_half = function () {
  return ['(sqrt(3)/2)', 0];
};
mathGenerator.forBlock.term_tan = function () {
  return ['tan(theta)', 0];
};
mathGenerator.forBlock.term_sin_of = function (block) {
  return [`sin(${mathGenerator.valueToCode(block, 'ANGLE', 0) || '0'})`, 0];
};
mathGenerator.forBlock.term_cos_of = function (block) {
  return [`cos(${mathGenerator.valueToCode(block, 'ANGLE', 0) || '0'})`, 0];
};
mathGenerator.forBlock.term_tan_of = function (block) {
  return [`tan(${mathGenerator.valueToCode(block, 'ANGLE', 0) || '0'})`, 0];
};
mathGenerator.forBlock.math_add = function (block) {
  return [`(${mathGenerator.valueToCode(block, 'A', 0) || '0'} + ${mathGenerator.valueToCode(block, 'B', 0) || '0'})`, 0];
};
mathGenerator.forBlock.math_negate = function (block) {
  return [`(-(${mathGenerator.valueToCode(block, 'A', 0) || '0'}))`, 0];
};
mathGenerator.forBlock.math_multiply = function (block) {
  return [`(${mathGenerator.valueToCode(block, 'A', 0) || '1'} * ${mathGenerator.valueToCode(block, 'B', 0) || '1'})`, 0];
};
mathGenerator.forBlock.math_fraction = function (block) {
  return [`(${mathGenerator.valueToCode(block, 'NUMERATOR', 0) || '0'}) / (${mathGenerator.valueToCode(block, 'DENOMINATOR', 0) || '1'})`, 0];
};
mathGenerator.forBlock.math_square = function (block) {
  return [`(${mathGenerator.valueToCode(block, 'A', 0) || '0'})^2`, 0];
};
mathGenerator.forBlock.formula_1 = function () {
  return ['sin(x)^2 + cos(x)^2 = 1', 0];
};
mathGenerator.forBlock.formula_2 = function () {
  return ['tan(x) = sin(x) / cos(x)', 0];
};
mathGenerator.forBlock.formula_3 = function () {
  return ['1 + tan(x)^2 = 1 / cos(x)^2', 0];
};
mathGenerator.forBlock.formula_4 = function () {
  return ['sin(2 * x) = 2 * sin(x) * cos(x)', 0];
};
mathGenerator.forBlock.formula_5 = function () {
  return ['sin(x)^2 = (1 - cos(2 * x)) / 2', 0];
};
mathGenerator.forBlock.formula_6 = function () {
  return ['cos(x)^2 = (1 + cos(2 * x)) / 2', 0];
};
mathGenerator.forBlock.formula_7 = function () {
  return ['tan(x) = sin(2 * x) / (1 + cos(2 * x))', 0];
};
mathGenerator.forBlock.formula_8 = function () {
  return ['tan(x)^2 = (1 - cos(2 * x)) / (1 + cos(2 * x))', 0];
};

function safeValueToCode(block, inputName, fallbackValue) {
  if (!block) return fallbackValue;
  try {
    const generated = mathGenerator.valueToCode(block, inputName, 0);
    if (typeof generated !== 'string') return fallbackValue;
    return generated;
  } catch (error) {
    return fallbackValue;
  }
}

function parseBlocksToAST(targetWorkspace) {
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
      const before = safeValueToCode(currentOperation, 'VALUE', '');
      const formula = currentOperation.type === 'replace_operation'
        ? safeValueToCode(currentOperation, 'FORMULA', null)
        : null;
      const after = currentOperation.type === 'conclusion_operation'
        ? null
        : safeValueToCode(currentOperation, 'REPLACEMENT', null);

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

const VALIDATION_EPSILON = 0.0001;
const VALIDATION_SAMPLING_POINTS = [0.5, 1.2, 2.3];
const RESERVED_MATH_SYMBOLS = new Set(['pi', 'e', 'i', 'Infinity', 'NaN']);

function extractVariables(exprString) {
  const parsed = tryParseMathNode(exprString);
  if (!parsed) return [];

  const variableSet = new Set();

  parsed.traverse((node, _path, parent) => {
    if (!node || node.type !== 'SymbolNode' || typeof node.name !== 'string') return;

    // Function names are represented as SymbolNode in FunctionNode.fn, so exclude them.
    const isFunctionName = !!(parent && parent.type === 'FunctionNode' && parent.fn === node);
    if (isFunctionName) return;

    if (RESERVED_MATH_SYMBOLS.has(node.name)) return;
    variableSet.add(node.name);
  });

  return Array.from(variableSet);
}

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

function tryParseMathNode(expr) {
  const text = String(expr || '').trim();
  if (!text) return null;
  try {
    return math.parse(text);
  } catch (error) {
    return null;
  }
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
      return '証明ブロックが見つかりません。まず「証明」ブロックを配置してください。';
    case 'ERROR_EMPTY_INPUT':
      return `${stepPrefix}「式」または「変形後」の入力が空です。ブロックを接続して式を完成させてください。`;
    case 'ERROR_DIVISION_BY_ZERO':
      return `${stepPrefix}計算結果が無効です（0 除算の可能性があります）。分母が 0 になっていないか確認してください。`;
    case 'ERROR_EQUATION_MISMATCH':
      return `${stepPrefix}変形前と変形後が一致しません。使用した公式と置き換え先の式を見直してください。`;
    case 'ERROR_EVALUATION':
      return `${stepPrefix}式を評価できません。未接続ブロックや不正な式がないか確認してください。`;
    case 'ERROR_FORMULA_REQUIRED':
      return `${stepPrefix}置き換え操作には公式ブロックが必要です。`;
    case 'ERROR_UNSUPPORTED_FORMULA':
      return `${stepPrefix}この公式は判定対象外です。公式ブロックを確認してください。`;
    case 'ERROR_FORMULA_MISMATCH':
      return `${stepPrefix}選択した公式と変形内容が一致していません。${suggestionText}`.trim();
    case 'ERROR_COMMON_DENOMINATOR_RULE':
      return `${stepPrefix}通分では tan→sin/cos などの三角関数置換はできません。置き換えブロックで公式を使って変形してください。`;
    case 'ERROR_CHAIN_EMPTY_INPUT':
      return `${stepPrefix}前段とのつながりを確認できません。この段の「式」を入力してください。`;
    case 'ERROR_CHAIN_DIVISION_BY_ZERO':
      return `${stepPrefix}前段との接続確認中に無効な値が発生しました。前段の「変形後」とこの段の「式」を見直してください。`;
    case 'ERROR_CHAIN_MISMATCH':
      return `${stepPrefix}前段とのつながりが不一致です。前段の「変形後」とこの段の「式」を一致させてください。`;
    case 'ERROR_CHAIN_EVALUATION':
      return `${stepPrefix}前段との接続確認で式を評価できません。未接続ブロックや不正な式がないか確認してください。`;
    case 'ERROR_NO_CONCLUSION':
      return '最後の行を「よって ... となる（結論）」ブロックで締めてください。';
    case 'ERROR_FINAL_EMPTY':
      return '最後の結論式が空です。目標の式を「よって ... となる」に接続してください。';
    case 'ERROR_FINAL_DIVISION_BY_ZERO':
      return '最終式の判定で無効な値が発生しました（0 除算の可能性があります）。最終式を見直してください。';
    case 'ERROR_FINAL_MISMATCH':
      return '最終式が問題の目標式と一致していません。通分だけでなく必要な公式変形まで行ってください。';
    case 'ERROR_FINAL_EVALUATION':
      return '最終式を評価できません。未接続ブロックや不正な式がないか確認してください。';
    default:
      return '不明なエラーが発生しました。ブロックの接続と式を確認してください。';
  }
}

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

  for (let i = 1; i < astArray.length; i++) {
    const prevStepData = astArray[i - 1] || {};
    const currentStepData = astArray[i] || {};
    const prevStepIndex = Number.isFinite(prevStepData.step) ? prevStepData.step : i;
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

    const chainCheck = evaluateEquivalence(prevAfterExpr, currentBeforeExpr);
    if (!chainCheck.ok) {
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

  const expectedFinalExpr = getExpectedConclusionExpression(problemData);
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

function setupEventListeners() {
  if (hasBoundEventListeners) return;
  hasBoundEventListeners = true;

  document.getElementById('btn-overwrite-permission')?.addEventListener('click', () => {
    const currentMode = getProofScaffoldMode();
    const nextMode = currentMode === 'guided' ? 'standard' : 'guided';
    setProofScaffoldMode(nextMode);
    updateOverwritePermissionButton();

    if (document.getElementById('p')?.classList.contains('b')) {
      loadStage(currentStageNumber);
    }

    showToast(nextMode === 'guided' ? '上書き許可を ON にしました' : '上書き許可を OFF にしました');
  });

  document.getElementById('btn-reset')?.addEventListener('click', () => {
    currentStreak = 0;
    updateStreakCounter(false);
    loadStage(currentStageNumber);
  });

  document.getElementById('btn-hint')?.addEventListener('click', () => {
    if (!currentProblemData?.hints?.length) return showToast('ヒントはありません');
    showToast(currentProblemData.hints[currentHintIndex]);
    currentHintIndex = (currentHintIndex + 1) % currentProblemData.hints.length;
  });

  document.getElementById('btn-answer')?.addEventListener('click', () => {
    if (!currentProblemData?.answerState) return showToast('解答はありません', false);
    workspace.clear();
    Blockly.serialization.workspaces.load(currentProblemData.answerState, workspace);
    forceWorkspaceLayoutSync();
    arrangeBlocks();
    showToast('解答を表示しました');
  });

  document.getElementById('btn-back')?.addEventListener('click', () => {
    closeSkipChallengeModal();
    renderStageSelectionDynamic();
    switchScreen('c');
  });

  document.getElementById('btn-skip-challenge-cancel')?.addEventListener('click', () => {
    closeSkipChallengeModal();
    currentSkipOffer = null;
    const nextBtn = document.getElementById('btn-next');
    if (nextBtn) {
      nextBtn.style.display = 'inline-block';
      nextBtn.innerText = currentStageNumber === MAX_STAGE_NUMBER ? '一覧へ戻る' : '次へ進む';
    }
  });

  document.getElementById('btn-skip-challenge-accept')?.addEventListener('click', () => {
    if (!currentSkipOffer) {
      closeSkipChallengeModal();
      return;
    }

    const { targetStage, bypassedStages } = currentSkipOffer;
    pendingSkipChallenge = {
      targetStage,
      bypassedStages,
    };

    closeSkipChallengeModal();
    currentSkipOffer = null;

    const nextBtn = document.getElementById('btn-next');
    if (nextBtn) nextBtn.style.display = 'none';
    document.getElementById('btn-submit').style.display = 'inline-block';
    transitionToStage(targetStage);
  });

  document.getElementById('btn-next')?.addEventListener('click', () => {
    closeSkipChallengeModal();
    currentSkipOffer = null;
    document.getElementById('btn-next').style.display = 'none';
    document.getElementById('btn-submit').style.display = 'inline-block';
    if (currentStageNumber < MAX_STAGE_NUMBER) transitionToStage(currentStageNumber + 1);
    else {
      renderStageSelectionDynamic();
      switchScreen('c');
    }
  });

  document.getElementById('btn-submit')?.addEventListener('click', () => {
    const ast = parseBlocksToAST(workspace);
    console.log('Parsed AST:', ast);

    const requiredFormulaIds = getRequiredFormulaIdsForProblem(currentProblemData);
    if (requiredFormulaIds.length > 0) {
      const usedFormulaIds = collectAppliedFormulaIdsFromAST(ast);
      const missingFormulaIds = requiredFormulaIds
        .filter((formulaId) => isSupportedFormulaId(formulaId))
        .filter((formulaId) => !usedFormulaIds.has(formulaId));
      if (missingFormulaIds.length > 0) {
        const labels = missingFormulaIds.map((formulaId) => formulaIdToLabel(formulaId)).join('、');
        showToast(`<span style='color:#ff4b4b'>必要な公式が不足しています: ${labels}</span>`);
        return;
      }
    }

    const requiredConcepts = getRequiredConceptsForProblem(currentProblemData);
    if (requiredConcepts.length > 0) {
      const achievedConcepts = collectAchievedConceptsFromAST(ast);
      const missingConcepts = requiredConcepts.filter((conceptId) => !achievedConcepts.has(conceptId));
      if (missingConcepts.length > 0) {
        const labels = missingConcepts.map((conceptId) => getConceptLabel(conceptId)).join('、');
        showToast(`<span style='color:#ff4b4b'>必要な考え方が不足しています: ${labels}</span>`);
        return;
      }
    } else {
      const actualGreenTypes = ast
        .map((step) => String(step.type || ''))
        .filter((type) => GREEN_OPERATION_TYPES.has(type));
      const requiredGreenTypes = getAnswerGreenOperationSequence(currentProblemData);
      const missingGreenTypes = getMissingTypesByRequiredOrder(requiredGreenTypes, actualGreenTypes);
      if (missingGreenTypes.length > 0) {
        showToast(`<span style='color:#ff4b4b'>必須ブロックが不足しています: ${summarizeTypeCounts(missingGreenTypes)}</span>`);
        return;
      }
    }

    const validation = validateProof(ast, currentProblemData);
    if (validation.isValid) {
      if (!currentStageSolved) {
        currentStreak += 1;
        updateStreakCounter(true);
      }
      currentStageSolved = true;

      showToast("<span style='color:#58cc02; font-size:1.2em;'>🎉 正解！完璧です！</span>", false);
      if (typeof confetti === 'function') {
        confetti({
          particleCount: 150,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#58cc02', '#1cb0f6', '#ffc800', '#ff4b4b'],
        });
      }

      if (!clearedStages.includes(currentStageNumber)) {
        clearedStages.push(currentStageNumber);
        localStorage.setItem('s', JSON.stringify(clearedStages));
      }

      applyPendingSkipClearIfNeeded();

      // 強制遷移を廃止し、ボタンを切り替える
      document.getElementById('btn-submit').style.display = 'none';
      const canOfferSkip = currentStreak === 5 && currentStageNumber + 3 <= MAX_STAGE_NUMBER;
      if (canOfferSkip) {
        document.getElementById('btn-next').style.display = 'none';
        openSkipChallengeModal(currentStageNumber, currentStageNumber + 3);
      } else {
        document.getElementById('btn-next').style.display = 'inline-block';
        document.getElementById('btn-next').innerText = currentStageNumber === MAX_STAGE_NUMBER ? '一覧へ戻る' : '次へ進む';
      }
    } else {
      currentStreak = 0;
      updateStreakCounter(false);
      const userMessage = getErrorMessage(
        validation.errorCode,
        validation.errorStepIndex,
        validation.suggestions,
      );
      showToast(`<span style='color:#ff4b4b'>不正解。${userMessage}</span>`);
      return;
    }
  });
}

// ===== アプリケーション初期化ルーティング =====
async function routeToTarget() {
  const urlParams = new URLSearchParams(window.location.search);
  const stageParam = parseInt(urlParams.get('stage'), 10);

  if (stageParam >= 1 && stageParam <= 43) {
    currentStageNumber = stageParam;
    await loadStage(stageParam);
    switchScreen('p');
  } else {
    await renderStageSelectionDynamic();
    switchScreen('c');
  }
}

async function bootApplication() {
  setupEventListeners();
  updateStreakCounter(false);
  updateOverwritePermissionButton();

  const startScreen = document.getElementById('start-screen');
  const tutorialModal = document.getElementById('tutorial-modal');
  const startBtn = document.getElementById('btn-start-app');
  const closeTutorialBtn = document.getElementById('btn-close-tutorial');
  const tutorialSeen = localStorage.getItem('tutorial_seen') === 'true';

  if (!tutorialSeen) {
    if (startScreen) startScreen.classList.remove('hidden');
    if (tutorialModal) tutorialModal.classList.add('hidden');

    if (startBtn) {
      startBtn.onclick = () => {
        if (startScreen) startScreen.classList.add('hidden');
        if (tutorialModal) tutorialModal.classList.remove('hidden');
      };
    }

    if (closeTutorialBtn) {
      closeTutorialBtn.onclick = async () => {
        if (tutorialModal) tutorialModal.classList.add('hidden');
        localStorage.setItem('tutorial_seen', 'true');
        await routeToTarget();
      };
    }

    return;
  }

  if (startScreen) startScreen.classList.add('hidden');
  if (tutorialModal) tutorialModal.classList.add('hidden');
  await routeToTarget();
}

bootApplication();
