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
let currentStreak = 0;
let currentStageSolved = false;
let currentSkipOffer = null;
let pendingSkipChallenge = null;
let hasBoundEventListeners = false;
let problemsDataCache = null;
let tutorialStepIndex = 0;
let tutorialModeActive = false;
let tutorialAutoAdvanceFrameId = 0;
let tutorialWorkspaceListenerBound = false;
let tutorialFlowProblems = [];
let tutorialFlowIndex = 0;
let tutorialIntroIndex = 0;
let tutorialProgressCount = Math.max(0, parseInt(localStorage.getItem('tutorial_progress') || '0', 10) || 0);
let goalHintActive = false;
let currentHighlightTargetNode = null;
let currentHighlightInputObj = null;
let highlightTrackingFrameId = 0;

// ===== 新機能: 公式アンロック状態 =====
const UNLOCKED_FORMULAS_STORAGE_KEY = 'unlocked_formulas';

function loadUnlockedFormulasFromStorage() {
  try {
    const raw = localStorage.getItem(UNLOCKED_FORMULAS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map((id) => String(id)) : [];
  } catch (_) {
    return [];
  }
}

function saveUnlockedFormulasToStorage(formulaIds) {
  const safeIds = Array.isArray(formulaIds) ? formulaIds.map((id) => String(id)) : [];
  localStorage.setItem(UNLOCKED_FORMULAS_STORAGE_KEY, JSON.stringify(safeIds));
}

let unlockedFormulas = loadUnlockedFormulasFromStorage();

const MAX_STAGE_NUMBER = 100;
const TUTORIAL_STAGE_IDS = ['0-1', '0-2', '0-3', '0-4', '0-5', '0-6', '0-7'];
const APP_STORAGE_KEYS = ['s', 'unlock_all', 'tutorial_seen', 'proof_scaffold_mode', 'tutorial_progress', UNLOCKED_FORMULAS_STORAGE_KEY];
const MAP_WORLD_MIN_WIDTH = 3600;
const MAP_WORLD_MIN_HEIGHT = 2400;
const MAP_NODE_SIZE = 94;

const BLOCK_HOLE_OFFSETS = {
  // 置き換えブロック（replace_operation） - image_51bf00.png に基づき修正
  'replace_operation': {
    // 入力ラベル（Blockly内部名と想定）に応じたオフセット（上からのpx）
    'EXPRESSION': { rightOffset: -10, topOffset: 20 }, // 一番上「式:」の穴
    'FORMULA': { rightOffset: -10, topOffset: 64 },    // 真ん中「公式:」の穴（公式②ブロックが繋がっている場所）
    'RESULT': { rightOffset: -10, topOffset: 108 },     // 一番下「変形後:」の穴
    'NEXT_STATEMENT': { leftOffset: 16, bottomOffset: -20 } // 下に繋ぐ接続部分
  },
  // 通分ブロック（common_denominator_operation）
  'common_denominator_operation': {
    'NEXT_STATEMENT': { leftOffset: 16, bottomOffset: -20 }
  },
  // 証明の枠（proof_step）
  'proof_step': {
    'STATEMENT': { leftOffset: 16, topOffset: 36 } // 「証明:」ラベルの右の大きな穴
  },
  // デフォルト（その他）
  'default': {
    'VALUE': { rightOffset: -10, topOffset: 'center' },
    'NEXT_STATEMENT': { leftOffset: 16, bottomOffset: -20 }
  }
};

const TUTORIAL_STEPS = [
  {
    key: '1️⃣',
    text: '📚 ようこそ！\n数式パズルの遊び方を覚えよう！',
    help: '左のメニューからブロックを引っ張ってきて、式を繋げてみてね。',
    targetId: 'l',
  },
  {
    key: '2️⃣',
    text: '🧮 公式を使ってみよう\n紫の「公式ブロック」を穴に入れてみて！',
    help: '公式を使って、式を違う形に「置き換え」るのが基本だよ。',
    targetId: 'l',
  },
  {
    key: '3️⃣',
    text: '✨ 公式を組み合わせる\nいろんな公式を使って、式をどんどん変身させよう！',
    help: '目的の形になるまで、ブロックを繋げていってね。',
    targetId: 'l',
  },
  {
    key: '🎯',
    text: '🎉 チュートリアル完了！\n遊び方はもうバッチリだね！',
    help: 'マップ画面から好きなステージを選んで挑戦してみよう！',
    targetId: 'l',
  },
];

const WORLD_SEGMENTS = [
  { start: 1, end: 25, title: 'World 1: Foundational Route', subtitle: '公式の基本連結' },
  { start: 26, end: 50, title: 'World 2: Conversion Ridge', subtitle: '変換の往復を習得' },
  { start: 51, end: 75, title: 'World 3: Identity Frontier', subtitle: '恒等式の複合運用' },
  { start: 76, end: 85, title: 'World 4: Master Ascent', subtitle: '最終証明ゾーン' },
  { start: 86, end: 100, title: 'World 5: Apex Legend', subtitle: '最高難度の集大成' },
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
  const state = getTutorialGoalState(stageId);
  return state ? state.text : '';
}

function requiresCommonDenominator(problemData) {
  if (!problemData) return false;

  const requiredTypes = parseRequiredBlockTypes(problemData.requiredBlocks || []);
  return requiredTypes.includes('common_denominator_operation');
}

function getTutorialOperationLabel(type) {
  if (type === 'replace_operation') return '置き換え';
  if (type === 'common_denominator_operation') return '通分';
  if (type === 'conclusion_operation') return 'よって';
  return type || '操作';
}

function sortBlocksByPosition(blocks) {
  return (blocks || []).slice().sort((first, second) => {
    const firstPos = first?.getRelativeToSurfaceXY?.() || { x: 0, y: 0 };
    const secondPos = second?.getRelativeToSurfaceXY?.() || { x: 0, y: 0 };
    if (firstPos.y !== secondPos.y) return firstPos.y - secondPos.y;
    return firstPos.x - secondPos.x;
  });
}

function getTutorialOperationMissingHole(type, block) {
  if (!block) return null;
  if (type === 'replace_operation') {
    if (!block.getInputTargetBlock('VALUE')) {
      return { key: 'fill-replace-value', text: '【目標】『置き換え』ブロックの「式」の穴を埋めましょう。' };
    }
    if (!block.getInputTargetBlock('FORMULA')) {
      return { key: 'fill-replace-formula', text: '【目標】『置き換え』ブロックの「公式」の穴を埋めましょう。' };
    }
    if (!block.getInputTargetBlock('REPLACEMENT')) {
      return { key: 'fill-replace-result', text: '【目標】『置き換え』ブロックの「結果」の穴を埋めましょう。' };
    }
  }
  if (type === 'common_denominator_operation') {
    if (!block.getInputTargetBlock('VALUE') || !block.getInputTargetBlock('REPLACEMENT')) {
      return { key: 'fill-common', text: '【目標】『通分』ブロックの空いている穴を埋めましょう。' };
    }
  }
  if (type === 'conclusion_operation') {
    if (!block.getInputTargetBlock('VALUE')) {
      return { key: 'fill-conclusion-value', text: '【目標】『よって〜となる』ブロックの空いている穴を埋めましょう。' };
    }
  }
  return null;
}

function getTutorialTargetOperationState(stageId) {
  if (!isTutorialStageId(stageId) || !workspace || !currentProblemData) return null;

  const requiredTypes = parseRequiredBlockTypes(currentProblemData.requiredBlocks || []);
  if (requiredTypes.length === 0) return { isComplete: true, requiredTypes: [] };

  const blocksByType = Object.create(null);
  requiredTypes.forEach((type) => {
    if (!blocksByType[type]) {
      blocksByType[type] = sortBlocksByPosition(workspace.getBlocksByType(type, false));
    }
  });

  const usedCounts = Object.create(null);
  for (const type of requiredTypes) {
    const index = usedCounts[type] || 0;
    const block = (blocksByType[type] || [])[index] || null;
    if (!block) {
      return { isComplete: false, type, block: null, isMissing: true };
    }

    const missingHole = getTutorialOperationMissingHole(type, block);
    if (missingHole) {
      return { isComplete: false, type, block, isMissing: false };
    }

    usedCounts[type] = index + 1;
  }

  return { isComplete: true, requiredTypes };
}

function getTutorialGoalState(stageId) {
  if (!isTutorialStageId(stageId)) return null;

  const targetState = getTutorialTargetOperationState(stageId);
  if (!targetState || targetState.isComplete) {
    return { key: 'ready-check', text: '【目標】必要な穴が埋まったら、「チェックする！」ボタンを押しましょう。' };
  }

  const targetType = targetState.type;
  const targetLabel = getTutorialOperationLabel(targetType);
  const targetBlock = targetState.block;

  if (targetState.isMissing || !targetBlock) {
    const key = targetType === 'replace_operation'
      ? 'pull-replace'
      : targetType === 'common_denominator_operation'
        ? 'pull-common'
        : targetType === 'conclusion_operation'
          ? 'pull-conclusion'
          : 'pull-operation';
    return { key, text: `【目標】左のメニューから『${targetLabel}』ブロックを引き出しましょう。` };
  }

  const missingHole = getTutorialOperationMissingHole(targetType, targetBlock);
  const isFormulaHole = targetType === 'replace_operation'
    && missingHole
    && missingHole.key === 'fill-replace-formula';

  const requiredFormulaIdsRaw = typeof getRequiredFormulaIdsForProblem === 'function'
    ? getRequiredFormulaIdsForProblem(currentProblemData)
    : [];
  const requiredFormulaIds = requiredFormulaIdsRaw
    .map((id) => String(id))
    .filter((id) => !!id)
    .filter((id) => (typeof isSupportedFormulaId === 'function' ? isSupportedFormulaId(id) : true));

  const hasFloatingFormula = workspace.getTopBlocks(false).some((block) => {
    const type = String(block.type || '');
    if (!type.startsWith('formula_')) return false;
    if (requiredFormulaIds.length === 0) return true;
    return requiredFormulaIds.includes(type);
  });

  if (targetType === 'replace_operation') {
    const formulaMissing = !targetBlock.getInputTargetBlock('FORMULA');
    if (formulaMissing && !hasFloatingFormula) {
      return { key: 'pull-formula', text: '【目標】左のメニューから必要な「公式」ブロックを引き出しましょう。' };
    }
  }

  const hasFloatingMath = workspace.getTopBlocks(false).some((block) =>
    !isProofOrOperationBlockType(block.type) && !String(block.type || '').startsWith('formula_')
  );

  if (missingHole && !hasFloatingMath && !isFormulaHole) {
    if (targetType === 'conclusion_operation') {
      return { key: 'pull-math-conclusion', text: '【目標】左のメニューから基本にある問題の式から、よってに入る「数式」ブロックを引き出しましょう。' };
    }
    return { key: 'pull-math-parts', text: '【目標】左のメニューから、穴を埋めるための「数式」ブロックを引き出しましょう。' };
  }

  if (missingHole) {
    return missingHole;
  }

  return { key: 'ready-check', text: '【目標】必要な穴が埋まったら、「チェックする！」ボタンを押しましょう。' };
}

function isTutorialPullModeStage(stageId) {
  const stage = String(stageId);
  return stage === '0-4' || stage === '0-5';
}

// ===== チュートリアルブロック制限ロジック =====
function getTutorialAllowedBlockTypes(stageId) {
  // チュートリアルステージごとに使用可能なブロックタイプを制限
  const stage = String(stageId);
  
  // 基本ブロック（すべてのステージで利用可能）
  const basicBlocks = ['custom_number', 'term_sin', 'term_cos', 'term_tan', 'term_sin2', 'term_cos2', 
                       'math_add', 'math_negate', 'math_multiply', 'math_fraction', 'math_square'];
  
  // 各ステージでの許可ブロック
  const stageRestrictions = {
    '0-1': { operations: ['replace_operation', 'conclusion_operation'], formulas: ['formula_1'] },
    '0-2': { operations: ['replace_operation', 'conclusion_operation'], formulas: ['formula_2'] },
    '0-3': { operations: ['replace_operation', 'conclusion_operation'], formulas: ['formula_3'] },
    '0-4': { operations: ['replace_operation', 'conclusion_operation'], formulas: ['formula_1'] },
    '0-5': { operations: ['replace_operation', 'conclusion_operation'], formulas: ['formula_2'] },
    '0-6': { operations: ['replace_operation', 'common_denominator_operation', 'conclusion_operation'], formulas: ['formula_1'] },
    '0-7': { operations: ['replace_operation', 'conclusion_operation'], formulas: ['formula_1', 'formula_3'] },
  };
  
  const restriction = stageRestrictions[stage] || null;
  if (!restriction) return { allowed: true, types: null }; // 非チュートリアル、制限なし
  
  return {
    allowed: false,
    basicBlocks,
    operationBlocks: restriction.operations,
    formulaBlocks: restriction.formulas
  };
}

function isBlockAllowedInTutorial(blockType, stageId) {
  if (!isTutorialStageId(stageId)) return true;
  
  const restriction = getTutorialAllowedBlockTypes(stageId);
  if (restriction.allowed !== false) return true; // 制限なし
  
  // 基本ブロックは常に許可
  if (restriction.basicBlocks?.includes(blockType)) return true;
  
  // 操作・数式ブロックは制限
  if (restriction.operationBlocks?.includes(blockType)) return true;
  if (restriction.formulaBlocks?.includes(blockType)) return true;
  
  return false;
}

function applyTutorialBlockRestrictions() {
  if (!isTutorialStageId(currentStageNumber)) return;
  if (!workspace) return;
  
  // ツールボックスをフィルタリング
  const restriction = getTutorialAllowedBlockTypes(currentStageNumber);
  if (restriction.allowed !== false) return; // 制限なし
  
  // 利用可能なブロックタイプ
  const allowedTypes = new Set([
    ...restriction.basicBlocks,
    ...restriction.operationBlocks,
    ...restriction.formulaBlocks
  ]);
  
  // ツールボックスカテゴリをフィルタリング
  const toolboxElement = workspace.getToolbox();
  if (!toolboxElement) return;

  const categories = typeof toolboxElement.getCategories === 'function'
    ? toolboxElement.getCategories()
    : typeof toolboxElement.getToolboxItems === 'function'
      ? toolboxElement.getToolboxItems()
      : [];

  categories.forEach((category) => {
    const blocks = typeof category.getContents === 'function' ? category.getContents() : [];
    blocks.forEach((block) => {
      if (!block || !block.type || typeof block.setDisabled !== 'function') return;
      if (!allowedTypes.has(block.type)) {
        block.setDisabled(true);
      }
    });
  });
}

function clearTutorialBlockRestrictions() {
  if (!workspace) return;
  const toolboxElement = workspace.getToolbox();
  if (!toolboxElement) return;

  const categories = typeof toolboxElement.getCategories === 'function'
    ? toolboxElement.getCategories()
    : typeof toolboxElement.getToolboxItems === 'function'
      ? toolboxElement.getToolboxItems()
      : [];

  categories.forEach((category) => {
    const blocks = typeof category.getContents === 'function' ? category.getContents() : [];
    blocks.forEach((block) => {
      if (!block || typeof block.setDisabled !== 'function') return;
      block.setDisabled(false);
    });
  });
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

  const totalSteps = TUTORIAL_STAGE_IDS.length;
  const step = Math.max(0, Math.min(tutorialProgressCount, totalSteps));
  const percent = Math.round((step / totalSteps) * 100);

  shell.classList.add('visible');
  fill.style.width = `${percent}%`;
  label.textContent = `TUTORIAL ${step}/${totalSteps}`;
  rate.textContent = `${percent}%`;
}

function getTutorialExpectedFormulaType(stageId) {
  const stage = String(stageId);
  if (stage === '0-1') return 'formula_1';
  if (stage === '0-2') return 'formula_2';
  if (stage === '0-3') return 'formula_3';
  if (stage === '0-4') return 'formula_1';
  if (stage === '0-5') return 'formula_2';
  if (stage === '0-6') return 'formula_1';
  if (stage === '0-7') return 'formula_1';
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

function findTutorialCommonDenominatorOperation() {
  const proofStep = workspace?.getTopBlocks(false)?.find((block) => block.type === 'proof_step');
  if (!proofStep) return null;
  let current = proofStep.getInputTargetBlock('OPERATIONS');
  while (current) {
    if (current.type === 'common_denominator_operation') return current;
    current = current.getNextBlock();
  }
  return null;
}

function getTutorialHighlightTargets(stageId) {
  if (!isTutorialStageId(stageId)) return null;
  const replaceOp = findTutorialReplaceOperation();
  const commonOp = findTutorialCommonDenominatorOperation();
  const conclusionOp = findTutorialConclusionOperation();
  const toolboxLabel = getTutorialToolboxCategoryLabel('証明') || getTutorialToolboxElement();
  const goal = getTutorialGoalState(stageId);
  const goalKey = goal?.key || '';

  // メニューを引かせる場合のハイライト
  if (goalKey.startsWith('pull-math-')) {
    const mathCat = getTutorialToolboxCategoryLabel('基本') || toolboxLabel;
    return { source: mathCat, target: mathCat };
  }
  if (goalKey === 'pull-formula') {
    const formulaCat = getTutorialToolboxCategoryLabel('公式') || toolboxLabel;
    return { source: formulaCat, target: formulaCat };
  }
  if (goalKey.startsWith('pull-')) {
    return { source: toolboxLabel, target: toolboxLabel };
  }

  // 穴埋めのハイライト
  if (goalKey === 'fill-replace-value' && replaceOp) {
    return { source: toolboxLabel, target: getInputConnectionRect(replaceOp, 'VALUE') || toolboxLabel };
  }
  if (goalKey === 'fill-replace-formula' && replaceOp) {
    return { source: toolboxLabel, target: getInputConnectionRect(replaceOp, 'FORMULA') || toolboxLabel };
  }
  if (goalKey === 'fill-replace-result' && replaceOp) {
    return { source: toolboxLabel, target: getInputConnectionRect(replaceOp, 'REPLACEMENT') || toolboxLabel };
  }
  if (goalKey === 'fill-common' && commonOp) {
    if (!commonOp.getInputTargetBlock('VALUE')) {
      return { source: toolboxLabel, target: getInputConnectionRect(commonOp, 'VALUE') || toolboxLabel };
    }
    if (!commonOp.getInputTargetBlock('REPLACEMENT')) {
      return { source: toolboxLabel, target: getInputConnectionRect(commonOp, 'REPLACEMENT') || toolboxLabel };
    }
  }
  
  // 👇✨ 新規追加：結論の穴埋めハイライト
  if (goalKey === 'fill-conclusion-value' && conclusionOp) {
    return { source: toolboxLabel, target: getInputConnectionRect(conclusionOp, 'VALUE') || toolboxLabel };
  }

  if (goalKey === 'ready-check') {
    const submitBtn = document.getElementById('btn-submit');
    if (submitBtn) return { source: submitBtn, target: submitBtn };
  }

  return { source: toolboxLabel, target: toolboxLabel };
}

function hideTutorialHighlights() {
  const source = document.getElementById('tutorial-highlight-source');
  const target = document.getElementById('tutorial-highlight-target');
  if (source) source.classList.add('hidden');
  if (target) target.classList.add('hidden');
}

function positionTutorialHighlight(element, highlight) {
  if (!element || !highlight) return false;
  const rect = element.getBoundingClientRect ? element.getBoundingClientRect() : element;
  if (!rect || rect.width <= 2 || rect.height <= 2) return false;
  const padding = 6;
  highlight.style.left = `${rect.left - padding}px`;
  highlight.style.top = `${rect.top - padding}px`;
  highlight.style.width = `${rect.width + padding * 2}px`;
  highlight.style.height = `${rect.height + padding * 2}px`;
  return true;
}

function updateTutorialHighlightUI(stageNumber) {
  if (!workspace || !currentProblemData) return;

  const targetPulse = document.getElementById('tutorial-highlight-target');
  const sourcePulse = document.getElementById('tutorial-highlight-source'); // 掴む側の強調は廃止
  const banner = document.getElementById('tutorial-banner');
  const underProblem = document.getElementById('tutorial-next-under-problem');

  if (sourcePulse) sourcePulse.classList.add('hidden');
  if (targetPulse) targetPulse.classList.add('hidden');

  const goalState = getTutorialGoalState(stageNumber);
  const goalText = goalState?.text || '';
  const highlightTargets = getTutorialHighlightTargets(stageNumber);

  currentHighlightTargetNode = null;
  currentHighlightInputObj = null;

  if (highlightTargets?.target) {
    currentHighlightTargetNode = highlightTargets.target;
    if (targetPulse) targetPulse.classList.remove('hidden');
  }

  startHighlightTracking();

  if (tutorialModeActive) {
    if (banner) banner.innerHTML = goalText;
    return;
  }

  if (goalHintActive && underProblem) {
    underProblem.textContent = goalText;
    underProblem.classList.add('visible');
    underProblem.classList.add('pulse');
  }
}

function startHighlightTracking() {
  if (highlightTrackingFrameId) cancelAnimationFrame(highlightTrackingFrameId);

  function track() {
    const pulseElement = document.getElementById('tutorial-highlight-target');
    if (pulseElement && currentHighlightTargetNode && !pulseElement.classList.contains('hidden')) {
      const rect = typeof currentHighlightTargetNode.getBoundingClientRect === 'function'
        ? currentHighlightTargetNode.getBoundingClientRect()
        : currentHighlightTargetNode;
      if (rect.width > 0 && rect.height > 0) {
        let left = rect.left;
        let top = rect.top;
        let width = rect.width;
        let height = rect.height;

        const orbSize = 36;

        if (currentHighlightInputObj) {
          if (currentHighlightInputObj.type === Blockly.INPUT_VALUE) {
            left = rect.right - (orbSize / 2) - 10;
            top = rect.top + (rect.height / 2) - (orbSize / 2);
          } else if (currentHighlightInputObj.type === Blockly.NEXT_STATEMENT) {
            left = rect.left + 20;
            top = rect.bottom - (orbSize / 2);
          }
          width = orbSize;
          height = orbSize;
        }

        pulseElement.style.left = left + 'px';
        pulseElement.style.top = top + 'px';
        pulseElement.style.width = width + 'px';
        pulseElement.style.height = height + 'px';
      }
    }
    highlightTrackingFrameId = requestAnimationFrame(track);
  }
  track();
}

// ハイライト位置を適用するヘルパー関数
function applyTutorialHighlight(element, rect) {
  if (!rect || (rect.width === 0 && rect.height === 0)) return;
  element.style.left = rect.left + 'px';
  element.style.top = rect.top + 'px';
  element.style.width = rect.width + 'px';
  element.style.height = rect.height + 'px';
  element.classList.remove('hidden');
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
  currentStreak = 0;
  currentStageSolved = false;
  currentSkipOffer = null;
  pendingSkipChallenge = null;
  unlockedFormulas = [];
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
  collectUsedFormulaIdsFromAST,
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

  workspace.updateToolbox(buildToolboxConfig(problemData));
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
    nextBtn.innerText = '次の問題へ';
  }

  if (!tutorialModeActive) {
    hideGoalHintForStage();
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
  await ensureFormulasUnlockedForProblem(currentProblemData);
  applyProblemDataToWorkspace(currentProblemData, `チュートリアル ${safeIndex + 1}/${tutorialFlowProblems.length}`);
  tutorialStepIndex = safeIndex;
  
  // チュートリアルブロック制限を適用
  requestAnimationFrame(() => {
    applyTutorialBlockRestrictions();
  });
  
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
  button.textContent = `ガイド機能: ${isEnabled ? 'ON' : 'OFF'}`;
  button.classList.toggle('on', isEnabled);
  button.classList.toggle('off', !isEnabled);
}

// ===== Blockly 定義とワークスペース初期化 =====
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

const FORMULA_BLOCK_DEFS = [
  ['formula_1', '公式① sin(x)² + cos(x)² = 1'],
  ['formula_2', '公式② tan(x) = sin(x) / cos(x)'],
  ['formula_3', '公式③ 1 + tan(x)² = 1 / cos(x)²'],
  ['formula_4', '公式④ sin(2*x) = 2*sin(x)*cos(x)'],
  ['formula_5', '公式⑤ sin(x)² = (1-cos(2*x))/2'],
  ['formula_6', '公式⑥ cos(x)² = (1+cos(2*x))/2'],
  ['formula_7', '公式⑦ tan(x) = sin(2*x)/(1+cos(2*x))'],
  ['formula_8', '公式⑧ tan(x)² = (1-cos(2*x))/(1+cos(2*x))'],
  ['formula_9', '公式⑨ (sin(x)+cos(x))² = sin(x)² + 2sin(x)cos(x) + cos(x)²'],
  ['formula_10', '公式⑩ sin(x)⁴ + cos(x)⁴ + 2sin(x)²cos(x)² = (sin(x)² + cos(x)²)²'],
  ['formula_11', '公式⑪ sin(x)⁶ + cos(x)⁶ = (sin(x)² + cos(x)²)(sin(x)⁴ - sin(x)²cos(x)² + cos(x)⁴)'],
  ['formula_12', '公式⑫ sin(3*x) = 3sin(x) - 4sin(x)³'],
  ['formula_13', '公式⑬ cos(3*x) = 4cos(x)³ - 3cos(x)'],
  ['formula_14', '公式⑭ sin(x)+sin(y) = 2sin((x+y)/2)cos((x-y)/2)'],
  ['formula_15', '公式⑮ sin(x)cos(y) = (sin(x+y)+sin(x-y))/2'],
  ['formula_16', '公式⑯ tan(2*x) = (2tan(x))/(1-tan(x)²)'],
  ['formula_addition_sin', '加法公式 sin(x+y) = sin(x)cos(y) + cos(x)sin(y)'],
  ['formula_addition_cos', '加法公式 cos(x+y) = cos(x)cos(y) - sin(x)sin(y)'],
  ['formula_addition_tan', '加法公式 tan(x+y) = (tan(x)+tan(y))/(1-tan(x)tan(y))'],
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

      // Approximate: each dash is ~12px wide in the current font.
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

function getKnownFormulaIds() {
  return FORMULA_BLOCK_DEFS.map(([type]) => type);
}

function sanitizeUnlockedFormulas(formulaIds) {
  const known = new Set(getKnownFormulaIds());
  const raw = Array.isArray(formulaIds) ? formulaIds : [];
  const sanitized = Array.from(new Set(raw.map((id) => String(id))))
    .filter((id) => known.has(id));
  return sanitized;
}

function getUnlockedFormulaIds() {
  const sanitized = sanitizeUnlockedFormulas(unlockedFormulas);
  if (sanitized.length !== unlockedFormulas.length) {
    unlockedFormulas = sanitized;
    saveUnlockedFormulasToStorage(unlockedFormulas);
  }
  return sanitized;
}

function buildFormulaToolboxBlocks() {
  const unlockedSet = new Set(getUnlockedFormulaIds());
  return FORMULA_BLOCK_DEFS
    .map(([type]) => type)
    .filter((type) => unlockedSet.has(type))
    .map((type) => ({ kind: 'block', type }));
}

function buildProblemBlocksCategory(problemData) {
  const category = { kind: 'category', name: '✨問題の式', contents: [] };
  const blocks = problemData?.initialState?.blocks?.blocks;
  if (!Array.isArray(blocks)) return null;

  blocks.forEach((block) => {
    if (!block || block.type === 'proof_step') return;
    const blockCopy = JSON.parse(JSON.stringify(block));
    blockCopy.kind = 'block';
    delete blockCopy.x;
    delete blockCopy.y;
    delete blockCopy.id;
    category.contents.push(blockCopy);
  });

  return category.contents.length > 0 ? category : null;
}

function buildToolboxConfig(problemData = null) {
  const toolbox = {
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
          { kind: 'block', type: 'term_theta' },
          { kind: 'block', type: 'term_two_theta' },
          { kind: 'block', type: 'term_three_theta' },
          { kind: 'block', type: 'term_four_theta' },
          { kind: 'block', type: 'term_five_theta' },
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
        contents: buildFormulaToolboxBlocks(),
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

  const problemBlocksCategory = buildProblemBlocksCategory(problemData);
  if (problemBlocksCategory) {
    // 既存実装と同様、基本カテゴリの先頭に「問題の式」サブカテゴリを差し込む
    toolbox.contents[0].contents.unshift(problemBlocksCategory);
  }

  return toolbox;
}

let toolboxConfig = buildToolboxConfig();

// Blockly標準のテーマエンジンをハックしてダーク化
const mathDarkTheme = Blockly.Theme.defineTheme('mathDarkTheme', {
  base: Blockly.Themes.Classic,
  componentStyles: {
    workspaceBackgroundColour: 'transparent',
    toolboxBackgroundColour: 'rgba(6, 26, 58, 0.95)',
    toolboxForegroundColour: '#ffffff',
    flyoutBackgroundColour: 'rgba(8, 22, 44, 0.92)',
    flyoutForegroundColour: '#ffffff',
    scrollbarColour: 'rgba(56, 189, 248, 0.65)',
    scrollbarOpacity: 1,
  },
});

const workspace = Blockly.inject('l', {
  toolbox: toolboxConfig,
  renderer: 'zelos',
  theme: mathDarkTheme,
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
  const nonProofBlocks = topBlocks.filter((block) => block && block.type !== 'proof_step');
  const proofBlocks = topBlocks.filter((block) => block && block.type === 'proof_step');

  nonProofBlocks.sort((firstBlock, secondBlock) => firstBlock.getRelativeToSurfaceXY().x - secondBlock.getRelativeToSurfaceXY().x);

  let nonProofBlockX = leftInset;
  let nonProofRowMaxHeight = 0;
  nonProofBlocks.forEach((mathBlock) => {
    const mathBlockPosition = mathBlock.getRelativeToSurfaceXY();
    const mathBlockSize = mathBlock.getHeightWidth();
    mathBlock.moveBy(nonProofBlockX - mathBlockPosition.x, topInset - mathBlockPosition.y);
    nonProofBlockX += mathBlockSize.width + gap;
    nonProofRowMaxHeight = Math.max(nonProofRowMaxHeight, mathBlockSize.height);
  });

  const proofRowStartY = topInset + Math.max(150, nonProofRowMaxHeight + 80);
  let proofBlockY = proofRowStartY;
  proofBlocks.forEach((proofBlock) => {
    const proofBlockPosition = proofBlock.getRelativeToSurfaceXY();
    const proofBlockSize = proofBlock.getHeightWidth();
    proofBlock.moveBy(leftInset - proofBlockPosition.x, proofBlockY - proofBlockPosition.y);
    proofBlockY += Math.max(40, proofBlockSize.height) + gap;
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
  if (!viewport) return;

  const targetNode = document.querySelector(`#map-nodes .map-node[data-stage="${stageNumber}"]`);
  if (!targetNode) return;

  try {
    targetNode.scrollIntoView({
      behavior: animate ? 'smooth' : 'auto',
      block: 'nearest',
      inline: 'center',
    });
  } catch (_) {
    // ignore
  }
}

function centerMapCameraOnCurrentStage(animate = true) {
  centerMapCameraOnStage(getCurrentMapFocusStage(), animate);
}

function drawMapLinks(svg, _positions) {
  // 横スクロール型ステージ列に変更したため、リンク描画は使わない
  if (!svg) return;
  svg.innerHTML = '';
}

async function renderStageMap() {
  const nodeRoot = document.getElementById('map-nodes');
  const links = document.getElementById('map-links');
  const mapWorld = document.getElementById('map-world');
  const progressLabel = document.getElementById('map-progress');
  const overallBar = document.getElementById('overall-progress');
  const progressText = document.getElementById('progress-text');
  if (!nodeRoot || !mapWorld) return;

  const unlockedLimit = getUnlockLimit();
  const focusStage = getCurrentMapFocusStage();

  if (links) {
    drawMapLinks(links, []);
  }

  nodeRoot.innerHTML = '';

  for (let stage = 1; stage <= MAX_STAGE_NUMBER; stage += 1) {
    const isCleared = clearedStages.includes(stage);
    const isUnlocked = unlockAll || stage <= unlockedLimit;
    const isFocus = stage === focusStage;

    const node = document.createElement('button');
    node.type = 'button';
    node.className = `map-node ${isCleared ? 'cleared' : isUnlocked ? 'unlocked' : 'locked'}${isFocus ? ' current' : ''}`;
    node.dataset.stage = String(stage);

    const number = document.createElement('div');
    number.className = 'map-node-number';
    number.textContent = String(stage);
    node.appendChild(number);

    const label = document.createElement('div');
    label.className = 'map-node-label';
    label.textContent = `STAGE ${stage}`;
    node.appendChild(label);

    if (isUnlocked) {
      node.onclick = async () => {
        currentStageNumber = stage;
        switchScreen('p');
        await loadStage(stage);
      };
    } else {
      node.disabled = true;
    }

    nodeRoot.appendChild(node);

    if (stage < MAX_STAGE_NUMBER) {
      const road = document.createElement('div');
      road.className = `map-road ${isCleared ? 'cleared' : isUnlocked ? 'unlocked' : 'locked'}`;
      nodeRoot.appendChild(road);
    }
  }

  const clearCount = clearedStages.filter((s) => s >= 1 && s <= MAX_STAGE_NUMBER).length;
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
  unlockedFormulas = [];
  saveUnlockedFormulasToStorage(unlockedFormulas);

  currentStreak = 0;
  tutorialProgressCount = 0;
  pendingSkipChallenge = null;
  currentSkipOffer = null;
  updateStreakCounter(false);

  if (workspace) {
    workspace.updateToolbox(buildToolboxConfig(currentProblemData));
  }

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

async function completeTutorialAndOpenMap() {
  localStorage.setItem('tutorial_seen', 'true');
  hideTutorialOverlay();
  await renderStageMap();
  switchScreen('stage-map-screen');
  
  // マップ表示後にトーストで完了メッセージを表示
  showToast('<span style="color:#58cc02; font-size:1.1em;">✨ チュートリアル完了！\n\nステージマップから好きな問題に挑戦してください！</span>', true);
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

function getRequiredGreenOperationSequence(problemData) {
  const required = getAnswerGreenOperationSequence(problemData);
  if (requiresCommonDenominator(problemData) && !required.includes('common_denominator_operation')) {
    required.push('common_denominator_operation');
  }
  return required;
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
  if (type === 'conclusion_operation') return 'よって';
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
  const requiredGreenTypes = getRequiredGreenOperationSequence(problemData);
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

function findTopLevelBlockByType(targetWorkspace, blockType) {
  if (!targetWorkspace || !blockType) return null;
  const candidates = targetWorkspace
    .getTopBlocks(false)
    .filter((block) => block && block.type === blockType);
  if (candidates.length === 0) return null;
  return candidates.sort((a, b) => a.getRelativeToSurfaceXY().x - b.getRelativeToSurfaceXY().x)[0];
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
  const needsCommonDenominator = requiresCommonDenominator(currentProblemData);

  const proofStep = getOrCreateProofStep(targetWorkspace);
  const operationInputConnection = proofStep.getInput('OPERATIONS')?.connection;
  if (!operationInputConnection) return;

  const mathBlocks = getTopLevelMathBlocksSortedByY(targetWorkspace);
  const leftExpressionBlock = mathBlocks[0] || null;
  const rightExpressionBlock = mathBlocks.length >= 2 ? mathBlocks[mathBlocks.length - 1] : mathBlocks[0] || null;

  const operations = getOperationChain(proofStep);

  if (isOverwriteOn) {
    let replaceOp = operations.find((op) => op.type === 'replace_operation') || null;
    let commonOp = needsCommonDenominator
      ? operations.find((op) => op.type === 'common_denominator_operation') || null
      : null;
    let conclusionOp = operations.find((op) => op.type === 'conclusion_operation') || null;

    if (!replaceOp) {
      replaceOp = createOperationBlock(targetWorkspace, 'replace_operation');
      ensureStatementConnected(operationInputConnection, replaceOp);
    }

    if (needsCommonDenominator && !commonOp) {
      commonOp = createOperationBlock(targetWorkspace, 'common_denominator_operation');
    }

    if (!conclusionOp) {
      conclusionOp = createOperationBlock(targetWorkspace, 'conclusion_operation');
    }

    if (needsCommonDenominator && commonOp) {
      if (replaceOp.nextConnection && commonOp.previousConnection) {
        const existingAfterReplace = replaceOp.nextConnection.targetBlock();
        if (existingAfterReplace && existingAfterReplace !== commonOp) {
          existingAfterReplace.unplug(true);
        }
        replaceOp.nextConnection.connect(commonOp.previousConnection);
      }
      if (commonOp.nextConnection && conclusionOp.previousConnection) {
        const existingAfterCommon = commonOp.nextConnection.targetBlock();
        if (existingAfterCommon && existingAfterCommon !== conclusionOp) {
          existingAfterCommon.unplug(true);
        }
        commonOp.nextConnection.connect(conclusionOp.previousConnection);
      }
    } else if (replaceOp.nextConnection && conclusionOp.previousConnection) {
      const existingAfterReplace = replaceOp.nextConnection.targetBlock();
      if (existingAfterReplace && existingAfterReplace !== conclusionOp) {
        existingAfterReplace.unplug(true);
      }
      replaceOp.nextConnection.connect(conclusionOp.previousConnection);
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

function removeTutorialRedundantConclusionExpression(targetWorkspace) {
  if (!targetWorkspace || !isTutorialStageId(currentStageNumber)) return;
  const conclusionOp = findTutorialConclusionOperation();
  const conclusionValue = conclusionOp?.getInputTargetBlock('VALUE');
  if (!conclusionValue) return;

  const topMathBlocks = targetWorkspace.getTopBlocks(false)
    .filter((block) => block && block.outputConnection)
    .filter((block) => !isProofOrOperationBlockType(block.type))
    .filter((block) => !block.type.startsWith('formula_'));
  if (topMathBlocks.length <= 2) return;

  const candidates = targetWorkspace.getTopBlocks(false)
    .filter((block) => block && block.outputConnection)
    .filter((block) => !isProofOrOperationBlockType(block.type))
    .filter((block) => !block.type.startsWith('formula_'))
    .filter((block) => block.type === conclusionValue.type && block.id !== conclusionValue.id);
  if (candidates.length === 0) return;

  const rightmost = candidates.sort((a, b) => b.getRelativeToSurfaceXY().x - a.getRelativeToSurfaceXY().x)[0];
  rightmost.dispose(true);
}

// ===== UIヘルパー =====

// ===== 新機能: 画面ごとの背景切り替え =====
const ASSET_BASE_CANDIDATES = ['assets', 'asset'];
let resolvedAssetBase = null;
const assetUrlCache = new Map();
let backgroundUpdateToken = 0;

function preloadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(url);
    img.onerror = () => reject(new Error('IMAGE_LOAD_FAILED'));
    img.src = url;
  });
}

async function getAssetUrl(filename) {
  const key = String(filename || '').trim();
  if (!key) return '';
  if (assetUrlCache.has(key)) return assetUrlCache.get(key);

  const bases = resolvedAssetBase
    ? [resolvedAssetBase, ...ASSET_BASE_CANDIDATES.filter((b) => b !== resolvedAssetBase)]
    : ASSET_BASE_CANDIDATES;

  for (const base of bases) {
    const url = `${base}/${key}`;
    try {
      await preloadImage(url);
      resolvedAssetBase = base;
      assetUrlCache.set(key, url);
      return url;
    } catch (_) {
      // try next
    }
  }

  // 最後の手段: そのまま返す（開発時のパスずれを許容）
  const fallback = `${ASSET_BASE_CANDIDATES[0]}/${key}`;
  assetUrlCache.set(key, fallback);
  return fallback;
}

async function setAppBackgroundByKey(key) {
  const filename = key === 'stage'
    ? 'bg_stage.png'
    : key === 'select'
      ? 'bg_select.png'
      : 'bg_title.png';

  const token = ++backgroundUpdateToken;
  const url = await getAssetUrl(filename);
  if (token !== backgroundUpdateToken) return;
  if (!url) return;

  document.body.style.backgroundImage = `url("${url}")`;
}

function updateBackgroundForScreen(screenId) {
  if (screenId === 'p') {
    setAppBackgroundByKey('stage');
    return;
  }
  if (screenId === 'stage-map-screen' || screenId === 'c') {
    // 👈✨ ここを 'select' から 'stage' に変更するだけ！
    setAppBackgroundByKey('stage'); 
    return;
  }
  // 👇 1番目の画面（タイトル）はそのまま
  setAppBackgroundByKey('title');
}

// ===== 新機能: 公式アンロック（初回ポップアップ） =====
function unlockFormulaIds(formulaIds) {
  const current = getUnlockedFormulaIds();
  const incoming = sanitizeUnlockedFormulas(formulaIds);
  const merged = sanitizeUnlockedFormulas([...current, ...incoming]);
  unlockedFormulas = merged;
  saveUnlockedFormulasToStorage(unlockedFormulas);
}

function getRequiredFormulasFromProblem(problemData) {
  const required = problemData?.requiredFormulas;
  if (!Array.isArray(required)) return [];
  return required.map((id) => String(id)).filter((id) => !!id);
}

function getFormulaUnlockModalNodes() {
  return {
    modal: document.getElementById('formula-unlock-modal'),
    title: document.getElementById('formula-unlock-title'),
    meta: document.getElementById('formula-unlock-meta'),
    image: document.getElementById('formula-unlock-image'),
    fallback: document.getElementById('formula-unlock-fallback'),
    closeButton: document.getElementById('btn-formula-unlock-close'),
  };
}

async function showFormulaUnlockModal(formulaIds) {
  const ids = Array.from(new Set((Array.isArray(formulaIds) ? formulaIds : []).map((id) => String(id)).filter(Boolean)));
  if (ids.length === 0) return;

  const { modal, title, meta, image, fallback, closeButton } = getFormulaUnlockModalNodes();
  if (!modal || !title || !meta || !image || !fallback || !closeButton) {
    return;
  }

  modal.classList.remove('hidden');

  await new Promise((resolve) => {
    let index = 0;

    const render = async () => {
      const formulaId = ids[index];
      const label = typeof formulaIdToLabel === 'function' ? formulaIdToLabel(formulaId) : formulaId;
      title.textContent = '新しい公式を覚えよう！';
      meta.textContent = `UNLOCK: ${label}  (${index + 1} / ${ids.length})`;
      fallback.style.display = 'none';
      fallback.textContent = '';

      image.style.display = 'block';
      image.alt = label;
      image.onerror = () => {
        image.style.display = 'none';
        fallback.textContent = `画像が見つかりませんでした。\n\n${label}`;
        fallback.style.display = 'block';
      };

      const imageUrl = await getAssetUrl(`${formulaId}.png`);
      image.src = imageUrl;

      closeButton.textContent = index >= ids.length - 1 ? '確認して開始' : '次へ';
    };

    closeButton.onclick = () => {
      index += 1;
      if (index >= ids.length) {
        modal.classList.add('hidden');
        closeButton.onclick = null;
        resolve();
        return;
      }
      render();
    };

    render();
  });
}

async function ensureFormulasUnlockedForProblem(problemData) {
  const required = sanitizeUnlockedFormulas(getRequiredFormulasFromProblem(problemData))
    .filter((id) => (typeof isSupportedFormulaId === 'function' ? isSupportedFormulaId(id) : true));

  if (required.length === 0) return [];

  const unlocked = new Set(getUnlockedFormulaIds());
  const newlyFound = required.filter((id) => !unlocked.has(id));
  if (newlyFound.length === 0) return [];

  // 初回遭遇: 画像ポップアップを出してからアンロック
  await showFormulaUnlockModal(newlyFound);
  unlockFormulaIds(newlyFound);

  return newlyFound;
}

function switchScreen(screenId) {
  document.querySelectorAll('.a').forEach((screen) => screen.classList.remove('b'));
  const target = document.getElementById(screenId);
  if (target) target.classList.add('b');

  if (screenId !== 'p') {
    hideTutorialOverlay();
  }

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

  updateBackgroundForScreen(screenId);
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
  const banner = document.getElementById('tutorial-banner');
  if (!banner) return;
  if (!isTutorialStageId(stageId)) {
    banner.textContent = '';
    banner.classList.remove('visible');
    hideTutorialHighlights();
    return;
  }

  const bannerText = getTutorialBannerText(stageId);
  banner.textContent = bannerText;
  banner.classList.toggle('visible', !!bannerText);
  updateTutorialHighlightUI(stageId);
}

function getTutorialToolboxElement() {
  return document.querySelector('.blocklyToolboxDiv');
}

function getTutorialToolboxCategoryLabel(labelText) {
  const labels = Array.from(document.querySelectorAll('.blocklyTreeLabel'));
  const exact = labels.find((node) => node.textContent?.trim() === labelText);
  if (exact) return exact;
  return labels.find((node) => node.textContent?.includes(labelText)) || null;
}

function getTutorialWorkspaceElement() {
  return document.getElementById('l');
}

function isRenderableElement(element) {
  if (!element || typeof element.getBoundingClientRect !== 'function') return false;
  const rect = element.getBoundingClientRect();
  return rect.width > 2 && rect.height > 2;
}

function getInputConnectionRect(block, inputName) {
  if (!block || typeof block.getInput !== 'function') return null;
  const input = block.getInput(inputName);
  const connection = input?.connection;
  if (!connection || typeof connection.getOffsetInPixels !== 'function') return null;
  const offset = connection.getOffsetInPixels();
  const metrics = workspace?.getMetrics?.();
  const absoluteLeft = Math.max(0, metrics?.absoluteMetrics?.left || 0);
  const absoluteTop = Math.max(0, metrics?.absoluteMetrics?.top || 0);
  const size = { width: 42, height: 28 };
  return {
    left: absoluteLeft + offset.x - size.width / 2,
    top: absoluteTop + offset.y - size.height / 2,
    width: size.width,
    height: size.height,
  };
}

function findFlyoutBlockElementByType(blockType) {
  if (!workspace) return null;
  const flyoutWorkspace = workspace.getToolbox()?.getFlyout()?.getWorkspace?.();
  if (!flyoutWorkspace) return null;
  const matchingBlock = flyoutWorkspace.getAllBlocks(false).find((block) => block.type === blockType);
  const root = typeof matchingBlock?.getSvgRoot === 'function' ? matchingBlock.getSvgRoot() : null;
  return isRenderableElement(root) ? root : null;
}

function getTutorialActionGateState() {
  const replaceOp = findTutorialReplaceOperation();
  const conclusionOp = findTutorialConclusionOperation();
  const formulaConnected = !!replaceOp?.getInputTargetBlock('FORMULA');
  const expressionsConnected = !!replaceOp?.getInputTargetBlock('VALUE')
    && !!replaceOp?.getInputTargetBlock('REPLACEMENT')
    && !!conclusionOp?.getInputTargetBlock('VALUE');

  return {
    hasReplace: !!replaceOp,
    hasConclusion: !!conclusionOp,
    hasFormula: formulaConnected,
    hasExpressions: expressionsConnected,
  };
}

function getTutorialGateAllowedTypes(stageId) {
  if (!isTutorialStageId(stageId)) return { allowAll: true, types: null };

  const targetState = getTutorialTargetOperationState(stageId);
  if (!targetState || targetState.isComplete) return { allowAll: true, types: null };

  const targetType = targetState.type;
  const targetBlock = targetState.block;

  const formulaBlockTypes = typeof getKnownFormulaIds === 'function'
    ? getKnownFormulaIds()
    : ['formula_1', 'formula_2', 'formula_3', 'formula_4', 'formula_5', 'formula_6', 'formula_7', 'formula_8'];
  const mathBlockTypes = ['custom_number', 'term_sin', 'term_cos', 'term_tan', 'term_sin2', 'term_cos2',
    'math_add', 'math_negate', 'math_multiply', 'math_fraction', 'math_square'];

  if (targetState.isMissing || !targetBlock) {
    return { allowAll: false, types: new Set([targetType]) };
  }

  const requiredFormulaIdsRaw = typeof getRequiredFormulaIdsForProblem === 'function'
    ? getRequiredFormulaIdsForProblem(currentProblemData)
    : [];
  const requiredFormulaIds = requiredFormulaIdsRaw
    .map((id) => String(id))
    .filter((id) => !!id)
    .filter((id) => (typeof isSupportedFormulaId === 'function' ? isSupportedFormulaId(id) : true));

  const hasFloatingFormula = workspace.getTopBlocks(false).some((block) => {
    const type = String(block.type || '');
    if (!type.startsWith('formula_')) return false;
    if (requiredFormulaIds.length === 0) return true;
    return requiredFormulaIds.includes(type);
  });

  const formulaMissing = targetType === 'replace_operation'
    && !targetBlock.getInputTargetBlock('FORMULA');
  if (formulaMissing && !hasFloatingFormula) {
    return { allowAll: false, types: new Set([...formulaBlockTypes, targetType]) };
  }

  const missingHole = getTutorialOperationMissingHole(targetType, targetBlock);
  const isFormulaHole = targetType === 'replace_operation'
    && missingHole
    && missingHole.key === 'fill-replace-formula';
  const hasFloatingMath = workspace.getTopBlocks(false).some((block) =>
    !isProofOrOperationBlockType(block.type) && !String(block.type || '').startsWith('formula_')
  );

  if (missingHole && !hasFloatingMath && !isFormulaHole) {
    return { allowAll: false, types: new Set([...mathBlockTypes, targetType]) };
  }

  return { allowAll: true, types: null };
}

function isTutorialGateAllowed(blockType, stageId) {
  if (!isTutorialStageId(stageId)) return true;
  const gate = getTutorialGateAllowedTypes(stageId);
  if (gate.allowAll) return true;
  return gate.types?.has(blockType);
}

function closeGameEntrance() {
  const entrance = document.getElementById('game-entrance');
  if (entrance) entrance.classList.add('hidden');
}

function openGameEntrance() {
  const entrance = document.getElementById('game-entrance');
  if (entrance) {
    entrance.classList.remove('hidden');
    entrance.classList.remove('show-choices');
  }
  hideTutorialOverlay();
  // 起動画面はタイトル背景へ
  setAppBackgroundByKey('title');
}

function hideTutorialOverlay() {
  tutorialModeActive = false;
  updateTutorialBanner('');
  hideTutorialHighlights();
  
  // チュートリアル終了時は行動制限を解除
  clearTutorialBlockRestrictions();
  
  if (tutorialAutoAdvanceFrameId) {
    cancelAnimationFrame(tutorialAutoAdvanceFrameId);
    tutorialAutoAdvanceFrameId = 0;
  }

}

function updateTutorialIntroStep() {
  const title = document.getElementById('tutorial-intro-step-title');
  const body = document.getElementById('tutorial-intro-step-body');
  const help = document.getElementById('tutorial-intro-step-help');
  const nextBtn = document.getElementById('btn-tutorial-intro-next');
  const okBtn = document.getElementById('btn-tutorial-intro-ok');
  if (!title || !body || !help || !nextBtn || !okBtn) return;

  const safeIndex = Math.max(0, Math.min(tutorialIntroIndex, TUTORIAL_STEPS.length - 1));
  const step = TUTORIAL_STEPS[safeIndex];
  const headline = String(step.text || '').split('\n')[0] || 'チュートリアルの流れ';
  const bodyLines = String(step.text || '').split('\n').slice(1).join('\n').trim();
  const detailText = String(step.help || '').trim();

  title.textContent = headline;
  body.textContent = bodyLines || 'ブロックを動かして、式を変形していくよ。';
  help.textContent = detailText || '次のステップへ進んでみよう。';

  const isLast = safeIndex >= TUTORIAL_STEPS.length - 1;
  nextBtn.style.display = isLast ? 'none' : 'inline-block';
  okBtn.style.display = isLast ? 'inline-block' : 'none';
}

function showGoalHintForStage() {
  goalHintActive = true;
  const hintButton = document.getElementById('btn-hint');
  if (hintButton) hintButton.textContent = 'ヒントを消す';
  updateTutorialHighlightUI(currentStageNumber);
}

function hideGoalHintForStage() {
  goalHintActive = false;
  const hintButton = document.getElementById('btn-hint');
  if (hintButton) hintButton.textContent = 'ヒント';
  const underProblem = document.getElementById('tutorial-next-under-problem');
  if (underProblem) {
    underProblem.textContent = '';
    underProblem.classList.remove('visible');
    underProblem.classList.remove('pulse');
  }
  hideTutorialHighlights();
}

function showTutorialStep() {
  if (!isTutorialStageId(currentStageNumber)) return;
  updateTutorialBanner(currentStageNumber);
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
    if (!event) return;
    if (event.recordUndo === false) return;
    if (event.isUiEvent) {
      updateTutorialBanner(currentStageNumber);
      return;
    }
    if (event.type === Blockly.Events.BLOCK_CREATE && event.blockId) {
      const createdBlock = workspace.getBlockById(event.blockId);
      if (createdBlock && !isTutorialGateAllowed(createdBlock.type, currentStageNumber)) {
        createdBlock.dispose(true);
        showToast('順番どおりに操作しましょう。');
        applyTutorialBlockRestrictions();
        return;
      }
    }
    
    // チュートリアル中のブロック削除や移動を制限
    if (event.type === Blockly.Events.BLOCK_MOVE || event.type === Blockly.Events.BLOCK_DELETE) {
      // 特定のブロック（proof_step など重要なブロック）の削除は禁止
      const blockId = event.blockId;
      if (blockId) {
        const block = workspace.getBlockById(blockId);
        if (block && block.type === 'proof_step') {
          // proof_step の削除は禁止（イベント後に復元する）
          if (event.type === Blockly.Events.BLOCK_DELETE) {
            // これは自動復元されていないため、ログを記録
            console.warn('[Tutorial] proof_step deletion prevented');
          }
        }
      }
    }
    
    applyTutorialBlockRestrictions();
    updateTutorialBanner(currentStageNumber);
    queueTutorialAutoAdvanceCheck();
  });

  workspace.addChangeListener(() => {
    if (tutorialModeActive || !goalHintActive) return;
    updateTutorialHighlightUI(currentStageNumber);
  });
}

function getBlockSvgRoot(block) {
  return typeof block?.getSvgRoot === 'function' ? block.getSvgRoot() : null;
}

function showTutorialIntroModal() {
  const modal = document.getElementById('tutorial-intro-modal');
  if (!modal) return false;
  modal.classList.remove('hidden');
  const introVideo = document.getElementById('tutorial-intro-video');
  if (introVideo) {
    introVideo.currentTime = 0; // 最初に戻す
    introVideo.play().catch(e => console.log("自動再生ブロック", e));
  }
  return true;
}

function hideTutorialIntroModal() {
  const modal = document.getElementById('tutorial-intro-modal');
  if (modal) modal.classList.add('hidden');
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
    const isTutorialStage = isTutorialStageId(stageNumber);
    const stageKey = String(stageNumber);
    const numericStage = Math.max(1, Number(stageNumber) || 1);
    const stageFile = isTutorialStage
      ? `problems/tutorial/${stageKey}.json`
      : `problems/${numericStage}.json`;
    const response = await fetch(stageFile);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const rawText = await response.text();
    const sanitizedText = rawText.replace(/^\uFEFF/, '').trim();
    if (!sanitizedText) throw new Error('EMPTY_JSON');
    currentProblemData = JSON.parse(sanitizedText);

    // requiredFormulas に応じて「初回公式アンロック」ポップアップを表示
    await ensureFormulasUnlockedForProblem(currentProblemData);

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

    // ツールボックスをアンロック済み公式 + 問題の式 から動的生成
    workspace.updateToolbox(buildToolboxConfig(currentProblemData));
    workspace.clear();
    Blockly.serialization.workspaces.load(currentProblemData.initialState, workspace);

    if (isTutorialStageId(stageNumber)) {
      removeTutorialRedundantConclusionExpression(workspace);
    } else {
      applyConditionalInitialStateGeneration(workspace);
    }

    forceWorkspaceLayoutSync();
    arrangeBlocks(); // 最後に整列
    
    // チュートリアルステージの場合はブロック制限を適用
    if (isTutorialStageId(stageNumber)) {
      requestAnimationFrame(() => {
        applyTutorialBlockRestrictions();
      });
      tutorialModeActive = true;
      updateTutorialBanner(stageNumber);
    } else {
      // 非チュートリアルステージの場合は制限を解除
      clearTutorialBlockRestrictions();
    }

    const submitBtn = document.getElementById('btn-submit');
    const nextBtn = document.getElementById('btn-next');
    if (submitBtn) submitBtn.style.display = 'inline-block';
    if (nextBtn) {
      nextBtn.style.display = 'none';
      nextBtn.innerText = '次の問題へ';
    }
  } catch (error) {
    const errorText = error && error.message ? String(error.message) : '';
    const isHttpError = /^HTTP\s+\d+/.test(errorText);
    const isTutorialStage = isTutorialStageId(stageNumber);
    const stageKey = String(stageNumber);
    const numericStage = Math.max(1, Number(stageNumber) || 1);
    const stageFile = isTutorialStage
      ? `problems/tutorial/${stageKey}.json`
      : `problems/${numericStage}.json`;
    const detailSuffix = errorText ? ` (${errorText})` : '';
    const message = isHttpError
      ? `問題ファイルが見つかりません: ${stageFile}${detailSuffix}`
      : `問題ファイルの内容が不正です: ${stageFile}${detailSuffix}`;
    if (errorText) {
      console.error('[StageLoadError]', stageFile, error);
    }
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
mathGenerator.forBlock.term_theta = function () {
  return ['theta', 0];
};
mathGenerator.forBlock.term_two_theta = function () {
  return ['(2 * theta)', 0];
};
mathGenerator.forBlock.term_three_theta = function () {
  return ['(3 * theta)', 0];
};
mathGenerator.forBlock.term_four_theta = function () {
  return ['(4 * theta)', 0];
};
mathGenerator.forBlock.term_five_theta = function () {
  return ['(5 * theta)', 0];
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
mathGenerator.forBlock.formula_9 = function () {
  return ['(sin(x) + cos(x))^2 = sin(x)^2 + 2 * sin(x) * cos(x) + cos(x)^2', 0];
};
mathGenerator.forBlock.formula_10 = function () {
  return ['sin(x)^4 + cos(x)^4 + 2 * sin(x)^2 * cos(x)^2 = (sin(x)^2 + cos(x)^2)^2', 0];
};
mathGenerator.forBlock.formula_11 = function () {
  return ['sin(x)^6 + cos(x)^6 = (sin(x)^2 + cos(x)^2) * (sin(x)^4 - sin(x)^2 * cos(x)^2 + cos(x)^4)', 0];
};
mathGenerator.forBlock.formula_12 = function () {
  return ['sin(3 * x) = 3 * sin(x) - 4 * sin(x)^3', 0];
};
mathGenerator.forBlock.formula_13 = function () {
  return ['cos(3 * x) = 4 * cos(x)^3 - 3 * cos(x)', 0];
};
mathGenerator.forBlock.formula_14 = function () {
  return ['sin(x) + sin(y) = 2 * sin((x + y) / 2) * cos((x - y) / 2)', 0];
};
mathGenerator.forBlock.formula_15 = function () {
  return ['sin(x) * cos(y) = (sin(x + y) + sin(x - y)) / 2', 0];
};
mathGenerator.forBlock.formula_16 = function () {
  return ['tan(2 * x) = (2 * tan(x)) / (1 - tan(x)^2)', 0];
};
mathGenerator.forBlock.formula_addition_sin = function () {
  return ['sin(x + y) = sin(x) * cos(y) + cos(x) * sin(y)', 0];
};
mathGenerator.forBlock.formula_addition_cos = function () {
  return ['cos(x + y) = cos(x) * cos(y) - sin(x) * sin(y)', 0];
};
mathGenerator.forBlock.formula_addition_tan = function () {
  return ['tan(x + y) = (tan(x) + tan(y)) / (1 - tan(x) * tan(y))', 0];
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

    showToast(nextMode === 'guided' ? 'ガイド機能を ON にしました' : 'ガイド機能を OFF にしました');
  });

  document.getElementById('btn-reset')?.addEventListener('click', () => {
    currentStreak = 0;
    updateStreakCounter(false);
    loadStage(currentStageNumber);
  });

  document.getElementById('btn-hint')?.addEventListener('click', () => {
    if (tutorialModeActive) {
      showToast(getTutorialBannerText(currentStageNumber) || '【目標】ブロックの空いている穴に、対応する式をはめ込みましょう。', true);
      updateTutorialHighlightUI(currentStageNumber);
      return;
    }
    if (goalHintActive) {
      hideGoalHintForStage();
    } else {
      showGoalHintForStage();
    }
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

  // 起動画面: START → 二択表示
  document.getElementById('btn-entry-start')?.addEventListener('click', () => {
    const entrance = document.getElementById('game-entrance');
    if (entrance) entrance.classList.add('show-choices');
    setAppBackgroundByKey('select');
  });

  document.getElementById('btn-entry-tutorial')?.addEventListener('click', async () => {
    closeGameEntrance();
    const introShown = showTutorialIntroModal();
    if (!introShown) {
      await transitionToStage('0-1');
    }
  });

  document.getElementById('btn-entry-map')?.addEventListener('click', async () => {
    localStorage.setItem('tutorial_seen', 'true');
    closeGameEntrance();
    await transitionToStage(1);
  });

  document.getElementById('btn-tutorial-intro-next')?.addEventListener('click', () => {
    tutorialIntroIndex = Math.min(tutorialIntroIndex + 1, TUTORIAL_STEPS.length - 1);
    updateTutorialIntroStep();
  });

  document.getElementById('btn-tutorial-intro-ok')?.addEventListener('click', async () => {
    hideTutorialIntroModal();
    await transitionToStage('0-1');
  });

  document.getElementById('btn-skip-challenge-cancel')?.addEventListener('click', () => {
    closeSkipChallengeModal();
    currentSkipOffer = null;
    const nextBtn = document.getElementById('btn-next');
    if (nextBtn) {
      nextBtn.style.display = 'inline-block';
      nextBtn.innerText = currentStageNumber === MAX_STAGE_NUMBER ? '一覧へ戻る' : '次の問題へ';
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
      const usedFormulaIds = collectUsedFormulaIdsFromAST(ast);
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
      const requiredGreenTypes = getRequiredGreenOperationSequence(currentProblemData);
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
        if (isTutorialStageId(currentStageNumber)) {
          const totalSteps = TUTORIAL_STAGE_IDS.length;
          tutorialProgressCount = Math.min(totalSteps, tutorialProgressCount + 1);
          localStorage.setItem('tutorial_progress', String(tutorialProgressCount));
          updateTutorialProgress(currentStageNumber);
        }
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
          nextBtn.innerText = getNextTutorialStageId(currentStageNumber) ? '次の問題へ' : 'マップへ進む';
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
        document.getElementById('btn-next').innerText = currentStageNumber === MAX_STAGE_NUMBER ? '一覧へ戻る' : '次の問題へ';
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

  window.addEventListener('resize', () => {
    if (tutorialModeActive) {
      updateTutorialHighlightUI(currentStageNumber);
    }
    if (!document.getElementById('stage-map-screen')?.classList.contains('b')) return;
    centerMapCameraOnCurrentStage(false);
  });

  window.addEventListener('scroll', () => {
    if (tutorialModeActive) {
      updateTutorialHighlightUI(currentStageNumber);
    }
  }, { passive: true });
}

// ===== アプリケーション初期化ルーティング =====
/**
 * URL パラメータに応じてステージ画面か一覧画面へ遷移する。
 */
async function routeToTarget() {
  const urlParams = new URLSearchParams(window.location.search);
  const stageParam = parseInt(urlParams.get('stage'), 10);

  if (stageParam >= 1 && stageParam <= MAX_STAGE_NUMBER) {
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
