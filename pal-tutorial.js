// ============================================
// pal-tutorial.js
// パルによるステージごとの完全誘導チュートリアル。
//
// 汎用化: window.PAL_TUTORIAL_SCRIPTS[stageId].steps を台本として使う。
// 主な API:
//   window.startPalTutorial(stageId, onComplete)
// ============================================

(function palTutorialModule() {
  const WAITING_HINT_ID = 'pal-tutorial-waiting-hint';
  const WAITING_HINT_CLASS = 'pal-tutorial-waiting-hint';
  const WAITING_HINT_INNER_CLASS = 'pal-tutorial-waiting-hint-inner';
  const WAITING_HINT_TEXT_CLASS = 'pal-tutorial-waiting-hint-text';
  const WAITING_HINT_EXPLAIN_CLASS = 'pal-tutorial-waiting-hint-explain';

  let currentState = null;
  let workspaceListener = null;
  let buttonClickHandler = null;
  let customPollTimerId = 0;

  console.log('[pal-tutorial] モジュール読み込み完了');

  // 現在のチュートリアルステップ配列を取得
  function getSteps() {
    if (!currentState || !currentState.stageId) return [];
    const script = window.PAL_TUTORIAL_SCRIPTS && window.PAL_TUTORIAL_SCRIPTS[currentState.stageId];
    return (script && Array.isArray(script.steps)) ? script.steps : [];
  }

  // ============================================
  // 動的シーン登録
  // stageId をシーンIDに含めることで、複数ステージのチュートリアルが共存できる。
  // ============================================
  function registerScenesForStep(stepIndex) {
    const steps = getSteps();
    const step = steps[stepIndex];
    if (!step) return;

    const stageId = currentState.stageId;
    const introSceneId = `pal_${stageId}_intro_${stepIndex}`;
    const completeSceneId = `pal_${stageId}_complete_${stepIndex}`;
    const isLastStep = stepIndex >= steps.length - 1;

    let introChoiceLabel = '操作してみる ✋';
    let introActionId = `pal_${stageId}_start_waiting_${stepIndex}`;
    if (step.autoAdvance) {
      introChoiceLabel = 'わかった！';
      introActionId = isLastStep ? `pal_${stageId}_finish` : `pal_${stageId}_next_step_${stepIndex}`;
    } else if (step.buttonWait) {
      introChoiceLabel = 'よし、押してみる ✋';
    }

    window.CHARACTER_SCENES[introSceneId] = {
      character: 'hippalcos',
      portrait: 'explain',
      lines: step.introLines,
      choices: [{
        label: introChoiceLabel,
        subLabel: `ステップ ${stepIndex + 1} / ${steps.length}`,
        actionId: introActionId,
      }],
    };

    if (!step.autoAdvance) {
      window.CHARACTER_SCENES[completeSceneId] = {
        character: 'hippalcos',
        portrait: 'joy',
        lines: step.completeLines || [],
        choices: [{
          label: isLastStep ? '完了！ ✨' : '次のステップ ▶',
          subLabel: '',
          actionId: isLastStep ? `pal_${stageId}_finish` : `pal_${stageId}_next_step_${stepIndex}`,
        }],
      };
    }

    window.CHARACTER_SCENE_ACTIONS[`pal_${stageId}_start_waiting_${stepIndex}`] = function () {
      window.closeCharacterDialog();
      setTimeout(() => enterWaitingPhase(stepIndex), 350);
    };
    if (!isLastStep) {
      window.CHARACTER_SCENE_ACTIONS[`pal_${stageId}_next_step_${stepIndex}`] = function () {
        window.closeCharacterDialog();
        setTimeout(() => startStep(stepIndex + 1), 350);
      };
    }
  }

  function registerAllScenes() {
    if (!window.CHARACTER_SCENES || !window.CHARACTER_SCENE_ACTIONS) return;
    const steps = getSteps();
    const stageId = currentState.stageId;
    steps.forEach((_, i) => registerScenesForStep(i));
    window.CHARACTER_SCENE_ACTIONS[`pal_${stageId}_finish`] = function () {
      window.closeCharacterDialog();
      setTimeout(() => finishTutorial(), 350);
    };
  }

  // ============================================
  // 待機ヒント
  // ============================================
  function ensureWaitingHint() {
    let el = document.getElementById(WAITING_HINT_ID);
    if (el) return el;
    el = document.createElement('div');
    el.id = WAITING_HINT_ID;
    el.className = `${WAITING_HINT_CLASS} hidden`;
    el.innerHTML = `
      <div class="${WAITING_HINT_INNER_CLASS}">
        <div class="${WAITING_HINT_TEXT_CLASS}"></div>
        <button class="${WAITING_HINT_EXPLAIN_CLASS}" type="button">もう一度説明 ↩</button>
      </div>
    `;
    document.body.appendChild(el);
    el.querySelector(`.${WAITING_HINT_EXPLAIN_CLASS}`).addEventListener('click', restartCurrentStepIntro);
    return el;
  }

  function showWaitingHint(html) {
    const el = ensureWaitingHint();
    el.querySelector(`.${WAITING_HINT_TEXT_CLASS}`).innerHTML = html || '';
    el.classList.remove('hidden');
    requestAnimationFrame(() => el.classList.add('show'));
  }

  function hideWaitingHint() {
    const el = document.getElementById(WAITING_HINT_ID);
    if (!el) return;
    el.classList.remove('show');
    setTimeout(() => el.classList.add('hidden'), 220);
  }

  // ============================================
  // ボタン有効/無効の制御
  // ============================================
  const CONTROLLED_BUTTON_IDS = ['btn-reset', 'btn-answer', 'btn-submit'];

  function disableAllControlledButtons() {
    CONTROLLED_BUTTON_IDS.forEach((id) => {
      const btn = document.getElementById(id);
      if (btn) {
        btn.disabled = true;
        btn.classList.add('pal-tutorial-disabled');
      }
    });
  }

  function enableButtons(ids) {
    if (!Array.isArray(ids)) return;
    ids.forEach((id) => {
      const btn = document.getElementById(id);
      if (btn) {
        btn.disabled = false;
        btn.classList.remove('pal-tutorial-disabled');
      }
    });
  }

  function enableAllControlledButtons() {
    CONTROLLED_BUTTON_IDS.forEach((id) => {
      const btn = document.getElementById(id);
      if (btn) {
        btn.disabled = false;
        btn.classList.remove('pal-tutorial-disabled');
      }
    });
  }

  // ============================================
  // ガイド機能OFFの強制 (0-1 チュートリアル用)
  // 現状 0-1 のみ強制 OFF する (完全誘導のため答えの骨組み表示が邪魔になる)。
  // 他ステージでは何もしない。
  // ============================================
  function ensureGuideOff() {
    const btn = document.getElementById('btn-overwrite-permission');
    if (!btn) return;
    if (btn.classList.contains('on')) btn.click();
  }

  // ============================================
  // ステップ制御
  // ============================================
  function startStep(index) {
    if (!currentState) return;
    const steps = getSteps();
    const step = steps[index];
    if (!step) return finishTutorial();

    currentState.stepIndex = index;
    currentState.phase = 'intro';
    hideWaitingHint();

    if (Array.isArray(step.enableButtons)) enableButtons(step.enableButtons);

    const introSceneId = `pal_${currentState.stageId}_intro_${index}`;
    window.startCharacterDialog(introSceneId, {
      onChoiceSelected: (actionId) => {
        const action = window.CHARACTER_SCENE_ACTIONS[actionId];
        if (typeof action === 'function') action();
      },
    });
  }

  function enterWaitingPhase(stepIndex) {
    if (!currentState) return;
    const steps = getSteps();
    const step = steps[stepIndex];
    if (!step) return;

    currentState.stepIndex = stepIndex;
    currentState.phase = 'waiting';

    // hintHtml は文字列 or 関数。関数なら実行時に評価してブロック SVG を注入できる。
    let hintHtml = step.hintHtml;
    if (typeof hintHtml === 'function') {
      try { hintHtml = hintHtml(); } catch (_) { hintHtml = ''; }
    }
    showWaitingHint(hintHtml || '↑ 操作してみて！');

    // buttonWait: DOM ボタンクリックを capture で捕獲
    if (step.buttonWait && step.buttonId) {
      const targetBtn = document.getElementById(step.buttonId);
      if (targetBtn) {
        buttonClickHandler = (event) => {
          if (event._palTutorialReplay) return;
          event.stopImmediatePropagation();
          event.preventDefault();
          currentState._deferredClickBtnId = step.buttonId;
          onStepAchieved();
        };
        targetBtn.addEventListener('click', buttonClickHandler, { capture: true, once: true });
      }
    }

    // customWatch: 100ms 間隔で pollCheck() を評価
    if (step.customWatch && typeof step.customWatch.pollCheck === 'function') {
      const pollFn = step.customWatch.pollCheck;
      const tick = () => {
        if (!currentState || currentState.phase !== 'waiting') return;
        try {
          if (pollFn()) {
            onStepAchieved();
            return;
          }
        } catch (_) {}
        customPollTimerId = setTimeout(tick, 100);
      };
      customPollTimerId = setTimeout(tick, 100);
    }
  }

  function restartCurrentStepIntro() {
    if (!currentState) return;
    hideWaitingHint();
    detachButtonClickHandler();
    clearCustomPollTimer();
    startStep(currentState.stepIndex);
  }

  function detachButtonClickHandler() {
    if (!buttonClickHandler) return;
    const steps = getSteps();
    const step = steps[currentState?.stepIndex];
    if (step && step.buttonId) {
      const btn = document.getElementById(step.buttonId);
      if (btn) btn.removeEventListener('click', buttonClickHandler, { capture: true });
    }
    buttonClickHandler = null;
  }

  function clearCustomPollTimer() {
    if (customPollTimerId) {
      clearTimeout(customPollTimerId);
      customPollTimerId = 0;
    }
  }

  function handleWorkspaceEvent(event) {
    if (!currentState) return;
    if (currentState.phase !== 'waiting') return;
    if (!event || event.isUiEvent) return;

    const steps = getSteps();
    const step = steps[currentState.stepIndex];
    if (!step) return;
    if (step.buttonWait) return;
    if (step.customWatch) return; // customWatch ステップは pollCheck 側で処理
    if (typeof step.check !== 'function') return;

    let matched = false;
    try {
      matched = !!step.check(event, window.workspace);
    } catch (_) {
      matched = false;
    }
    if (matched) onStepAchieved();
  }

  function onStepAchieved() {
    if (!currentState) return;
    hideWaitingHint();
    detachButtonClickHandler();
    clearCustomPollTimer();
    currentState.phase = 'complete';
    const steps = getSteps();
    const step = steps[currentState.stepIndex];
    // completeLines が空なら complete シーンをスキップして次のステップへ
    // (autoAdvance ステップも通常 completeLines が空なので同じ流れになる)
    if (!step || !step.completeLines || step.completeLines.length === 0) {
      const isLastStep = currentState.stepIndex >= steps.length - 1;
      if (isLastStep) {
        finishTutorial();
      } else {
        startStep(currentState.stepIndex + 1);
      }
      return;
    }
    const completeSceneId = `pal_${currentState.stageId}_complete_${currentState.stepIndex}`;
    window.startCharacterDialog(completeSceneId, {
      onChoiceSelected: (actionId) => {
        const action = window.CHARACTER_SCENE_ACTIONS[actionId];
        if (typeof action === 'function') action();
      },
    });
  }

  function finishTutorial() {
    if (workspaceListener && window.workspace) {
      window.workspace.removeChangeListener(workspaceListener);
      workspaceListener = null;
    }
    detachButtonClickHandler();
    clearCustomPollTimer();
    hideWaitingHint();
    enableAllControlledButtons();

    const deferredBtnId = currentState ? currentState._deferredClickBtnId : null;
    const onComplete = currentState ? currentState.onComplete : null;
    currentState = null;

    if (deferredBtnId) {
      const btn = document.getElementById(deferredBtnId);
      if (btn) {
        const replayEvent = new MouseEvent('click', { bubbles: true, cancelable: true });
        replayEvent._palTutorialReplay = true;
        btn.dispatchEvent(replayEvent);
      }
    }
    if (typeof onComplete === 'function') onComplete();
  }

  // ============================================
  // 公開 API
  //   startPalTutorial(stageId, onComplete)
  //   startPalTutorial(onComplete) ← 旧 API 互換 (stageId 省略時は '0-1')
  // ============================================
  window.startPalTutorial = function (stageIdOrCallback, maybeOnComplete) {
    let stageId, onComplete;
    if (typeof stageIdOrCallback === 'function') {
      stageId = '0-1';
      onComplete = stageIdOrCallback;
    } else {
      stageId = String(stageIdOrCallback || '0-1');
      onComplete = maybeOnComplete;
    }

    console.log(`[pal-tutorial] startPalTutorial 呼び出し (stageId=${stageId})`);
    const script = window.PAL_TUTORIAL_SCRIPTS && window.PAL_TUTORIAL_SCRIPTS[stageId];
    if (!script || !Array.isArray(script.steps) || script.steps.length === 0) {
      console.warn(`[pal-tutorial] PAL_TUTORIAL_SCRIPTS['${stageId}'] が未定義または空`);
      if (typeof onComplete === 'function') onComplete();
      return;
    }
    console.log(`[pal-tutorial] ステージ ${stageId} ステップ数:`, script.steps.length);

    currentState = {
      stageId,
      stepIndex: 0,
      phase: 'intro',
      onComplete: onComplete || function () {},
    };

    // 0-1 のみガイド機能を強制 OFF (完全誘導のため)
    if (stageId === '0-1') {
      ensureGuideOff();
    }
    disableAllControlledButtons();

    registerAllScenes();

    if (window.workspace && typeof window.workspace.addChangeListener === 'function') {
      workspaceListener = handleWorkspaceEvent;
      window.workspace.addChangeListener(workspaceListener);
    }

    startStep(0);
  };

  window.abortPalTutorial = function () {
    if (workspaceListener && window.workspace) {
      window.workspace.removeChangeListener(workspaceListener);
      workspaceListener = null;
    }
    detachButtonClickHandler();
    clearCustomPollTimer();
    hideWaitingHint();
    enableAllControlledButtons();
    window.closeCharacterDialog();
    currentState = null;
  };

  // 現在パルチュートリアル進行中かどうかを外部から確認できるようにする
  window.isPalTutorialActive = function () {
    return currentState !== null;
  };
})();