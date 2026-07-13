// ============================================
// basics-tutorial.js
// 操作基礎チュートリアル (ステージ 0-0) の進行制御。
//
// 【方針D】既存の character-dialog.js の大きいキャラダイアログを流用する。
//  - フリエは画面いっぱいの立ち絵でセリフを話す (intro / complete)
//  - 「操作してみる」ボタンでダイアログを閉じ、ワークスペースを触れるようにする
//  - 操作待機中は画面右下に小さなヒント吹き出しだけ表示 (waiting-hint)
//  - Blocklyの操作が check() を満たしたら、再度大きなダイアログで complete セリフを話す
//
// 主な API:
//   window.startBasicsTutorial(onComplete)
//   window.abortBasicsTutorial()
// ============================================

(function basicsTutorialModule() {
  const WAITING_HINT_ID = 'basics-tutorial-waiting-hint';

  let currentState = null;
  let workspaceListener = null;

  // ============================================
  // 小さなヒント吹き出し (操作待機中に画面右下に出す)
  // ============================================
  function ensureWaitingHint() {
    let el = document.getElementById(WAITING_HINT_ID);
    if (el) return el;
    el = document.createElement('div');
    el.id = WAITING_HINT_ID;
    el.className = 'basics-tutorial-waiting-hint hidden';
    el.innerHTML = `
      <div class="basics-tutorial-waiting-hint-inner">
        <div class="basics-tutorial-waiting-hint-text"></div>
        <button class="basics-tutorial-waiting-hint-explain" type="button">もう一度説明 ↩</button>
      </div>
    `;
    document.body.appendChild(el);
    el.querySelector('.basics-tutorial-waiting-hint-explain').addEventListener('click', restartCurrentStepIntro);
    return el;
  }

  function showWaitingHint(payload) {
    const el = ensureWaitingHint();
    const target = el.querySelector('.basics-tutorial-waiting-hint-text');
    if (payload && typeof payload === 'object' && payload.html) {
      target.innerHTML = payload.html;
    } else {
      target.textContent = String(payload || '');
    }
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
  // 動的シーンの登録
  // 既存の character-dialog.js は CHARACTER_SCENES[sceneId] からデータを取るので、
  // ここで basics_intro_stepN / basics_complete_stepN を動的に登録する。
  // ============================================
  function registerScenesForStep(stepIndex) {
    const step = window.BASICS_TUTORIAL_STEPS[stepIndex];
    if (!step) return;

    // intro シーン: 最終行の後に「操作してみる ✋」を出す
    const introSceneId = `basics_intro_${stepIndex}`;
    window.CHARACTER_SCENES[introSceneId] = {
      character: 'furie',
      portrait: 'joyPlain',
      lines: step.introLines,
      choices: [
        {
          label: '操作してみる ✋',
          subLabel: `ステップ ${stepIndex + 1} / ${window.BASICS_TUTORIAL_STEPS.length}`,
          actionId: `basics_start_waiting_${stepIndex}`,
        },
      ],
    };

    // complete シーン: 最終行の後に「次のステップ」or「完了！」を出す
    const completeSceneId = `basics_complete_${stepIndex}`;
    const isLastStep = stepIndex >= window.BASICS_TUTORIAL_STEPS.length - 1;
    window.CHARACTER_SCENES[completeSceneId] = {
      character: 'furie',
      portrait: 'joy',
      lines: step.completeLines,
      choices: [
        {
          label: isLastStep ? '完了！ ✨' : '次のステップ ▶',
          subLabel: '',
          actionId: isLastStep ? 'basics_finish' : `basics_next_step_${stepIndex}`,
        },
      ],
    };

    // 対応するアクションも登録する (character-scenes.js の CHARACTER_SCENE_ACTIONS に差し込む)
    window.CHARACTER_SCENE_ACTIONS[`basics_start_waiting_${stepIndex}`] = function () {
      window.closeCharacterDialog();
      // ダイアログのフェードアウトを待ってから待機フェーズに入る
      setTimeout(() => enterWaitingPhase(stepIndex), 350);
    };
    if (!isLastStep) {
      window.CHARACTER_SCENE_ACTIONS[`basics_next_step_${stepIndex}`] = function () {
        window.closeCharacterDialog();
        setTimeout(() => startStep(stepIndex + 1), 350);
      };
    }
  }

  // 全ステップのアクションを一度に登録する (basics_finish もここで)
  function registerAllScenes() {
    if (!window.CHARACTER_SCENES || !window.CHARACTER_SCENE_ACTIONS) return;
    window.BASICS_TUTORIAL_STEPS.forEach((_, i) => registerScenesForStep(i));
    window.CHARACTER_SCENE_ACTIONS.basics_finish = function () {
      window.closeCharacterDialog();
      setTimeout(() => finishTutorial(), 350);
    };
  }

  // ============================================
  // ステップ制御
  // ============================================
  function startStep(index) {
    if (!currentState) return;
    const step = window.BASICS_TUTORIAL_STEPS[index];
    if (!step) return finishTutorial();

    currentState.stepIndex = index;
    currentState.phase = 'intro';
    hideWaitingHint();

    // 既存のキャラダイアログで intro シーンを開始
    window.startCharacterDialog(`basics_intro_${index}`, {
      onChoiceSelected: (actionId) => {
        const action = window.CHARACTER_SCENE_ACTIONS[actionId];
        if (typeof action === 'function') action();
      },
    });
  }

  function enterWaitingPhase(stepIndex) {
    if (!currentState) return;
    currentState.stepIndex = stepIndex;
    currentState.phase = 'waiting';

    // 短い指示テキストを右下に出す
    const step = window.BASICS_TUTORIAL_STEPS[stepIndex];
    const hintText = _shortHintForStep(step);
    showWaitingHint(hintText);
  }

  function restartCurrentStepIntro() {
    if (!currentState) return;
    hideWaitingHint();
    startStep(currentState.stepIndex);
  }

  function handleWorkspaceEvent(event) {
    if (!currentState) return;
    if (currentState.phase !== 'waiting') return;
    if (!event || event.isUiEvent) return;

    const step = window.BASICS_TUTORIAL_STEPS[currentState.stepIndex];
    if (!step || typeof step.check !== 'function') return;

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
    currentState.phase = 'complete';
    // complete シーンをキャラダイアログで再表示
    window.startCharacterDialog(`basics_complete_${currentState.stepIndex}`, {
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
    hideWaitingHint();
    // フリエ基礎チュートリアルは完了 → パル常駐を再表示させる
    document.body.classList.remove('furie-tutorial-active');
    const onComplete = currentState ? currentState.onComplete : null;
    currentState = null;
    if (typeof onComplete === 'function') onComplete();
  }

  // ============================================
  // ブロックの見た目をSVGで擬似再現するヘルパ
  // Blocklyのブロックそっくりの見た目 (角丸の色付き矩形にラベル) を、
  // ヒントテキスト内にインラインで埋め込むための SVG を返す。
  // ============================================
  function _svgBlockNumber() {
    // custom_number: 白い楕円っぽい形に "1"
    return `
<svg class="basics-tutorial-hint-block" viewBox="0 0 58 34" xmlns="http://www.w3.org/2000/svg" aria-label="1のブロック">
  <rect x="1" y="1" width="56" height="32" rx="16" ry="16"
    fill="#ffffff" stroke="#94a3b8" stroke-width="1.5"/>
  <text x="29" y="23" text-anchor="middle" font-family="serif" font-style="italic"
    font-size="18" font-weight="700" fill="#0f172a">1</text>
</svg>`;
  }
  function _svgBlockAdd() {
    // math_add: 茶色の角丸長方形、左右にスロット (楕円) と中央に "+"
    return `
<svg class="basics-tutorial-hint-block" viewBox="0 0 130 34" xmlns="http://www.w3.org/2000/svg" aria-label="足し算のブロック">
  <rect x="1" y="1" width="128" height="32" rx="8" ry="8"
    fill="#a97a4b" stroke="#7a5030" stroke-width="1.5"/>
  <rect x="8" y="8" width="42" height="18" rx="9" ry="9"
    fill="#e6d3b8" stroke="#7a5030" stroke-width="1"/>
  <text x="65" y="23" text-anchor="middle" font-family="sans-serif"
    font-size="18" font-weight="900" fill="#ffffff">+</text>
  <rect x="80" y="8" width="42" height="18" rx="9" ry="9"
    fill="#e6d3b8" stroke="#7a5030" stroke-width="1"/>
</svg>`;
  }

  // ステップごとの短いヒント (待機中の上部バナーに表示)
  // ブロック名の位置に SVG を差し込んでビジュアル的に理解しやすくする。
  function _shortHintForStep(step) {
    if (!step) return { html: '↑ 操作してみて！' };
    const B_NUM = _svgBlockNumber();
    const B_ADD = _svgBlockAdd();
    const map = {
      'step_pull_number_1':  `左側の基本から${B_NUM} のブロックを引き出してみよう！`,
      'step_pull_number_2':  `もう1つ基本から ${B_NUM} のブロックを引き出そう！`,
      'step_pull_add':       `同じく基本から${B_ADD} 足し算のブロックを引き出そう！`,
      'step_connect_blocks': `${B_NUM} のブロックを ${B_ADD} の穴にはめよう！`,
      'step_delete_block':   `どれかのブロックをゴミ箱にドラッグして削除しよう！`,
    };
    return { html: map[step.id] || '↑ 操作してみて！' };
  }

  // ============================================
  // 公開 API
  // ============================================
  window.startBasicsTutorial = function (onComplete) {
    // 動的シーン登録
    registerAllScenes();

    currentState = {
      stepIndex: 0,
      phase: 'intro',
      onComplete: onComplete || function () {},
    };

    // フリエ基礎チュートリアル中はパル常駐を隠す (CSS で対応)
    document.body.classList.add('furie-tutorial-active');

    // Blockly イベント監視
    if (window.workspace && typeof window.workspace.addChangeListener === 'function') {
      workspaceListener = handleWorkspaceEvent;
      window.workspace.addChangeListener(workspaceListener);
    }

    startStep(0);
  };

  window.abortBasicsTutorial = function () {
    if (workspaceListener && window.workspace) {
      window.workspace.removeChangeListener(workspaceListener);
      workspaceListener = null;
    }
    window.closeCharacterDialog();
    hideWaitingHint();
    // パル常駐を再表示
    document.body.classList.remove('furie-tutorial-active');
    currentState = null;
  };

  // 現在フリエ基礎チュートリアル進行中かどうかを外部から確認できるようにする
  window.isBasicsTutorialActive = function () {
    return currentState !== null;
  };
})();