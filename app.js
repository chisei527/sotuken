window.hasBoundEventListeners = false;

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

function updateSubmitButtonState() {
  // ここに updateSubmitButtonState の実装を追加
}

function resetAppStateForGoLiveIfNeeded() {
  // ここに resetAppStateForGoLiveIfNeeded の実装を追加
}

async function bootApplication() {
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
