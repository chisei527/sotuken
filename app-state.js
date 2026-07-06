// ===== app-state.js =====
// アプリ全体で共有する状態と定数。すべて window.xxx に直接書き込む形に統一し、
// 「ローカル変数」と「windowプロパティ」が食い違う事故を根本的に防ぐ。
//
// ルール:
//   - 状態と関数は全て window.xxx として定義する
//   - 他ファイルからも必ず window.xxx として参照する（裸の参照は禁止）

// ------------------------------------------------------------
// 定数（変化しない値）
// ------------------------------------------------------------
window.UNLOCKED_FORMULAS_STORAGE_KEY = 'unlocked_formulas';
window.MAX_STAGE_NUMBER = 100;
window.TUTORIAL_STAGE_IDS = ['0-1', '0-2', '0-3', '0-4', '0-5', '0-6', '0-7', '0-8'];
window.APP_STORAGE_KEYS = ['s', 'unlock_all', 'tutorial_seen', 'proof_scaffold_mode', 'tutorial_progress', window.UNLOCKED_FORMULAS_STORAGE_KEY];

// ------------------------------------------------------------
// 【開発用】起動時に localStorage を自動リセットするフラグ。
// テスト中は毎回まっさらな状態から始めたいので true にする。
// 本番リリース時は false にする。
// ------------------------------------------------------------
window.AUTO_RESET_ON_LOAD = true;
if (window.AUTO_RESET_ON_LOAD) {
  window.APP_STORAGE_KEYS.forEach((key) => { if (key) localStorage.removeItem(key); });
  console.log('[app-state] AUTO_RESET_ON_LOAD が有効なため localStorage をリセットしました');
}

window.MAP_WORLD_MIN_WIDTH = 3600;
window.MAP_WORLD_MIN_HEIGHT = 2400;
window.MAP_NODE_SIZE = 94;

window.BLOCK_HOLE_OFFSETS = {
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

window.TUTORIAL_STEPS = [
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

window.WORLD_SEGMENTS = [
  { start: 1, end: 25, title: 'World 1: Foundational Route', subtitle: '公式の基本連結' },
  { start: 26, end: 50, title: 'World 2: Conversion Ridge', subtitle: '変換の往復を習得' },
  { start: 51, end: 75, title: 'World 3: Identity Frontier', subtitle: '恒等式の複合運用' },
  { start: 76, end: 85, title: 'World 4: Master Ascent', subtitle: '最終証明ゾーン' },
  { start: 86, end: 100, title: 'World 5: Apex Legend', subtitle: '最高難度の集大成' },
];

// ------------------------------------------------------------
// アンロック公式の永続化（localStorage）
// ------------------------------------------------------------
window.loadUnlockedFormulasFromStorage = function() {
  try {
    const raw = localStorage.getItem(window.UNLOCKED_FORMULAS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map((id) => String(id)) : [];
  } catch (_) {
    return [];
  }
};

window.saveUnlockedFormulasToStorage = function(formulaIds) {
  const safeIds = Array.isArray(formulaIds) ? formulaIds.map((id) => String(id)) : [];
  localStorage.setItem(window.UNLOCKED_FORMULAS_STORAGE_KEY, JSON.stringify(safeIds));
};

// ------------------------------------------------------------
// 共有状態（書き換わる値）— すべて window 直書きで一元化
// ------------------------------------------------------------
window.clearedStages = JSON.parse(localStorage.getItem('s')) || [];
window.unlockAll = localStorage.getItem('unlock_all') === '1';
window.unlockedFormulas = window.loadUnlockedFormulasFromStorage();
window.currentStageNumber = 0;
window.currentProblemData = null;
window.currentStreak = 0;
window.currentStageSolved = false;
window.currentSkipOffer = null;
window.pendingSkipChallenge = null;
window.hasBoundEventListeners = false;
window.autoAdvanceTimerId = 0;
window.problemsDataCache = null;
window.workspace = null;

// チュートリアル関連
window.tutorialStepIndex = 0;
window.tutorialModeActive = false;
window.tutorialAutoAdvanceFrameId = 0;
window.tutorialWorkspaceListenerBound = false;
window.tutorialFlowProblems = [];
window.tutorialFlowIndex = 0;
window.tutorialIntroIndex = 0;
window.tutorialProgressCount = Math.max(0, parseInt(localStorage.getItem('tutorial_progress') || '0', 10) || 0);

// ガイド/ヒント関連
window.goalHintActive = false;
window.currentHighlightTargetNode = null;
window.currentHighlightInputObj = null;
window.highlightTrackingFrameId = 0;

// ------------------------------------------------------------
// チュートリアル判定ヘルパー
// ------------------------------------------------------------
window.isTutorialStageId = function(stageId) {
  return window.TUTORIAL_STAGE_IDS.includes(String(stageId));
};

window.getTutorialStageIndex = function(stageId) {
  return window.TUTORIAL_STAGE_IDS.indexOf(String(stageId));
};

window.getTutorialStageId = function(stageIndex) {
  return window.TUTORIAL_STAGE_IDS[Math.max(0, Math.min(Number(stageIndex) || 0, window.TUTORIAL_STAGE_IDS.length - 1))] || null;
};

window.getNextTutorialStageId = function(stageId) {
  const currentIndex = window.getTutorialStageIndex(stageId);
  if (currentIndex < 0) return null;
  return window.getTutorialStageId(currentIndex + 1);
};

// (旧 getTutorialBannerText 定義は app-guide.js に一本化されました)

// ------------------------------------------------------------
// チュートリアル進行状態の判定
// ------------------------------------------------------------
window.getTutorialOperationMissingHole = function(targetType, targetBlock) {
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
};

window.getTutorialTargetOperationState = function(stageId) {
  if (!window.isTutorialStageId(stageId) || !window.workspace) {
    return { type: null, block: null, isMissing: false, isComplete: true };
  }

  const targetType = 'replace_operation';
  const primaryBlock = typeof window.findTutorialReplaceOperation === 'function' ? window.findTutorialReplaceOperation() : null;
  const conclusionBlock = typeof window.findTutorialConclusionOperation === 'function' ? window.findTutorialConclusionOperation() : null;

  if (!primaryBlock) {
    return { type: targetType, block: null, isMissing: true, isComplete: false };
  }

  const missingHole = window.getTutorialOperationMissingHole(targetType, primaryBlock);
  const conclusionMissing = window.getTutorialOperationMissingHole('conclusion_operation', conclusionBlock);
  const isComplete = !missingHole && !conclusionMissing && (!!conclusionBlock || String(stageId) !== '0-1');
  return { type: targetType, block: primaryBlock, isMissing: false, isComplete };
};

window.getTutorialGoalState = function(stageId) {
  if (!window.isTutorialStageId(stageId)) return null;

  const targetState = window.getTutorialTargetOperationState(stageId);
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

  const missingHole = window.getTutorialOperationMissingHole(targetState.type, targetState.block);
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
};