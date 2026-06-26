// ===== app.js =====
// 司令塔（ボタンのクリック監視と、他のファイルへの指示出しを担当します）

window.hasBoundEventListeners = false;

window.setupEventListeners = function() {
  if (window.hasBoundEventListeners) return;
  window.hasBoundEventListeners = true;

  // 🔄 リセットボタン
  const btnReset = document.getElementById('btn-reset');
  if (btnReset) {
    btnReset.addEventListener('click', async () => {
      window.currentStreak = 0;
      if (typeof window.updateStreakCounter === 'function') window.updateStreakCounter(false);
      // 【修正済】強制的に1に戻るバグを直し、現在のステージを正確に再読み込みします
      if (typeof window.loadStage === 'function') await window.loadStage(window.currentStageNumber);
    });
  }

  // 💡 答えボタン
  const btnAnswer = document.getElementById('btn-answer');
  if (btnAnswer) {
    btnAnswer.addEventListener('click', () => {
      if (!window.currentProblemData || !window.currentProblemData.answerState) {
        if (typeof window.showToast === 'function') window.showToast('まだ解答例はありません', false);
        return;
      }
      if (window.workspace) {
        window.workspace.clear();
        // problems/X.json の answerState（正解のブロック配置）を画面に展開
        Blockly.serialization.workspaces.load(window.currentProblemData.answerState, window.workspace);
        if (typeof window.forceWorkspaceLayoutSync === 'function') window.forceWorkspaceLayoutSync();
        if (typeof window.arrangeBlocks === 'function') window.arrangeBlocks();
        if (typeof window.showToast === 'function') window.showToast('解答例を表示しました');
      }
    });
  }

  // ✅ 正解をチェックボタン
  const btnSubmit = document.getElementById('btn-submit');
  if (btnSubmit) {
    btnSubmit.addEventListener('click', () => {
      if (!window.workspace) return;
      
      // math-logic.js が正しく読み込まれているかチェック
      if (typeof window.parseBlocksToAST !== 'function' || typeof window.validateProof !== 'function') {
        if (typeof window.showToast === 'function') window.showToast("<span style='color:red'>判定プログラム（math-logic.js）の準備ができていません</span>");
        return;
      }

      // ブロックを数式に変換して判定！
      const ast = window.parseBlocksToAST(window.workspace, window.mathGenerator);
      const validation = window.validateProof(ast, window.currentProblemData);

      if (validation.isValid) {
        // 【正解時の処理】
        window.currentStageSolved = true;
        window.currentStreak = (window.currentStreak || 0) + 1;
        if (typeof window.updateStreakCounter === 'function') window.updateStreakCounter(true);
        if (typeof window.playClearEffects === 'function') window.playClearEffects('CLEAR!');
        if (typeof window.showToast === 'function') window.showToast("<span style='color:#58cc02; font-size:1.2em;'>🎉 正解！完璧です！</span>", false);
        
        // クリア済みに登録（チュートリアル以外）
        if (typeof window.isTutorialStageId === 'function' && !window.isTutorialStageId(window.currentStageNumber)) {
           if (!Array.isArray(window.clearedStages)) window.clearedStages = [];
           const numStage = Number(window.currentStageNumber);
           if (numStage && (!window.clearedStages.includes(numStage))) {
             window.clearedStages.push(numStage);
             localStorage.setItem('s', JSON.stringify(window.clearedStages));
           }
        }
        
        btnSubmit.style.display = 'none'; // ボタンを隠す
        window.scheduleAutoAdvanceAfterClear(); // 次のステージへ

      } else {
        // 【不正解時の処理】
        window.currentStreak = 0;
        if (typeof window.updateStreakCounter === 'function') window.updateStreakCounter(false);
        const userMessage = typeof window.getErrorMessage === 'function' ? window.getErrorMessage(validation.errorCode, validation.errorStepIndex, validation.suggestions) : '式が正しくありません';
        if (typeof window.showToast === 'function') window.showToast(`<span style='color:#ff4b4b'>${userMessage}</span>`);
      }
    });
  }

  // 🔙 戻るボタン
  const btnBack = document.getElementById('btn-back');
  if (btnBack) {
    btnBack.addEventListener('click', () => {
      if (typeof window.routeToTarget === 'function') window.routeToTarget();
    });
  }

  // 🎮 エントランス（最初の画面）のボタン
  document.getElementById('btn-entry-start')?.addEventListener('click', () => {
    document.getElementById('game-entrance')?.classList.add('show-choices');
  });
  document.getElementById('btn-entry-tutorial')?.addEventListener('click', async () => {
    if (typeof window.closeGameEntrance === 'function') window.closeGameEntrance();
    if (typeof window.transitionToStage === 'function') await window.transitionToStage('0-1');
  });
  document.getElementById('btn-entry-map')?.addEventListener('click', async () => {
    if (typeof window.closeGameEntrance === 'function') window.closeGameEntrance();
    if (typeof window.transitionToStage === 'function') await window.transitionToStage(1);
  });
};

// --- 正解後に自動で次のステージに進む機能 ---
window.scheduleAutoAdvanceAfterClear = function() {
  setTimeout(async () => {
     if (typeof window.isTutorialStageId === 'function' && window.isTutorialStageId(window.currentStageNumber)) {
        // チュートリアル進行
        const idx = window.TUTORIAL_STAGE_IDS.indexOf(window.currentStageNumber);
        if (idx >= 0 && idx < window.TUTORIAL_STAGE_IDS.length - 1) {
            await window.transitionToStage(window.TUTORIAL_STAGE_IDS[idx + 1]);
        } else {
            // チュートリアル終了 → 本編ステージ1へ
            await window.transitionToStage(1);
        }
     } else {
        // 通常ステージ進行
        await window.transitionToStage(Number(window.currentStageNumber) + 1);
     }
  }, 2000); // 正解の2秒後に自動遷移
};

// --- アプリの起動処理 ---
window.bootApplication = function() {
  window.setupEventListeners();
  
  const entrance = document.getElementById('game-entrance');
  if (entrance && !entrance.classList.contains('hidden')) {
    if (typeof window.setAppBackgroundByKey === 'function') window.setAppBackgroundByKey('title');
  } else {
    if (typeof window.routeToTarget === 'function') window.routeToTarget();
  }
};

// HTMLの読み込みが完了したら起動！
document.addEventListener('DOMContentLoaded', () => {
  window.bootApplication();
});