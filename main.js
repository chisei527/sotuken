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
let problemsDataCache = null;
let tutorialStepIndex = 0;
let tutorialModeActive = false;
let activeTutorialTarget = null;
let tutorialAutoAdvanceFrameId = 0;
let tutorialWorkspaceListenerBound = false;
let tutorialFlowProblems = [];
let tutorialFlowIndex = 0;

const MAX_STAGE_NUMBER = 43;
const TUTORIAL_STAGE_NUMBER = 0;
const APP_STORAGE_KEYS = ['s', 'unlock_all', 'tutorial_seen', 'proof_scaffold_mode'];

const TUTORIAL_STEPS = [
  {
    key: '1',
    text: '1問目: まずは tan を sin/cos に置き換えるだけ。',
    help: '必要なのは公式②だけです。最小の一手で解き始めましょう。',
    targetId: 'l',
  },
  {
    key: '2',
    text: '2問目: 分数が増えたら通分でまとめます。',
    help: '置き換えのあとに通分を挟んで、式をひとつに整理しましょう。',
    targetId: 'l',
  },
  {
    key: '3',
    text: '3問目: 公式①と③を使って、仕上げの一歩まで進みます。',
    help: '最後は恒等式の組み合わせで完成です。',
    targetId: 'l',
  },
];

const WORLD_SEGMENTS = [
  { start: 1, end: 10, title: 'World 1: Foundational Route', subtitle: '公式の基本連結' },
  { start: 11, end: 20, title: 'World 2: Conversion Ridge', subtitle: '変換の往復を習得' },
  { start: 21, end: 30, title: 'World 3: Identity Frontier', subtitle: '恒等式の複合運用' },
  { start: 31, end: 43, title: 'World 4: Master Ascent', subtitle: '最終証明ゾーン' },
];

function resetAppStateForGoLiveIfNeeded() {
  const isLiveServerHost = window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost';
  if (!isLiveServerHost) return;

  APP_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));

  // ライブプレビュー時は毎回クリーンな学習状態で開始する。
  clearedStages = [];
  unlockAll = false;
  currentStageNumber = 1;
  currentProblemData = null;
  currentHintIndex = 0;
  currentStreak = 0;
  currentStageSolved = false;
  currentSkipOffer = null;
  pendingSkipChallenge = null;
}

const DIFFICULTY_THRESHOLDS = {
  BASIC_MAX: 3,
  STANDARD_MAX: 6,
};

const GREEN_OPERATION_TYPES = new Set(['replace_operation', 'common_denominator_operation']);
const {
  FORMULA_REGISTRY,
  OPERATION_TO_CONCEPT,
  formulaTextToId,
  formulaIdToLabel,
  getRequiredFormulaIdsForProblem,
  isSupportedFormulaId,
  getAnswerFormulaTypeSequence,
  collectAppliedFormulaIdsFromAST,
  parseBlocksToAST,
  validateProof,
  getErrorMessage,
} = window;

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

function parseRequiredConcepts(requiredConcepts) {
  if (!Array.isArray(requiredConcepts)) return [];
  return requiredConcepts
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter((item) => !!item);
}

function applyProblemDataToWorkspace(problemData, stageLabel) {
  currentHintIndex = 0;
  currentStageSolved = false;
  currentSkipOffer = null;
  closeSkipChallengeModal();
  updateStreakCounter(false);

  const stageText = document.getElementById('r');
  const problemText = document.getElementById('s');
  if (stageText) stageText.innerText = stageLabel;
  if (problemText) problemText.innerText = problemData.mathText || '';

  const toastElement = document.getElementById('toast-message');
  if (toastElement) toastElement.classList.add('hidden');

  if (window.MathJax) {
    MathJax.typesetClear();
    MathJax.typesetPromise();
  }

  const updatedToolbox = JSON.parse(JSON.stringify(toolboxConfig));
  const problemBlocksCategory = { kind: 'category', name: '✨問題の式', contents: [] };

  if (problemData.initialState?.blocks?.blocks) {
    problemData.initialState.blocks.blocks.forEach((block) => {
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
  Blockly.serialization.workspaces.load(problemData.initialState, workspace);

  applyConditionalInitialStateGeneration(workspace);
  forceWorkspaceLayoutSync();
  arrangeBlocks();

  const submitBtn = document.getElementById('btn-submit');
  const nextBtn = document.getElementById('btn-next');
  if (submitBtn) submitBtn.style.display = 'inline-block';
  if (nextBtn) {
    nextBtn.style.display = 'none';
    nextBtn.innerText = '次へ進む';
  }
}

function buildTutorialFlowProblems(baseProblem) {
  const followUps = Array.isArray(baseProblem?.tutorialSequence) ? baseProblem.tutorialSequence : [];
  return [baseProblem, ...followUps].filter(Boolean).map((item) => JSON.parse(JSON.stringify(item)));
}

function initializeTutorialFlow(baseProblem) {
  tutorialFlowProblems = buildTutorialFlowProblems(baseProblem);
  tutorialFlowIndex = 0;
}

async function loadTutorialFlowProblem(index) {
  if (!tutorialFlowProblems.length) return;
  const safeIndex = Math.max(0, Math.min(index, tutorialFlowProblems.length - 1));
  tutorialFlowIndex = safeIndex;
  currentProblemData = tutorialFlowProblems[safeIndex];
  applyProblemDataToWorkspace(currentProblemData, `チュートリアル ${safeIndex + 1}/${tutorialFlowProblems.length}`);
  tutorialStepIndex = safeIndex;
  showTutorialStep();
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

  if (screenId === 'p') {
    requestAnimationFrame(() => {
      forceWorkspaceLayoutSync();
    });
  }
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

function clearTutorialFocus() {
  if (activeTutorialTarget) {
    activeTutorialTarget.classList.remove('tutorial-focus-target');
  }
  activeTutorialTarget = null;
}

function setTutorialFocus(targetId) {
  clearTutorialFocus();
  if (!targetId) return;
  const target = document.getElementById(targetId);
  if (!target) return;
  target.classList.add('tutorial-focus-target');
  activeTutorialTarget = target;
}

function closeGameEntrance() {
  const entrance = document.getElementById('game-entrance');
  if (entrance) entrance.classList.add('hidden');
}

function openGameEntrance() {
  const entrance = document.getElementById('game-entrance');
  if (entrance) entrance.classList.remove('hidden');
}

function hideTutorialOverlay() {
  const overlay = document.getElementById('tutorial-overlay');
  if (overlay) overlay.classList.add('hidden');
  tutorialModeActive = false;
  clearTutorialFocus();
  if (tutorialAutoAdvanceFrameId) {
    cancelAnimationFrame(tutorialAutoAdvanceFrameId);
    tutorialAutoAdvanceFrameId = 0;
  }
}

function showTutorialStep() {
  const overlay = document.getElementById('tutorial-overlay');
  const stepText = document.getElementById('tutorial-step-text');
  const nextBtn = document.getElementById('btn-tutorial-next');
  const stepPill = document.getElementById('tutorial-step-pill');
  const stepHint = document.getElementById('tutorial-step-hint');
  if (!overlay || !stepText || !nextBtn) return;

  const safeIndex = Math.max(0, Math.min(tutorialStepIndex, TUTORIAL_STEPS.length - 1));
  const step = TUTORIAL_STEPS[safeIndex];
  stepText.textContent = `${step.text} ${step.help}`;
  setTutorialFocus(step.targetId);
  if (stepPill) stepPill.textContent = `Step ${step.key}`;
  if (stepHint) stepHint.textContent = `${safeIndex + 1} / ${TUTORIAL_STEPS.length}`;
  nextBtn.textContent = safeIndex === TUTORIAL_STEPS.length - 1 ? '理解した' : '次の解説へ';
}

function bindTutorialWorkspaceAutoAdvance() {}

function openInteractiveTutorialOverlay() {
  const overlay = document.getElementById('tutorial-overlay');
  const skipBtn = document.getElementById('btn-tutorial-skip');
  if (!overlay) return;

  tutorialModeActive = true;
  tutorialStepIndex = 0;
  overlay.classList.remove('hidden');
  if (skipBtn) {
    skipBtn.style.display = 'none';
  }
  showTutorialStep();
  queueTutorialAutoAdvanceCheck();
}

async function completeTutorialAndOpenMap() {
  localStorage.setItem('tutorial_seen', 'true');
  hideTutorialOverlay();
  await renderStageMap();
  switchScreen('stage-map-screen');
}

async function skipInteractiveTutorial() {
  await completeTutorialAndOpenMap();
  showToast('チュートリアルをスキップしました。', true);
}

function getTutorialCompletionState(ast) {
  const usedFormulaIds = collectAppliedFormulaIdsFromAST(ast);
  const hasCommonDenominator = ast.some((step) => String(step?.type || '') === 'common_denominator_operation');

  const checks = [
    usedFormulaIds.has('formula_2'),
    hasCommonDenominator,
    usedFormulaIds.has('formula_1'),
    usedFormulaIds.has('formula_3'),
  ];
  const firstMissingIndex = checks.findIndex((isDone) => !isDone);

  return {
    isComplete: firstMissingIndex === -1,
    firstMissingIndex: firstMissingIndex === -1 ? TUTORIAL_STEPS.length - 1 : firstMissingIndex,
    checks,
  };
}

function getSafeStagePreview(mathText) {
  if (typeof mathText !== 'string') return '問題文プレビューなし';
  return mathText
    .replaceAll('\\[', '')
    .replaceAll('\\]', '')
    .replaceAll('\\', '')
    .trim();
}

function showMapNodeTooltip(stageId, mathText, x, y) {
  const tooltip = document.getElementById('map-node-tooltip');
  if (!tooltip) return;
  const preview = getSafeStagePreview(mathText);
  tooltip.innerHTML = `<strong>STAGE ${stageId}</strong><div>${preview}</div>`;
  tooltip.style.left = `${Math.max(18, x - 40)}px`;
  tooltip.style.top = `${Math.max(24, y - 74)}px`;
  tooltip.classList.add('visible');
}

function hideMapNodeTooltip() {
  const tooltip = document.getElementById('map-node-tooltip');
  if (!tooltip) return;
  tooltip.classList.remove('visible');
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
async function renderStageMap() {
  const mapNodes = document.getElementById('map-nodes');
  const mapLinks = document.getElementById('map-links');
  const mapWorlds = document.getElementById('map-worlds');
  const progressLabel = document.getElementById('map-progress');
  const mapScreen = document.getElementById('stage-map-screen');
  if (!mapNodes || !mapLinks || !mapWorlds || !progressLabel || !mapScreen) return;

  mapScreen.classList.remove('hidden');
  mapNodes.innerHTML = '';
  mapLinks.innerHTML = '';
  mapWorlds.innerHTML = '';

  const allProblems = await getProblemsData();
  const hasBundle = !!(allProblems && allProblems.stages);
  const stageIds = [];
  for (let i = 1; i <= MAX_STAGE_NUMBER; i++) {
    if (!hasBundle || allProblems.stages[String(i)]) {
      stageIds.push(i);
    }
  }

  const cols = 8;
  const startX = 110;
  const startY = 120;
  const xGap = 180;
  const yGap = 170;
  const points = [];

  stageIds.forEach((stageId, index) => {
    const row = Math.floor(index / cols);
    const colInRow = index % cols;
    const zigzagCol = row % 2 === 0 ? colInRow : (cols - 1 - colInRow);

    const x = startX + zigzagCol * xGap;
    const y = startY + row * yGap;
    points.push({ stageId, x, y });

    const isCleared = clearedStages.includes(stageId);
    const isUnlocked = unlockAll || stageId === 1 || clearedStages.includes(stageId - 1);

    const node = document.createElement('button');
    node.className = `map-node ${isCleared ? 'cleared' : isUnlocked ? 'unlocked' : 'locked'}`;
    node.style.left = `${x}px`;
    node.style.top = `${y}px`;
    node.type = 'button';
    node.innerHTML = `${stageId}<span class='map-node-icon'>${isCleared ? '✓' : isUnlocked ? '▶' : '🔒'}</span><span class='map-node-label'>STAGE ${stageId}</span>`;

    const stageData = hasBundle ? allProblems.stages[String(stageId)] : null;
    node.addEventListener('mouseenter', () => {
      showMapNodeTooltip(stageId, stageData?.mathText || '', x + 72, y + 10);
    });
    node.addEventListener('mouseleave', () => {
      hideMapNodeTooltip();
    });

    node.onclick = async () => {
      if (!isUnlocked) {
        showToast('このステージはまだロック中です。', true);
        return;
      }
      currentStageNumber = stageId;
      await transitionToStage(stageId);
    };

    mapNodes.appendChild(node);
  });

  for (let i = 0; i < points.length - 1; i++) {
    const from = points[i];
    const to = points[i + 1];
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', String(from.x + 47));
    line.setAttribute('y1', String(from.y + 47));
    line.setAttribute('x2', String(to.x + 47));
    line.setAttribute('y2', String(to.y + 47));
    const shouldGlowPath = unlockAll || clearedStages.includes(from.stageId);
    if (shouldGlowPath) line.classList.add('map-link-lit');
    mapLinks.appendChild(line);
  }

  WORLD_SEGMENTS.forEach((world) => {
    const startIndex = stageIds.indexOf(world.start);
    const endIndex = stageIds.indexOf(world.end);
    if (startIndex === -1 || endIndex === -1) return;

    const startPoint = points[startIndex];
    const endPoint = points[endIndex];
    const top = Math.max(12, Math.min(startPoint.y, endPoint.y) - 86);

    const badge = document.createElement('div');
    badge.className = 'map-world-badge';
    badge.style.top = `${top}px`;
    badge.innerHTML = `<h4>${world.title}</h4><p>${world.start} - ${world.end}: ${world.subtitle}</p>`;
    mapWorlds.appendChild(badge);
  });

  progressLabel.textContent = `${clearedStages.length} / ${MAX_STAGE_NUMBER} CLEAR`;
}

async function renderStageSelectionDynamic() {
  await renderStageMap();
}

// セーブデータ + チュートリアル既読フラグを初期化
function resetSaveData() {
  localStorage.removeItem('s');
  localStorage.removeItem('tutorial_seen');
  localStorage.removeItem('unlock_all');
  clearedStages = [];
  unlockAll = false;
  renderStageMap();
}

// 全問題を開放してチャレンジ可能にする
function unlockAllStages() {
  unlockAll = true;
  localStorage.setItem('unlock_all', '1');
  renderStageMap();
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

/**
 * problems.json を一度だけ取得してキャッシュする。
 * 取得失敗時は null を返し、既存の stage 個別 JSON へフォールバックする。
 */
async function getProblemsData() {
  if (problemsDataCache) return problemsDataCache;

  try {
    const response = await fetch('problems.json');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    problemsDataCache = await response.json();
    return problemsDataCache;
  } catch (error) {
    return null;
  }
}

// ===== ステージロード =====
/**
 * 指定ステージを読み込み、ワークスペースと UI を初期化する。
 * @param {number} stageNumber
 */
async function loadStage(stageNumber) {
  try {
    const allProblems = await getProblemsData();
    const fromBundle = allProblems?.stages?.[String(stageNumber)] || null;

    if (fromBundle) {
      currentProblemData = fromBundle;
    } else {
      const response = await fetch(`problems/${stageNumber}.json`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      currentProblemData = await response.json();
    }

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
window.mathGenerator = mathGenerator;
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
    renderStageMap();
    switchScreen('stage-map-screen');
  });

  document.getElementById('btn-entry-tutorial')?.addEventListener('click', async () => {
    closeGameEntrance();
    currentStageNumber = TUTORIAL_STAGE_NUMBER;
    switchScreen('p');
    await loadStage(TUTORIAL_STAGE_NUMBER);
    openInteractiveTutorialOverlay();
  });

  document.getElementById('btn-entry-map')?.addEventListener('click', async () => {
    localStorage.setItem('tutorial_seen', 'true');
    closeGameEntrance();
    await routeToTarget();
  });

  document.getElementById('btn-tutorial-next')?.addEventListener('click', () => {
    if (!tutorialModeActive) return;
    tutorialStepIndex = Math.min(tutorialStepIndex + 1, TUTORIAL_STEPS.length - 1);
    showTutorialStep();
  });

  document.getElementById('btn-tutorial-skip')?.addEventListener('click', () => {
    skipInteractiveTutorial();
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
      renderStageMap();
      switchScreen('stage-map-screen');
    }
  });

  document.getElementById('btn-submit')?.addEventListener('click', () => {
    const ast = parseBlocksToAST(workspace, mathGenerator);

    if (tutorialModeActive && currentStageNumber === TUTORIAL_STAGE_NUMBER) {
      const tutorialState = getTutorialCompletionState(ast);
      tutorialStepIndex = tutorialState.firstMissingIndex;
      showTutorialStep();

      if (!tutorialState.isComplete) {
        showToast(`<span style='color:#ff4b4b'>${TUTORIAL_STEPS[tutorialState.firstMissingIndex].text}</span>`);
        return;
      }

      if (!currentStageSolved) {
        currentStreak += 1;
        updateStreakCounter(true);
      }
      currentStageSolved = true;

      showToast("<span style='color:#58cc02; font-size:1.2em;'>🎉 Stage 0 クリア！ガイド完了です！</span>", false);
      if (typeof confetti === 'function') {
        confetti({
          particleCount: 220,
          spread: 95,
          origin: { y: 0.58 },
          colors: ['#22c55e', '#1d4ed8', '#f59e0b', '#eab308'],
        });
      }

      if (!clearedStages.includes(currentStageNumber)) {
        clearedStages.push(currentStageNumber);
        localStorage.setItem('s', JSON.stringify(clearedStages));
      }

      completeTutorialAndOpenMap();
      return;
    }

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

      if (currentStageNumber === TUTORIAL_STAGE_NUMBER && localStorage.getItem('tutorial_seen') !== 'true') {
        completeTutorialAndOpenMap();
        showToast('<span style="color:#2563eb">チュートリアルクリア！次はステージマップへ進みましょう。</span>', false);
        return;
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
/**
 * URL パラメータに応じてステージ画面か一覧画面へ遷移する。
 */
async function routeToTarget() {
  const urlParams = new URLSearchParams(window.location.search);
  const stageParam = parseInt(urlParams.get('stage'), 10);

  if (stageParam >= 1 && stageParam <= 43) {
    currentStageNumber = stageParam;
    switchScreen('p');
    await loadStage(stageParam);
  } else {
    await renderStageMap();
    switchScreen('stage-map-screen');
  }
}

/**
 * 初回チュートリアル判定を含むアプリ起動シーケンス。
 */
async function bootApplication() {
  resetAppStateForGoLiveIfNeeded();

  setupEventListeners();
  bindTutorialWorkspaceAutoAdvance();
  updateStreakCounter(false);
  updateOverwritePermissionButton();

  const tutorialSeenFlag = localStorage.getItem('tutorial_seen');
  if (tutorialSeenFlag === null) {
    openGameEntrance();
    return;
  }

  closeGameEntrance();

  await routeToTarget();
}

bootApplication();
