// ===== app.js =====
window._appEventsBound = window._appEventsBound || false;

function setupEventListeners() {
  if (window._appEventsBound) return;
  window._appEventsBound = true;

  document.getElementById('btn-overwrite-permission')?.addEventListener('click', () => {
    if (typeof getProofScaffoldMode !== 'function') return;
    const currentMode = getProofScaffoldMode();
    const nextMode = currentMode === 'guided' ? 'standard' : 'guided';
    setProofScaffoldMode(nextMode);
    if (typeof updateOverwritePermissionButton === 'function') updateOverwritePermissionButton();

    if (document.getElementById('p')?.classList.contains('b')) {
      loadStage(currentStageNumber);
    }
    showToast(nextMode === 'guided' ? 'ガイド機能を ON にしました' : 'ガイド機能を OFF にしました');
  });

  // ガイド機能の状態管理
window.proofScaffoldMode = 'standard';
window.getProofScaffoldMode = function() { return window.proofScaffoldMode; };
window.setProofScaffoldMode = function(mode) { window.proofScaffoldMode = mode; };

  document.getElementById('btn-reset')?.addEventListener('click', () => {
    if (typeof currentStreak !== 'undefined') window.currentStreak = 0;
    if (typeof updateStreakCounter === 'function') updateStreakCounter(false);
    if (typeof loadStage === 'function') loadStage(currentStageNumber);
  });

  document.getElementById('btn-hint')?.addEventListener('click', () => {
    if (typeof tutorialModeActive !== 'undefined' && tutorialModeActive) {
      showToast(getTutorialBannerText(currentStageNumber) || '【目標】ブロックの空いている穴に、対応する式をはめ込みましょう。', true);
      updateTutorialHighlightUI(currentStageNumber);
      return;
    }
    if (typeof goalHintActive !== 'undefined' && goalHintActive) {
      if (typeof hideGoalHintForStage === 'function') hideGoalHintForStage();
    } else {
      if (typeof showGoalHintForStage === 'function') showGoalHintForStage();
    }
  });

  document.getElementById('btn-answer')?.addEventListener('click', () => {
    if (typeof currentProblemData === 'undefined' || !currentProblemData?.answerState) {
      return showToast('まだ解答例はありません', false);
    }
    if (typeof workspace !== 'undefined' && workspace) {
      workspace.clear();
      Blockly.serialization.workspaces.load(currentProblemData.answerState, workspace);
      if (typeof forceWorkspaceLayoutSync === 'function') forceWorkspaceLayoutSync();
      if (typeof arrangeBlocks === 'function') arrangeBlocks();
      if (typeof updateSubmitButtonState === 'function') updateSubmitButtonState();
      showToast('解答例を表示しました');
    }
  });

  document.getElementById('btn-back')?.addEventListener('click', () => {
    if (typeof closeSkipChallengeModal === 'function') closeSkipChallengeModal();
    if (typeof renderStageMap === 'function') renderStageMap();
    if (typeof switchScreen === 'function') switchScreen('stage-map-screen');
    if (typeof setAppBackgroundByKey === 'function') setAppBackgroundByKey('select'); // マップ画面の背景へ切り替え
  });

  document.getElementById('btn-entry-start')?.addEventListener('click', async () => {
    const entrance = document.getElementById('game-entrance');
    if (entrance) entrance.classList.add('show-choices');
    if (typeof setAppBackgroundByKey === 'function') setAppBackgroundByKey('select'); // モード選択肢が見えるタイミングでマップ背景へ予備切り替え
  });

  document.getElementById('btn-entry-tutorial')?.addEventListener('click', async () => {
    if (typeof closeGameEntrance === 'function') closeGameEntrance();
    let introShown = false;
    if (typeof showTutorialIntroModal === 'function') {
      introShown = showTutorialIntroModal();
    }
    if (!introShown && typeof transitionToStage === 'function') {
      await transitionToStage('0-1');
    }
  });

  document.getElementById('btn-entry-map')?.addEventListener('click', async () => {
    localStorage.setItem('tutorial_seen', 'true');
    if (typeof closeGameEntrance === 'function') closeGameEntrance();
    if (typeof routeToTarget === 'function') {
      await routeToTarget(); // スキップせず最新の進捗マップ、またはステージへ進行
    }
  });

  document.getElementById('btn-tutorial-intro-next')?.addEventListener('click', () => {
    if (typeof tutorialIntroIndex !== 'undefined' && typeof TUTORIAL_STEPS !== 'undefined') {
      tutorialIntroIndex = Math.min(tutorialIntroIndex + 1, TUTORIAL_STEPS.length - 1);
      if (typeof updateTutorialIntroStep === 'function') updateTutorialIntroStep();
    }
  });

  document.getElementById('btn-tutorial-intro-ok')?.addEventListener('click', async () => {
    if (typeof hideTutorialIntroModal === 'function') hideTutorialIntroModal();
    if (typeof transitionToStage === 'function') await transitionToStage('0-1');
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  await bootApplication();
});

async function bootApplication() {
  if (typeof updateSubmitButtonState === 'function') updateSubmitButtonState();
  if (typeof resetAppStateForGoLiveIfNeeded === 'function') resetAppStateForGoLiveIfNeeded();

  setupEventListeners();
  
  if (typeof bindTutorialWorkspaceAutoAdvance === 'function') bindTutorialWorkspaceAutoAdvance();
  if (typeof updateStreakCounter === 'function') updateStreakCounter(false);
  if (typeof updateOverwritePermissionButton === 'function') updateOverwritePermissionButton();

  // 【重要】起動時は自動スキップせず、必ず綺麗にデザインされたスタート画面から開始させます
  if (typeof openGameEntrance === 'function') {
    openGameEntrance();
  }
}