// ============================================
// character-scenes.js
// シーンごとの流れ制御。
// character-dialog.js は「吹き出しを表示する」だけの汎用エンジンで、
// このファイルは「モード選択画面を開いたら intro_mode_select を再生し、
// 選択肢に応じてゲームを開始する」といった、シーンとゲームフローの結合を担当する。
// 新しいシーン (例: ステージクリア時、正解時など) を足すときはこのファイルに
// 対応するアクションを追加する。
// ============================================

/**
 * シーン選択肢の actionId → 実際に走らせる関数のマッピング。
 * CHARACTER_SCENES 側で actionId を書くだけで挙動を差し替えられるようにするため、
 * ここで一括管理する。
 *
 * 現状のモード選択については、既存の入口ボタン (btn-entry-tutorial / btn-entry-map)
 * のクリックハンドラをそのまま利用する。これにより、既存の説明動画モーダルや
 * サイバー系遷移演出などの副作用を維持できる。
 */
window.CHARACTER_SCENE_ACTIONS = {
  // モード選択: チュートリアルを選んだ → キャラの説明シーンに入る
  // 2回目以降は tutorial_intro をスキップして、直接パル登場フェーズへ
  start_tutorial: async function() {
    if (window._tutorialIntroSeen) {
      // 2回目以降: 説明省略、パルの短縮登場だけ
      window.CHARACTER_SCENE_ACTIONS.confirm_tutorial_start();
      return;
    }
    window.startCharacterDialog('tutorial_intro', {
      onChoiceSelected: (actionId) => {
        window._tutorialIntroSeen = true;
        const action = window.CHARACTER_SCENE_ACTIONS[actionId];
        if (typeof action === 'function') action();
      },
    });
  },
  // tutorial_intro の確認ボタン → パルの自己紹介を挟んでからチュートリアル開始
  // 2回目以降のパルは intro_pal_repeat (短縮版)
  confirm_tutorial_start: function() {
    window._pendingStartAction = 'exec_tutorial_start';
    const palSceneId = window._palIntroSeen ? 'intro_pal_repeat' : 'intro_pal';
    window.startCharacterDialog(palSceneId, {
      onChoiceSelected: (actionId) => {
        const action = window.CHARACTER_SCENE_ACTIONS[actionId];
        if (typeof action === 'function') action();
      },
    });
  },
  // モード選択: 本編1に直接飛ぶ
  // 初回: フリエのブリーフィング (使い方紹介) を挟む
  // 2回目以降: 既にパル intro を見ているので短縮版パル (よし始めよう) だけ
  start_main_stage_1: function() {
    window._pendingStartAction = 'exec_main_stage_1';
    if (window._palIntroSeen) {
      // 2 回目以降は intro_pal_repeat (よし始めよう 1 行)
      window.startCharacterDialog('intro_pal_repeat', {
        onChoiceSelected: (actionId) => {
          const action = window.CHARACTER_SCENE_ACTIONS[actionId];
          if (typeof action === 'function') action();
        },
      });
    } else {
      // 初回: 「紹介聞く/スキップ」の選択肢
      window.startCharacterDialog('intro_main_briefing_ask', {
        onChoiceSelected: (actionId) => {
          const action = window.CHARACTER_SCENE_ACTIONS[actionId];
          if (typeof action === 'function') action();
        },
      });
    }
  },

  // ブリーフィング: 「紹介聞く」を選んだ → フリエ引き出し説明シーン
  briefing_show_furie: function() {
    window.startCharacterDialog('intro_main_briefing_furie', {
      onChoiceSelected: (actionId) => {
        const action = window.CHARACTER_SCENE_ACTIONS[actionId];
        if (typeof action === 'function') action();
      },
    });
  },
  // ブリーフィング: フリエ引き出し説明終了 → パル (intro_pal) の機能紹介へ
  briefing_show_pal: function() {
    window.startCharacterDialog('intro_pal', {
      onChoiceSelected: (actionId) => {
        const action = window.CHARACTER_SCENE_ACTIONS[actionId];
        if (typeof action === 'function') action();
      },
    });
  },
  // ブリーフィング: 「スキップ」を選んだ → 直接パル intro (機能紹介はやる) へ
  // ※パルの機能紹介は「知らないと使えない」ものなので、スキップしても表示する。
  briefing_skip: function() {
    window.startCharacterDialog('intro_pal', {
      onChoiceSelected: (actionId) => {
        const action = window.CHARACTER_SCENE_ACTIONS[actionId];
        if (typeof action === 'function') action();
      },
    });
  },
  // パルの自己紹介終了 → 保留されていた開始アクションを実行
  confirm_pal_intro: function() {
    window._palIntroSeen = true; // 次回以降は短縮版に
    const pending = window._pendingStartAction;
    window._pendingStartAction = null;
    if (pending === 'exec_tutorial_start') {
      window.CHARACTER_SCENE_ACTIONS.exec_tutorial_start();
    } else if (pending === 'exec_main_stage_1') {
      window.CHARACTER_SCENE_ACTIONS.exec_main_stage_1();
    } else {
      window.closeCharacterDialog();
    }
  },

  // ==================================
  // 不正解・ギブアップフロー
  // ==================================
  // 不正解モーダルで「もう一度」→ 単に閉じるだけ、ユーザーは自由に再挑戦できる
  incorrect_retry: function() {
    window.closeCharacterDialog();
  },
  // 不正解モーダルで「解説を見る」 → answer_reveal_intro シーンへ
  incorrect_giveup: function() {
    window.closeCharacterDialog();
    setTimeout(() => {
      window.startCharacterDialog('answer_reveal_intro', {
        onChoiceSelected: (actionId) => {
          const action = window.CHARACTER_SCENE_ACTIONS[actionId];
          if (typeof action === 'function') action();
        },
      });
    }, 300);
  },
  // 「あきらめる」ボタン確認: 「もう少し頑張る」 → 閉じるだけ
  giveup_cancel: function() {
    window.closeCharacterDialog();
  },
  // 「あきらめる」ボタン確認: 「あきらめる」 → answer_reveal_intro シーンへ
  giveup_confirm: function() {
    window.closeCharacterDialog();
    setTimeout(() => {
      window.startCharacterDialog('answer_reveal_intro', {
        onChoiceSelected: (actionId) => {
          const action = window.CHARACTER_SCENE_ACTIONS[actionId];
          if (typeof action === 'function') action();
        },
      });
    }, 300);
  },
  // 答え表示: 正解の骨格をワークスペースに読み込み、ギブアップ済みフラグを立てる
  answer_reveal_show: function() {
    window.closeCharacterDialog();
    // 実際の解答表示・状態記録は app.js 側の関数に任せる (workspace 操作込みなので)
    if (typeof window.revealAnswerAndMarkGiveUp === 'function') {
      window.revealAnswerAndMarkGiveUp();
    }
  },
  // パルの解説後、次のステージへ進む
  answer_reveal_next_stage: function() {
    console.log('[character-scenes] answer_reveal_next_stage 発火, currentStageNumber=', window.currentStageNumber);
    window.closeCharacterDialog();
    // 通常の「次ステージへ自動遷移」処理を発火
    if (typeof window.advanceToNextStage === 'function') {
      window.advanceToNextStage();
    } else if (typeof window.scheduleAutoAdvanceAfterClear === 'function') {
      window.scheduleAutoAdvanceAfterClear();
    }
  },
  // 実際のチュートリアル開始
  // 通常のフローで 0-1 に遷移し、ワークスペース初期化後に基礎チュートリアルを乗せる。
  // 基礎チュートリアル中は公式アンロック演出を保留し、完了後に発火する。
  exec_tutorial_start: function() {
    window.closeCharacterDialog();

    // 動画モーダルは廃止済み
    const originalShow = window.showTutorialIntroModal;
    window.showTutorialIntroModal = function() { return false; };
    try {
      document.getElementById('btn-entry-tutorial')?.click();
    } finally {
      window.showTutorialIntroModal = originalShow;
    }

    // 2回目以降は基礎チュートリアルを行わない
    if (window._basicsTutorialSeen) return;
    if (typeof window.startBasicsTutorial !== 'function') {
      console.warn('[character-scenes] startBasicsTutorial が未定義');
      return;
    }

    // 「基礎チュートリアル中」フラグを立てる。
    // これが true の間、公式アンロック演出は保留される (app-unlock.js が確認する)。
    window._basicsTutorialActive = true;
    document.body.classList.add('basics-tutorial-active');

    // ワークスペースの準備完了を polling で待って基礎チュートリアルを起動する
    const startPollingAt = Date.now();
    const POLL_INTERVAL_MS = 100;
    const MAX_WAIT_MS = 10000;
    const tryStart = () => {
      if (window.workspace) {
        window._basicsTutorialSeen = true;
        console.log('[character-scenes] workspace 検出、シャッター開き待ち');
        // シャッター (cyber-transition) が完全に開き終わってから basics-tutorial を起動する。
        // これがないと、シャッターが閉じている最中にフリエが喋り始めてしまい演出が壊れる。
        const startBasicsAfterShutter = () => {
          console.log('[character-scenes] シャッター完了、basics-tutorial 起動');
          window.startBasicsTutorial(function () {
            console.log('[character-scenes] 基礎チュートリアル完了、パルチュートリアル起動');
            // フリエ基礎完了 → パルチュートリアルへ
            if (typeof window.startPalTutorial === 'function') {
              window.startPalTutorial('0-1', function () {
                console.log('[character-scenes] パルチュートリアル完了');
                window._basicsTutorialActive = false;
                document.body.classList.remove('basics-tutorial-active');
                // 保留されていた公式アンロック演出を発火。
                // シャッターが下り始めるまで少し遅延させる (waitShutterThen が正しく検知するように)。
                setTimeout(() => {
                  if (typeof window.flushPendingFormulaUnlock === 'function') {
                    window.flushPendingFormulaUnlock();
                  }
                }, 500);
              });
            } else {
              // パルチュートリアルが読み込まれていない場合はそのままアンロックへ
              console.warn('[character-scenes] startPalTutorial が未定義');
              window._basicsTutorialActive = false;
              document.body.classList.remove('basics-tutorial-active');
              if (typeof window.flushPendingFormulaUnlock === 'function') {
                window.flushPendingFormulaUnlock();
              }
            }
          });
        };
        // シャッター待ちヘルパが公開されていればそれを使い、なければ即起動 (フォールバック)
        if (typeof window.waitShutterThen === 'function') {
          window.waitShutterThen(startBasicsAfterShutter);
        } else {
          startBasicsAfterShutter();
        }
      } else if (Date.now() - startPollingAt < MAX_WAIT_MS) {
        setTimeout(tryStart, POLL_INTERVAL_MS);
      } else {
        console.warn('[character-scenes] workspace の準備を待ちきれず basics-tutorial を諦めた');
        window._basicsTutorialActive = false;
        document.body.classList.remove('basics-tutorial-active');
      }
    };
    setTimeout(tryStart, POLL_INTERVAL_MS);
  },
  // 実際の本編1開始
  exec_main_stage_1: function() {
    window.closeCharacterDialog();
    document.getElementById('btn-entry-map')?.click();
  },
  // 汎用: 単にダイアログを閉じる
  close_dialog: function() {
    window.closeCharacterDialog();
  },
};

/**
 * モード選択画面をキャラダイアログで開く。
 * 2 回目以降のセッション内呼び出しでは、フリエ・パルとも短縮版シーンを使う。
 */
window.openModeSelectWithCharacter = function() {
  const sceneId = window._modeSelectSeen ? 'intro_mode_select_repeat' : 'intro_mode_select';
  window.startCharacterDialog(sceneId, {
    onChoiceSelected: (actionId) => {
      window._modeSelectSeen = true;
      const action = window.CHARACTER_SCENE_ACTIONS[actionId];
      if (typeof action === 'function') action();
      else console.warn('[character-scenes] unknown actionId:', actionId);
    },
  });
};

/**
 * 公式アンロック時にキャラダイアログで祝う。
 * 既存の formula-unlock-modal の代わりに呼び出される。
 * @param {object} context
 *   context.formulaLabel: 表示する公式名 ("公式① sin²θ + cos²θ = 1" など)
 */
window.openFormulaUnlockedScene = function(context) {
  window.startCharacterDialog('formula_unlocked', {
    context: context || {},
    onChoiceSelected: (actionId) => {
      const action = window.CHARACTER_SCENE_ACTIONS[actionId];
      if (typeof action === 'function') action();
    },
  });
};

/**
 * エントランスから抜けたときに、キャラダイアログの状態もリセットする。
 * (現状は closeCharacterDialog を呼ぶだけ)
 */
window.resetCharacterScenesOnEntranceClose = function() {
  window.closeCharacterDialog();
  const entranceCard = document.querySelector('.entrance-card');
  if (entranceCard) entranceCard.classList.remove('hidden');
};