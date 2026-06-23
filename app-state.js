// ------------------------------------------------------------
// Shared app state and constants
// ------------------------------------------------------------

let clearedStages = JSON.parse(localStorage.getItem('s')) || [];
let unlockAll = localStorage.getItem('unlock_all') === '1';
let currentStageNumber = 1;
let currentProblemData = null;
let currentStreak = 0;
let currentStageSolved = false;
let currentSkipOffer = null;
let pendingSkipChallenge = null;
let hasBoundEventListeners = false;
let autoAdvanceTimerId = 0;
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

function isTutorialStageId(stageId) {
  return TUTORIAL_STAGE_IDS.includes(String(stageId));
}

function getTutorialStageIndex(stageId) {
  return TUTORIAL_STAGE_IDS.indexOf(String(stageId));
}

function getTutorialStageId(stageIndex) {
  return TUTORIAL_STAGE_IDS[Math.max(0, Math.min(Number(stageIndex) || 0, TUTORIAL_STAGE_IDS.length - 1))] || null;
}

function getNextTutorialStageId(stageId) {
  const currentIndex = getTutorialStageIndex(stageId);
  if (currentIndex < 0) return null;
  return getTutorialStageId(currentIndex + 1);
}

function getTutorialBannerText(stageId) {
  if (!isTutorialStageId(stageId)) return '';
  const hints = Array.isArray(currentProblemData?.hints) ? currentProblemData.hints : [];
  const firstHint = hints.find((hint) => typeof hint === 'string' && hint.trim()) || '';
  return firstHint.trim();
}

function getTutorialTargetOperationState(stageId) {
  if (!isTutorialStageId(stageId) || !workspace) {
    return { type: null, block: null, isMissing: false, isComplete: true };
  }

  const targetType = 'replace_operation';
  const primaryBlock = typeof findTutorialReplaceOperation === 'function' ? findTutorialReplaceOperation() : null;
  const conclusionBlock = typeof findTutorialConclusionOperation === 'function' ? findTutorialConclusionOperation() : null;

  if (!primaryBlock) {
    return { type: targetType, block: null, isMissing: true, isComplete: false };
  }

  const missingHole = getTutorialOperationMissingHole(targetType, primaryBlock);
  const conclusionMissing = getTutorialOperationMissingHole('conclusion_operation', conclusionBlock);
  const isComplete = !missingHole && !conclusionMissing && (!!conclusionBlock || String(stageId) !== '0-1');
  return { type: targetType, block: primaryBlock, isMissing: false, isComplete };
}

function getTutorialOperationMissingHole(targetType, targetBlock) {
  if (!targetType) return null;

  if (targetType === 'replace_operation') {
    if (!targetBlock || !targetBlock.getInputTargetBlock?.('VALUE')) {
      return { key: 'fill-replace-value', inputName: 'VALUE' };
    }
    if (!targetBlock.getInputTargetBlock?.('FORMULA')) {
      return { key: 'fill-replace-formula', inputName: 'FORMULA' };
    }
    if (!targetBlock.getInputTargetBlock?.('REPLACEMENT')) {
      return { key: 'fill-replace-result', inputName: 'REPLACEMENT' };
    }
    return null;
  }

  if (targetType === 'conclusion_operation') {
    if (!targetBlock || !targetBlock.getInputTargetBlock?.('VALUE')) {
      return { key: 'fill-conclusion-value', inputName: 'VALUE' };
    }
    return null;
  }

  return null;
}

function getTutorialGoalState(stageId) {
  if (!isTutorialStageId(stageId)) return null;

  const targetState = getTutorialTargetOperationState(stageId);
  if (!targetState) return null;

  if (targetState.isComplete) {
    return {
      key: 'ready-check',
      text: '【目標】ブロックがそろったら、「正解をチェック」を押そう。',
    };
  }

  if (!targetState.block) {
    return {
      key: `pull-${targetState.type || 'operation'}`,
      text: targetState.type === 'common_denominator_operation'
        ? '【目標】左の「証明」から通分ブロックを取り出そう。'
        : '【目標】左の「証明」から置き換えブロックを取り出そう。',
    };
  }

  const missingHole = getTutorialOperationMissingHole(targetState.type, targetState.block);
  if (!missingHole) {
    return {
      key: 'ready-check',
      text: '【目標】ブロックがそろったら、「正解をチェック」を押そう。',
    };
  }

  const textByKey = {
    'fill-replace-value': '【目標】式の値を入れよう。',
    'fill-replace-formula': '【目標】使う公式を入れよう。',
    'fill-replace-result': '【目標】置き換え後の式を入れよう。',
    'fill-conclusion-value': '【目標】最後の答えを入れよう。',
  };

  return {
    key: missingHole.key || 'ready-check',
    text: textByKey[missingHole.key] || '【目標】進められるところから埋めていこう。',
  };
}

const BLOCK_HOLE_OFFSETS = {
  'replace_operation': {
    'EXPRESSION': { rightOffset: -10, topOffset: 20 },
    'FORMULA': { rightOffset: -10, topOffset: 64 },
    'RESULT': { rightOffset: -10, topOffset: 108 },
    'NEXT_STATEMENT': { leftOffset: 16, bottomOffset: -20 },
  },
  'proof_step': {
    'STATEMENT': { leftOffset: 16, topOffset: 36 },
  },
  'default': {
    'VALUE': { rightOffset: -10, topOffset: 'center' },
    'NEXT_STATEMENT': { leftOffset: 16, bottomOffset: -20 },
  },
};

const TUTORIAL_STEPS = [
  {
    key: '1️⃣',
    text: '📚 ようこそ。\n数式パズルの流れを一緒に確認しましょう。',
    help: '左のパレットからブロックを取り出して、式をつないでいきましょう。',
    targetId: 'l',
  },
  {
    key: '2️⃣',
    text: '🧮 公式を使ってみましょう。\n紫の「公式ブロック」をはめ込んでみてください。',
    help: '公式を使って、式を別の形へ置き換えるのが基本です。',
    targetId: 'l',
  },
  {
    key: '3️⃣',
    text: '✨ 公式を組み合わせましょう。\n複数の公式をつないで、式を洗練させていきます。',
    help: '目標の形に近づくまで、ブロックをつないでいきましょう。',
    targetId: 'l',
  },
  {
    key: '🎯',
    text: '🎯 チュートリアルは完了です。\n準備が整いました。',
    help: 'マップ画面から好きなステージを選んで挑戦してみましょう。',
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
window.currentStageNumber = 0;
window.workspace = null;
window.tutorialModeActive = false;
