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
const TUTORIAL_STAGE_IDS = ['0-1', '0-2', '0-3', '0-4', '0-5', '0-6'];
const APP_STORAGE_KEYS = ['s', 'unlock_all', 'tutorial_seen', 'proof_scaffold_mode'];
const MAP_WORLD_MIN_WIDTH = 3600;
const MAP_WORLD_MIN_HEIGHT = 2400;
const MAP_NODE_SIZE = 94;

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

function isTutorialStageId(stageId) {
  return TUTORIAL_STAGE_IDS.includes(String(stageId));
}

function getTutorialStageIndex(stageId) {
  return TUTORIAL_STAGE_IDS.indexOf(String(stageId));
}

function getNextTutorialStageId(stageId) {
  const index = getTutorialStageIndex(stageId);
  if (index === -1) return null;
  return TUTORIAL_STAGE_IDS[index + 1] || null;
}

function getTutorialBannerText(stageId) {
  const stage = String(stageId);
  if (stage === '0-1') return 'まずは tan を動かして公式②を入れよう。';
  if (stage === '0-2') return '次は sin^2+cos^2 を公式①でまとめよう。';
  if (stage === '0-3') return '最後は 1+tan^2 に公式③をつなげよう。';
  if (stage === '0-4') return 'ここからは少し難しめ。証明ブロックは自分で引き出してつなげよう。';
  if (stage === '0-5') return '同じく自力で構築。左の「証明」カテゴリから必要ブロックを取り出そう。';
  if (stage === '0-6') return '仕上げ問題。公式①と③を順に使う2段構成を試そう。';
  return '';
}

function isTutorialPullModeStage(stageId) {
  const stage = String(stageId);
  return stage === '0-4' || stage === '0-5';
}

function updateTutorialProgress(stageId) {
  const shell = document.getElementById('tutorial-progress-shell');
  const fill = document.getElementById('tutorial-progress-fill');
  const label = document.getElementById('tutorial-progress-label');
  const rate = document.getElementById('tutorial-progress-rate');
  if (!shell || !fill || !label || !rate) return;

  if (!isTutorialStageId(stageId)) {
    shell.classList.remove('visible');
    fill.style.width = '0%';
    label.textContent = 'チュートリアル';
    rate.textContent = '0%';
    return;
  }

  const index = getTutorialStageIndex(stageId);
  const step = Math.max(1, index + 1);
  const percent = Math.round((step / TUTORIAL_STAGE_IDS.length) * 100);

  shell.classList.add('visible');
  fill.style.width = `${percent}%`;
  label.textContent = `TUTORIAL ${step}/${TUTORIAL_STAGE_IDS.length}`;
  rate.textContent = `${percent}%`;
}

function getTutorialExpectedFormulaType(stageId) {
  const stage = String(stageId);
  if (stage === '0-1') return 'formula_2';
  if (stage === '0-2') return 'formula_1';
  if (stage === '0-3') return 'formula_3';
  if (stage === '0-5') return 'formula_2';
  return null;
}

function getTutorialExpectedFormulaLabel(stageId) {
  const formulaType = getTutorialExpectedFormulaType(stageId);
  if (formulaType === 'formula_1') return '公式①';
  if (formulaType === 'formula_2') return '公式②';
  if (formulaType === 'formula_3') return '公式③';
  return '公式';
}

function findTutorialReplaceOperation() {
  const proofStep = workspace?.getTopBlocks(false)?.find((block) => block.type === 'proof_step');
  if (!proofStep) return null;
  let current = proofStep.getInputTargetBlock('OPERATIONS');
  while (current) {
    if (current.type === 'replace_operation') return current;
    current = current.getNextBlock();
  }
  return null;
}

function findTutorialConclusionOperation() {
  const proofStep = workspace?.getTopBlocks(false)?.find((block) => block.type === 'proof_step');
  if (!proofStep) return null;
  let current = proofStep.getInputTargetBlock('OPERATIONS');
  while (current) {
    if (current.type === 'conclusion_operation') return current;
    current = current.getNextBlock();
  }
  return null;
}

function updateTutorialDragAssist(stageId) {
  const panel = document.getElementById('tutorial-drag-assist');
  const list = document.getElementById('tutorial-drag-assist-list');
  const coachText = document.getElementById('tutorial-coach-text');
  if (!panel || !list || !coachText) return;

  if (!isTutorialStageId(stageId)) {
    panel.classList.remove('visible');
    list.innerHTML = '';
    coachText.textContent = '';
    return;
  }

  const expectedFormulaType = getTutorialExpectedFormulaType(stageId);
  const expectedFormulaLabel = getTutorialExpectedFormulaLabel(stageId);
  const pullMode = isTutorialPullModeStage(stageId);
  coachText.textContent = pullMode
    ? `${getTutorialBannerText(stageId)} 置き換え・結論は左の「証明」カテゴリからドラッグ。`
    : getTutorialBannerText(stageId);
  const replaceOp = findTutorialReplaceOperation();
  const conclusionOp = findTutorialConclusionOperation();
  const connectedFormulaType = replaceOp?.getInputTargetBlock('FORMULA')?.type || null;
  const hasAnyFormulaInReplace = !!connectedFormulaType;

  const formulaItem = expectedFormulaType
    ? {
      text: `3) ${expectedFormulaLabel} ブロックを置き換えの公式スロットへドラッグ`,
      done: connectedFormulaType === expectedFormulaType,
    }
    : {
      text: '3) 必要な公式ブロックを置き換えの公式スロットへ接続',
      done: hasAnyFormulaInReplace,
    };

  const items = [
    {
      text: pullMode
        ? '1) 左の「証明」カテゴリから置き換えブロックを引き出す'
        : '1) 置き換えブロックを「証明」の操作欄へドラッグ',
      done: !!replaceOp,
    },
    {
      text: pullMode
        ? '2) 結論ブロックも引き出して、置き換えの下に接続'
        : '2) 結論ブロックを置き換えの下に接続',
      done: !!conclusionOp,
    },
    formulaItem,
    {
      text: '4) 変形前と変形後に式ブロックをつないで「判定する」を押す',
      done: !!replaceOp?.getInputTargetBlock('VALUE') && !!replaceOp?.getInputTargetBlock('REPLACEMENT') && !!conclusionOp?.getInputTargetBlock('VALUE'),
    },
  ];

  list.innerHTML = items
    .map((item) => `<li class="${item.done ? 'done' : ''}">${item.done ? '✓ ' : ''}${item.text}</li>`)
    .join('');
  panel.classList.add('visible');
}

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
  queueTutorialAutoAdvanceCheck();
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

// ===== Blockly 定義とワークスペース初期化 =====
const FORMULA_BLOCK_DEFS = [
  ['formula_1', '公式① sin(x)^2 + cos(x)^2 = 1'],
  ['formula_2', '公式② tan(x) = sin(x) / cos(x)'],
  ['formula_3', '公式③ 1 + tan(x)^2 = 1 / cos(x)^2'],
  ['formula_4', '公式④ sin(2*x) = 2*sin(x)*cos(x)'],
  ['formula_5', '公式⑤ sin(x)^2 = (1-cos(2*x))/2'],
  ['formula_6', '公式⑥ cos(x)^2 = (1+cos(2*x))/2'],
  ['formula_7', '公式⑦ tan(x) = sin(2*x)/(1+cos(2*x))'],
  ['formula_8', '公式⑧ tan(x)^2 = (1-cos(2*x))/(1+cos(2*x))'],
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
      this.setOutput(true, null);
      this.setColour(30);
    },
  };

  Blockly.Blocks.math_negate = {
    init() {
      this.appendValueInput('A').appendField('-(');
      this.appendDummyInput().appendField(')');
      this.setOutput(true, null);
      this.setColour(30);
    },
  };

  Blockly.Blocks.math_multiply = {
    init() {
      this.appendValueInput('A');
      this.appendValueInput('B').appendField('×');
      this.setOutput(true, null);
      this.setColour(30);
    },
  };

  Blockly.Blocks.math_fraction = {
    init() {
      this.appendValueInput('NUMERATOR').appendField('(');
      this.appendDummyInput().appendField('/');
      this.appendValueInput('DENOMINATOR').appendField(')');
      this.setOutput(true, null);
      this.setColour(30);
    },
  };

  Blockly.Blocks.math_square = {
    init() {
      this.appendValueInput('A');
      this.appendDummyInput().appendField('^2');
      this.setOutput(true, null);
      this.setColour(30);
    },
  };

  FORMULA_BLOCK_DEFS.forEach(([type, label]) => {
    Blockly.Blocks[type] = {
      init() {
        this.appendDummyInput().appendField(label);
        this.setOutput(true, null);
        this.setColour(260);
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
      this.appendValueInput('VALUE').appendField('置き換え 前');
      this.appendValueInput('FORMULA').appendField('公式');
      this.appendValueInput('REPLACEMENT').appendField('置き換え 後');
      this.setPreviousStatement(true, null);
      this.setNextStatement(true, null);
      this.setColour(120);
    },
  };

  Blockly.Blocks.common_denominator_operation = {
    init() {
      this.appendValueInput('VALUE').appendField('通分 前');
      this.appendValueInput('REPLACEMENT').appendField('通分 後');
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

const toolboxConfig = {
  kind: 'categoryToolbox',
  contents: [
    {
      kind: 'category',
      name: '基本',
      colour: '#3f51b5',
      contents: [
        { kind: 'block', type: 'custom_number' },
        { kind: 'block', type: 'term_sin' },
        { kind: 'block', type: 'term_cos' },
        { kind: 'block', type: 'term_tan' },
        { kind: 'block', type: 'term_sin2' },
        { kind: 'block', type: 'term_cos2' },
      ],
    },
    {
      kind: 'category',
      name: '角度',
      colour: '#00897b',
      contents: [
        { kind: 'block', type: 'term_pi' },
        { kind: 'block', type: 'term_pi_sixth' },
        { kind: 'block', type: 'term_pi_quarter' },
        { kind: 'block', type: 'term_pi_third' },
        { kind: 'block', type: 'term_pi_half' },
        { kind: 'block', type: 'term_two_pi_thirds' },
        { kind: 'block', type: 'term_three_pi_quarters' },
        { kind: 'block', type: 'term_five_pi_sixths' },
        { kind: 'block', type: 'term_half_value' },
        { kind: 'block', type: 'term_sqrt2_half' },
        { kind: 'block', type: 'term_sqrt3_half' },
        { kind: 'block', type: 'term_sin_of' },
        { kind: 'block', type: 'term_cos_of' },
        { kind: 'block', type: 'term_tan_of' },
      ],
    },
    {
      kind: 'category',
      name: '演算',
      colour: '#ef6c00',
      contents: [
        { kind: 'block', type: 'math_add' },
        { kind: 'block', type: 'math_negate' },
        { kind: 'block', type: 'math_multiply' },
        { kind: 'block', type: 'math_fraction' },
        { kind: 'block', type: 'math_square' },
      ],
    },
    {
      kind: 'category',
      name: '公式',
      colour: '#8e24aa',
      contents: FORMULA_BLOCK_DEFS.map(([type]) => ({ kind: 'block', type })),
    },
    {
      kind: 'category',
      name: '証明',
      colour: '#2e7d32',
      contents: [
        { kind: 'block', type: 'proof_step' },
        { kind: 'block', type: 'replace_operation' },
        { kind: 'block', type: 'common_denominator_operation' },
        { kind: 'block', type: 'conclusion_operation' },
      ],
    },
  ],
};

const workspace = Blockly.inject('l', {
  toolbox: toolboxConfig,
  renderer: 'zelos',
  trashcan: true,
  move: { scrollbars: true, drag: true, wheel: true },
  zoom: { controls: true, wheel: true, startScale: 1, maxScale: 2, minScale: 0.5, scaleSpeed: 1.1 },
});
window.workspace = workspace;

function forceWorkspaceLayoutSync() {
  if (!workspace) return;
  Blockly.svgResize(workspace);
  workspace.resizeContents();
  workspace.render();
}

function arrangeBlocks() {
  if (!workspace) return;

  forceWorkspaceLayoutSync();
  const metrics = workspace.getMetrics();
  const toolboxWidth = Math.max(0, metrics?.toolboxWidth || 0);
  const flyoutWidth = Math.max(0, metrics?.flyoutWidth || 0);
  const absoluteLeft = Math.max(0, metrics?.absoluteMetrics?.left || 0);
  const absoluteTop = Math.max(0, metrics?.absoluteMetrics?.top || 0);

  // ツールボックスと重ならない最小マージンを保証する。
  const leftInset = Math.max(250, absoluteLeft + toolboxWidth + flyoutWidth + 24);
  const topInset = Math.max(absoluteTop + 24, 24);
  const gap = 26;

  const topBlocks = workspace.getTopBlocks(true);
  let cursorY = topInset;
  topBlocks.forEach((block) => {
    const xy = block.getRelativeToSurfaceXY();
    const size = block.getHeightWidth();
    block.moveBy(leftInset - xy.x, cursorY - xy.y);
    cursorY += Math.max(40, size.height) + gap;
  });
}

// ===== 問題ロード/画面遷移 =====
async function getProblemsData() {
  if (problemsDataCache) return problemsDataCache;

  try {
    const response = await fetch('problems.json');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    problemsDataCache = await response.json();
  } catch (_) {
    problemsDataCache = { stages: {} };
  }

  return problemsDataCache;
}

function getUnlockLimit() {
  if (unlockAll) return MAX_STAGE_NUMBER;
  if (!Array.isArray(clearedStages) || clearedStages.length === 0) return 1;
  return Math.min(MAX_STAGE_NUMBER, Math.max(1, ...clearedStages) + 1);
}

function openSkipChallengeModal(currentStage, desiredTargetStage) {
  const safeTarget = Math.min(MAX_STAGE_NUMBER, Math.max(currentStage + 1, desiredTargetStage));
  const bypassedStages = [];
  for (let stage = currentStage + 1; stage < safeTarget; stage += 1) {
    bypassedStages.push(stage);
  }

  currentSkipOffer = {
    targetStage: safeTarget,
    bypassedStages,
  };

  const modal = document.getElementById('skip-challenge-modal');
  const message = document.getElementById('skip-challenge-message');
  if (message) {
    message.textContent = `連続正解ボーナス！ STAGE ${safeTarget} へ挑戦しますか？`;
  }
  if (modal) modal.classList.remove('hidden');
}

function applyPendingSkipClearIfNeeded() {
  if (!pendingSkipChallenge) return;
  if (currentStageNumber !== pendingSkipChallenge.targetStage) return;

  pendingSkipChallenge.bypassedStages.forEach((stage) => {
    if (!clearedStages.includes(stage)) {
      clearedStages.push(stage);
    }
  });

  localStorage.setItem('s', JSON.stringify(clearedStages));
  pendingSkipChallenge = null;
}

async function transitionToStage(stageNumber) {
  if (isTutorialStageId(stageNumber)) {
    currentStageNumber = String(stageNumber);
  } else {
    currentStageNumber = Math.max(1, Math.min(MAX_STAGE_NUMBER, Number(stageNumber) || 1));
  }
  switchScreen('p');
  await loadStage(currentStageNumber);
}

function buildStageNodePosition(index) {
  const col = index % 8;
  const row = Math.floor(index / 8);
  const isOddRow = row % 2 === 1;
  const x = isOddRow ? 1460 - col * 180 : 140 + col * 180;
  const y = 120 + row * 170;
  return { x, y };
}

function getCurrentMapFocusStage() {
  const unlockedLimit = getUnlockLimit();
  return Math.max(1, Math.min(MAX_STAGE_NUMBER, unlockedLimit));
}

function centerMapCameraOnStage(stageNumber, animate = true) {
  const viewport = document.getElementById('map-viewport');
  const world = document.getElementById('map-world');
  if (!viewport || !world) return;

  const targetNode = world.querySelector(`.map-node[data-stage="${stageNumber}"]`);
  if (!targetNode) return;

  const nodeCenterX = targetNode.offsetLeft + targetNode.offsetWidth / 2;
  const nodeCenterY = targetNode.offsetTop + targetNode.offsetHeight / 2;

  const maxX = Math.max(0, world.offsetWidth - viewport.clientWidth);
  const maxY = Math.max(0, world.offsetHeight - viewport.clientHeight);

  const targetX = Math.max(0, Math.min(maxX, nodeCenterX - viewport.clientWidth / 2));
  const targetY = Math.max(0, Math.min(maxY, nodeCenterY - viewport.clientHeight / 2));

  world.style.transition = animate ? 'transform 0.8s ease-out' : 'none';
  world.style.transform = `translate(${-targetX}px, ${-targetY}px)`;
}

function centerMapCameraOnCurrentStage(animate = true) {
  centerMapCameraOnStage(getCurrentMapFocusStage(), animate);
}

function drawMapLinks(svg, positions) {
  if (!svg) return;
  svg.innerHTML = '';

  for (let i = 1; i < positions.length; i += 1) {
    const prev = positions[i - 1];
    const curr = positions[i];
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', String(prev.x + MAP_NODE_SIZE / 2));
    line.setAttribute('y1', String(prev.y + MAP_NODE_SIZE / 2));
    line.setAttribute('x2', String(curr.x + MAP_NODE_SIZE / 2));
    line.setAttribute('y2', String(curr.y + MAP_NODE_SIZE / 2));
    svg.appendChild(line);
  }
}

async function renderStageMap() {
  const nodeRoot = document.getElementById('map-nodes');
  const links = document.getElementById('map-links');
  const mapWorld = document.getElementById('map-world');
  const progressLabel = document.getElementById('map-progress');
  const overallBar = document.getElementById('overall-progress');
  const progressText = document.getElementById('progress-text');
  if (!nodeRoot || !links || !mapWorld) return;

  const unlockedLimit = getUnlockLimit();
  const positions = Array.from({ length: MAX_STAGE_NUMBER }, (_, i) => buildStageNodePosition(i));
  const lastPosition = positions[positions.length - 1] || { x: 0, y: 0 };
  const worldWidth = Math.max(MAP_WORLD_MIN_WIDTH, lastPosition.x + 700);
  const worldHeight = Math.max(MAP_WORLD_MIN_HEIGHT, lastPosition.y + 520);

  mapWorld.style.width = `${worldWidth}px`;
  mapWorld.style.height = `${worldHeight}px`;
  links.setAttribute('viewBox', `0 0 ${worldWidth} ${worldHeight}`);

  drawMapLinks(links, positions);

  nodeRoot.innerHTML = '';
  positions.forEach(({ x, y }, idx) => {
    const stage = idx + 1;
    const isCleared = clearedStages.includes(stage);
    const isUnlocked = unlockAll || stage <= unlockedLimit;

    const node = document.createElement('button');
    node.type = 'button';
    node.className = `map-node ${isCleared ? 'cleared' : isUnlocked ? 'unlocked' : 'locked'}`;
    node.style.left = `${x}px`;
    node.style.top = `${y}px`;
    node.dataset.stage = String(stage);
    node.textContent = String(stage);
    if (isUnlocked) {
      node.onclick = async () => {
        currentStageNumber = stage;
        switchScreen('p');
        await loadStage(stage);
      };
    }

    const label = document.createElement('div');
    label.className = 'map-node-label';
    label.textContent = `Stage ${stage}`;
    node.appendChild(label);

    nodeRoot.appendChild(node);
  });

  const clearCount = clearedStages.filter((stage) => stage >= 1 && stage <= MAX_STAGE_NUMBER).length;
  if (progressLabel) progressLabel.textContent = `${clearCount} / ${MAX_STAGE_NUMBER} CLEAR`;
  if (overallBar) overallBar.style.width = `${(clearCount / MAX_STAGE_NUMBER) * 100}%`;
  if (progressText) progressText.textContent = `${clearCount} / ${MAX_STAGE_NUMBER} クリア`;

  requestAnimationFrame(() => {
    centerMapCameraOnCurrentStage(false);
  });
}

function unlockAllStages() {
  unlockAll = true;
  localStorage.setItem('unlock_all', '1');
  renderStageMap();
}

function resetSaveData() {
  APP_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
  localStorage.removeItem('unlock_all');
  clearedStages = [];
  unlockAll = false;
  currentStreak = 0;
  pendingSkipChallenge = null;
  currentSkipOffer = null;
  updateStreakCounter(false);
  renderStageMap();
}

window.unlockAllStages = unlockAllStages;
window.resetSaveData = resetSaveData;

// ===== チュートリアル補助 =====
function getTutorialCompletionState(astArray) {
  const ast = Array.isArray(astArray) ? astArray : [];
  const hasFormula2 = ast.some((step) => step?.type === 'replace_operation' && formulaTextToId(step?.formula) === 'formula_2');
  const hasCommonDenominator = ast.some((step) => step?.type === 'common_denominator_operation');
  const hasFormula1 = ast.some((step) => step?.type === 'replace_operation' && formulaTextToId(step?.formula) === 'formula_1');
  const hasFormula3 = ast.some((step) => step?.type === 'replace_operation' && formulaTextToId(step?.formula) === 'formula_3');

  let firstMissingIndex = 0;
  if (hasFormula2) firstMissingIndex = 1;
  if (hasFormula2 && hasCommonDenominator) firstMissingIndex = 2;
  if (hasFormula2 && hasCommonDenominator && hasFormula1 && hasFormula3) {
    firstMissingIndex = TUTORIAL_STEPS.length - 1;
    return { isComplete: true, firstMissingIndex };
  }

  return { isComplete: false, firstMissingIndex };
}

function openInteractiveTutorialOverlay() {
  const overlay = document.getElementById('tutorial-overlay');
  if (!overlay) return;
  tutorialModeActive = true;
  tutorialStepIndex = 0;
  overlay.classList.remove('hidden');
  showTutorialStep();
  queueTutorialAutoAdvanceCheck();
}

function skipInteractiveTutorial() {
  localStorage.setItem('tutorial_seen', 'true');
  hideTutorialOverlay();
  routeToTarget();
}

async function completeTutorialAndOpenMap() {
  localStorage.setItem('tutorial_seen', 'true');
  hideTutorialOverlay();
  await renderStageMap();
  switchScreen('stage-map-screen');
}

// ===== インタラクティブ単位円 =====
function drawUnitCircle(angleDeg) {
  const canvas = document.getElementById('unit-circle');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const width = canvas.width;
  const height = canvas.height;
  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.min(width, height) * 0.34;
  const angleRad = (angleDeg * Math.PI) / 180;
  const px = cx + radius * Math.cos(angleRad);
  const py = cy - radius * Math.sin(angleRad);

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(20, cy);
  ctx.lineTo(width - 20, cy);
  ctx.moveTo(cx, 20);
  ctx.lineTo(cx, height - 20);
  ctx.stroke();

  ctx.strokeStyle = '#0ea5e9';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.stroke();

  // 半径
  ctx.strokeStyle = '#1d4ed8';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(px, py);
  ctx.stroke();

  // cos 成分（横）
  ctx.strokeStyle = '#16a34a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(px, cy);
  ctx.stroke();

  // sin 成分（縦）
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(px, cy);
  ctx.lineTo(px, py);
  ctx.stroke();

  // tan 線（90/270° 近傍は描画しない）
  const cosValue = Math.cos(angleRad);
  if (Math.abs(cosValue) > 0.03) {
    const tanValue = Math.tan(angleRad);
    const tanX = cx + radius;
    const tanY = cy - radius * tanValue;
    const safeY = Math.max(20, Math.min(height - 20, tanY));

    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(tanX, safeY);
    ctx.stroke();
  }

  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 14px sans-serif';
  ctx.fillText(`angle: ${angleDeg.toFixed(0)}°`, 12, 22);
  ctx.fillText(`sin: ${Math.sin(angleRad).toFixed(4)}`, 12, 42);
  ctx.fillText(`cos: ${Math.cos(angleRad).toFixed(4)}`, 12, 62);
  if (Math.abs(cosValue) > 0.0001) {
    ctx.fillText(`tan: ${Math.tan(angleRad).toFixed(4)}`, 12, 82);
  } else {
    ctx.fillText('tan: ∞', 12, 82);
  }
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

  if (screenId === 'stage-map-screen') {
    requestAnimationFrame(() => {
      centerMapCameraOnCurrentStage(true);
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

function updateTutorialBanner(stageId) {
  updateTutorialProgress(stageId);
  updateTutorialDragAssist(stageId);
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

function queueTutorialAutoAdvanceCheck() {
  if (!tutorialModeActive || !isTutorialStageId(currentStageNumber)) return;

  if (tutorialAutoAdvanceFrameId) {
    cancelAnimationFrame(tutorialAutoAdvanceFrameId);
    tutorialAutoAdvanceFrameId = 0;
  }

  tutorialAutoAdvanceFrameId = requestAnimationFrame(() => {
    tutorialAutoAdvanceFrameId = 0;

    let ast = [];
    try {
      ast = parseBlocksToAST(workspace, mathGenerator);
    } catch (_) {
      return;
    }

    const tutorialState = getTutorialCompletionState(ast);
    const nextStepIndex = Math.max(0, Math.min(tutorialState.firstMissingIndex, TUTORIAL_STEPS.length - 1));
    if (nextStepIndex !== tutorialStepIndex) {
      tutorialStepIndex = nextStepIndex;
      showTutorialStep();
    }
  });
}

function bindTutorialWorkspaceAutoAdvance() {
  if (tutorialWorkspaceListenerBound) return;
  tutorialWorkspaceListenerBound = true;

  workspace.addChangeListener((event) => {
    if (!tutorialModeActive || !isTutorialStageId(currentStageNumber)) return;
    if (!event || event.isUiEvent) return;
    queueTutorialAutoAdvanceCheck();
  });
}

async function advanceTutorialFlowOrComplete() {
  if (tutorialFlowIndex < tutorialFlowProblems.length - 1) {
    await loadTutorialFlowProblem(tutorialFlowIndex + 1);
    showToast(`<span style='color:#2563eb'>チュートリアル ${tutorialFlowIndex + 1}/${tutorialFlowProblems.length} へ進みました。</span>`);
    return;
  }

  await completeTutorialAndOpenMap();
}

// ===== ステージロード =====
/**
 * 指定ステージを読み込み、ワークスペースと UI を初期化する。
 * @param {number|string} stageNumber
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
    if (stageText) {
      stageText.innerText = isTutorialStageId(stageNumber)
        ? `TUTORIAL ${getTutorialStageIndex(stageNumber) + 1}/${TUTORIAL_STAGE_IDS.length}`
        : `STAGE ${stageNumber}`;
    }
    if (problemText) problemText.innerText = currentProblemData.mathText || '';
    updateTutorialBanner(stageNumber);

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

    if (!isTutorialStageId(stageNumber)) {
      applyConditionalInitialStateGeneration(workspace);
    }

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
    await transitionToStage('0-1');
  });

  document.getElementById('btn-entry-map')?.addEventListener('click', async () => {
    localStorage.setItem('tutorial_seen', 'true');
    closeGameEntrance();
    await routeToTarget();
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

  document.getElementById('btn-unit-circle')?.addEventListener('click', () => {
    const modal = document.getElementById('unit-circle-modal');
    const slider = document.getElementById('unit-circle-angle');
    if (modal) modal.classList.remove('hidden');
    drawUnitCircle(Number(slider?.value || 0));
  });

  document.getElementById('btn-unit-circle-close')?.addEventListener('click', () => {
    const modal = document.getElementById('unit-circle-modal');
    if (modal) modal.classList.add('hidden');
  });

  document.getElementById('unit-circle-angle')?.addEventListener('input', (event) => {
    const angle = Number(event?.target?.value || 0);
    drawUnitCircle(angle);
  });

  document.getElementById('btn-next')?.addEventListener('click', () => {
    closeSkipChallengeModal();
    currentSkipOffer = null;
    document.getElementById('btn-next').style.display = 'none';
    document.getElementById('btn-submit').style.display = 'inline-block';

    if (isTutorialStageId(currentStageNumber)) {
      const nextTutorialStage = getNextTutorialStageId(currentStageNumber);
      if (nextTutorialStage) {
        transitionToStage(nextTutorialStage);
      } else {
        localStorage.setItem('tutorial_seen', 'true');
        updateTutorialBanner('');
        renderStageMap();
        switchScreen('stage-map-screen');
      }
      return;
    }

    if (currentStageNumber < MAX_STAGE_NUMBER) {
      transitionToStage(currentStageNumber + 1);
    } else {
      renderStageMap();
      switchScreen('stage-map-screen');
    }
  });

  document.getElementById('btn-submit')?.addEventListener('click', async () => {
    const ast = parseBlocksToAST(workspace, mathGenerator);
    console.log('[AST]', ast);

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

      if (!isTutorialStageId(currentStageNumber) && !clearedStages.includes(currentStageNumber) && currentStageNumber >= 1) {
        clearedStages.push(currentStageNumber);
        localStorage.setItem('s', JSON.stringify(clearedStages));
      }

      if (isTutorialStageId(currentStageNumber)) {
        document.getElementById('btn-submit').style.display = 'none';
        const nextBtn = document.getElementById('btn-next');
        if (nextBtn) {
          nextBtn.style.display = 'inline-block';
          nextBtn.innerText = getNextTutorialStageId(currentStageNumber) ? '次へ進む' : 'マップへ進む';
        }
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

  workspace.addChangeListener((event) => {
    if (!event || event.isUiEvent) return;
    if (!isTutorialStageId(currentStageNumber)) return;
    updateTutorialDragAssist(currentStageNumber);
  });

  window.addEventListener('resize', () => {
    if (!document.getElementById('stage-map-screen')?.classList.contains('b')) return;
    centerMapCameraOnCurrentStage(false);
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
