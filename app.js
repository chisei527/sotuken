window.hasBoundEventListeners = false;

// app-state.js の機能を追加
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

// math-logic.js の機能を追加
const FORMULA_REGISTRY = {
  formula_1: {
    id: 'formula_1',
    text: 'sin(x)^2+cos(x)^2=1',
    label: '公式①',
    concept: 'pythagorean_identity',
    getSides: (thetaExpr = 'theta') => [`sin(${thetaExpr})^2 + cos(${thetaExpr})^2`, '1'],
  },
  // 他の公式定義を追加
};

function formulaTextToId(formulaText) {
  const normalized = normalizeFormulaText(formulaText);
  const matched = Object.values(FORMULA_REGISTRY).find((entry) => entry.text === normalized);
  return matched ? matched.id : null;
}

// tutorial.js の機能を追加
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
    if (!currentProblemData?.answerState) return showToast('まだ解答例はありません', false);
    workspace.clear();
    Blockly.serialization.workspaces.load(currentProblemData.answerState, workspace);
    forceWorkspaceLayoutSync();
    arrangeBlocks();
    updateSubmitButtonState();
    showToast('解答例を表示しました');
  });

  document.getElementById('btn-back')?.addEventListener('click', () => {
    closeSkipChallengeModal();
    renderStageMap();
    switchScreen('stage-map-screen');
  });

  document.getElementById('btn-entry-start')?.addEventListener('click', async () => {
    const entrance = document.getElementById('game-entrance');
    if (entrance) entrance.classList.add('show-choices');
    setAppBackgroundByKey('select');
    await routeToTarget();
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
    document.getElementById('btn-submit').style.display = 'inline-block';
    transitionToStage(targetStage);
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
        showToast(`<span style='color:#ff4b4b'>証明に必要な公式がまだそろっていません: ${labels}</span>`);
        return;
      }
    }

    const requiredConcepts = getRequiredConceptsForProblem(currentProblemData);
    if (requiredConcepts.length > 0) {
      const achievedConcepts = collectAchievedConceptsFromAST(ast);
      const missingConcepts = requiredConcepts.filter((conceptId) => !achievedConcepts.has(conceptId));
      if (missingConcepts.length > 0) {
        const labels = missingConcepts.map((conceptId) => getConceptLabel(conceptId)).join('、');
        showToast(`<span style='color:#ff4b4b'>証明に必要な考え方がまだそろっていません: ${labels}</span>`);
        return;
      }
    } else {
      const actualGreenTypes = ast
        .map((step) => String(step.type || ''))
        .filter((type) => GREEN_OPERATION_TYPES.has(type));
      const requiredGreenTypes = getRequiredGreenOperationSequence(currentProblemData);
      const missingGreenTypes = getMissingTypesByRequiredOrder(requiredGreenTypes, actualGreenTypes);
      if (missingGreenTypes.length > 0) {
        showToast(`<span style='color:#ff4b4b'>証明に必要なブロックがまだそろっていません: ${summarizeTypeCounts(missingGreenTypes)}</span>`);
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

      document.getElementById('btn-hint').disabled = true;
      document.getElementById('btn-answer').disabled = true;
      document.getElementById('btn-reset').disabled = true;
      document.getElementById('btn-overwrite-permission').disabled = true;

      showToast("<span style='color:#58cc02; font-size:1.2em;'>🎉 正解！完璧です！</span>", false);
      showClearStamp('CLEAR!');
      showSuccessRipple();

      if (!isTutorialStageId(currentStageNumber) && !clearedStages.includes(currentStageNumber) && currentStageNumber >= 60) {
        clearedStages.push(currentStageNumber);
        localStorage.setItem('s', JSON.stringify(clearedStages));
      }

      applyPendingSkipClearIfNeeded();

      document.getElementById('btn-submit').style.display = 'none';
      scheduleAutoAdvanceAfterClear();
    } else {
      currentStreak = 0;
      updateStreakCounter(false);
      const userMessage = getErrorMessage(
        validation.errorCode,
        validation.errorStepIndex,
        validation.suggestions,
      );
      showToast(`<span style='color:#ff4b4b'>証明がまだ整っていません。${userMessage}</span>`);
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

document.addEventListener('DOMContentLoaded', async () => {
  await bootApplication();
});

function checkIfReadyToSubmit() {
  // 提出可能かどうかを確認するロジックを実装
  // 例: 必要な条件を満たしているかどうかをチェック
  return true; // 仮の実装として常に true を返す
}

function updateOverwritePermissionButton() {
  // ボタンの状態を更新するロジックを実装
  const button = document.getElementById('btn-overwrite-permission');
  if (!button) return;

  const currentMode = getProofScaffoldMode();
  button.textContent = `ガイド機能: ${currentMode === 'guided' ? 'ON' : 'OFF'}`;
  button.classList.toggle('on', currentMode === 'guided');
  button.classList.toggle('off', currentMode !== 'guided');
}

function updateSubmitButtonState() {
  // ボタンの状態を更新するロジックを実装
  const submitButton = document.getElementById('btn-submit');
  if (!submitButton) return;

  const isReadyToSubmit = checkIfReadyToSubmit(); // 例: 提出可能かどうかを確認する関数
  submitButton.disabled = !isReadyToSubmit;
}

function resetAppStateForGoLiveIfNeeded() {
  // アプリの状態をリセットするロジックを実装
  const goLiveFlag = localStorage.getItem('go_live_flag');
  if (goLiveFlag) {
    // 必要に応じて状態をリセット
    localStorage.removeItem('go_live_flag');
    resetApplicationState(); // 例: アプリの状態をリセットする関数
  }
}

async function bootApplication() {
  // アプリケーションの初期化ロジックを実装
  updateSubmitButtonState();
  resetAppStateForGoLiveIfNeeded();

  setupEventListeners();
  bindTutorialWorkspaceAutoAdvance();
  updateStreakCounter(false);
  updateSubmitButtonState();
  updateOverwritePermissionButton();

  const tutorialSeenFlag = localStorage.getItem('tutorial_seen');
  if (tutorialSeenFlag === null) {
    openGameEntrance();
  } else {
    closeGameEntrance();
    await routeToTarget();
  }
}
