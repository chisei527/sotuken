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
        Blockly.serialization.workspaces.load(window.currentProblemData.answerState, window.workspace);
        if (typeof window.forceWorkspaceLayoutSync === 'function') window.forceWorkspaceLayoutSync();
        if (typeof window.arrangeBlocks === 'function') window.arrangeBlocks();
        if (typeof window.showToast === 'function') window.showToast('解答例を表示しました');
      }
    });
  }

  // 🛠️ ガイド機能 ON/OFF ボタン
  const btnOverwrite = document.getElementById('btn-overwrite-permission');
  if (btnOverwrite) {
    btnOverwrite.addEventListener('click', () => {
      const isOff = btnOverwrite.classList.contains('off');
      if (isOff) {
        btnOverwrite.classList.remove('off');
        btnOverwrite.classList.add('on');
        btnOverwrite.textContent = 'ガイド機能: ON';
        if (typeof window.showToast === 'function') window.showToast('ガイド機能を ON にしました');
      } else {
        btnOverwrite.classList.remove('on');
        btnOverwrite.classList.add('off');
        btnOverwrite.textContent = 'ガイド機能: OFF';
        if (typeof window.showToast === 'function') window.showToast('ガイド機能を OFF にしました');
      }
      
      if (window.workspace && window.currentProblemData) {
        window.workspace.clear();
        if (window.currentProblemData.initialState) {
          Blockly.serialization.workspaces.load(window.currentProblemData.initialState, window.workspace);
        }
        if (typeof window.applyConditionalInitialStateGeneration === 'function') {
          window.applyConditionalInitialStateGeneration(window.workspace);
        }
        if (typeof window.forceWorkspaceLayoutSync === 'function') window.forceWorkspaceLayoutSync();
        if (typeof window.arrangeBlocks === 'function') window.arrangeBlocks();
      }
    });
  }

  // ✅ 正解をチェックボタン
  const btnSubmit = document.getElementById('btn-submit');
  if (btnSubmit) {
    btnSubmit.addEventListener('click', () => {
      if (!window.workspace) return;
      if (typeof window.parseBlocksToAST !== 'function' || typeof window.validateProof !== 'function') {
        if (typeof window.showToast === 'function') window.showToast("<span style='color:red'>判定プログラム（math-logic.js）の準備ができていません</span>");
        return;
      }

      const ast = window.parseBlocksToAST(window.workspace, window.mathGenerator);
      const validation = window.validateProof(ast, window.currentProblemData);

      if (validation.isValid) {
        window.currentStageSolved = true;
        window.currentStreak = (window.currentStreak || 0) + 1;
        if (typeof window.updateStreakCounter === 'function') window.updateStreakCounter(true);
        if (typeof window.showToast === 'function') window.showToast("<span style='color:#58cc02; font-size:1.2em;'>🎉 正解！完璧です！</span>", false);
        

        if (typeof window.playClearEffect === 'function') {
          window.playClearEffect();
        } else {
          // 青い波紋エフェクト
          const ripple = document.createElement('div');
          ripple.className = 'success-ripple';
          document.body.appendChild(ripple);
          
          // CLEAR! スタンプエフェクト
          const stamp = document.createElement('div');
          stamp.className = 'clear-stamp-effect';
          stamp.textContent = 'CLEAR!';
          document.body.appendChild(stamp);
          
          // アニメーションが終わったらお掃除
          setTimeout(() => {
            if (ripple.parentNode) ripple.remove();
            if (stamp.parentNode) stamp.remove();
          }, 1500);
        }
        
        if (typeof window.isTutorialStageId === 'function' && !window.isTutorialStageId(window.currentStageNumber)) {
           const numStage = Number(window.currentStageNumber);
           if (numStage && (!window.clearedStages.includes(numStage))) {
             window.clearedStages.push(numStage);
             localStorage.setItem('s', JSON.stringify(window.clearedStages));
           }
        }
        
        btnSubmit.style.display = 'none';
        window.scheduleAutoAdvanceAfterClear();

      } else {
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

  // 🎮 エントランス（最初の画面）の画面タップで遷移
  const entrance = document.getElementById('game-entrance');
  if (entrance) {
    entrance.addEventListener('click', () => {
      if (!entrance.classList.contains('show-choices')) {
        entrance.classList.add('show-choices');
        if (typeof window.setAppBackgroundByKey === 'function') window.setAppBackgroundByKey('stage');
      }
    });
  }

  document.getElementById('btn-entry-tutorial')?.addEventListener('click', async (e) => {
    e.stopPropagation(); // 画面全体クリックの連動を防止
    const transitionLayer = document.getElementById('cyber-transition');
    const bootText = document.getElementById('cyber-boot-text');
    
    if (transitionLayer) {
      if (bootText) bootText.textContent = 'INITIALIZING LEARNING PROTOCOL...';
      transitionLayer.classList.add('blocking', 'active', 'booting');
    }

    setTimeout(async () => {
      if (typeof window.closeGameEntrance === 'function') window.closeGameEntrance();
      if (typeof window.transitionToStage === 'function') await window.transitionToStage('0-1');
      
      setTimeout(() => {
        if (transitionLayer) {
          transitionLayer.classList.remove('active', 'booting', 'blocking');
        }
      }, 400);
    }, 900);
  });

  document.getElementById('btn-entry-map')?.addEventListener('click', async (e) => {
    e.stopPropagation(); // 画面全体クリックの連動を防止
    localStorage.setItem('tutorial_seen', 'true');
    const transitionLayer = document.getElementById('cyber-transition');
    const bootText = document.getElementById('cyber-boot-text');
    
    if (transitionLayer) {
      if (bootText) bootText.textContent = 'CONNECTING TO MATHEMATICAL CORE...';
      transitionLayer.classList.add('blocking', 'active', 'booting');
    }

    setTimeout(async () => {
      if (typeof window.closeGameEntrance === 'function') window.closeGameEntrance();
      if (typeof window.transitionToStage === 'function') await window.transitionToStage(1);
      
      setTimeout(() => {
        if (transitionLayer) {
          transitionLayer.classList.remove('active', 'booting', 'blocking');
        }
      }, 400);
    }, 900);
  });
};

// --- 正解後に自動で次のステージに進む機能 ---
window.scheduleAutoAdvanceAfterClear = function() {
  const transitionLayer = document.getElementById('cyber-transition');

  if (transitionLayer) transitionLayer.classList.add('blocking');

  setTimeout(() => {
     if (transitionLayer) transitionLayer.classList.add('active');

     setTimeout(async () => {
         if (transitionLayer) transitionLayer.classList.add('flash');

         let nextStage = 1;
         if (typeof window.isTutorialStageId === 'function' && window.isTutorialStageId(window.currentStageNumber)) {
            const idx = window.TUTORIAL_STAGE_IDS.indexOf(window.currentStageNumber);
            if (idx >= 0 && idx < window.TUTORIAL_STAGE_IDS.length - 1) {
                nextStage = window.TUTORIAL_STAGE_IDS[idx + 1];
            }
         } else {
            nextStage = Number(window.currentStageNumber) + 1;
         }
         await window.transitionToStage(nextStage);

         setTimeout(() => {
            if (transitionLayer) {
              transitionLayer.classList.remove('flash');
              transitionLayer.classList.remove('active');
              transitionLayer.classList.remove('blocking'); 
            }
         }, 300);

     }, 400);
  }, 800); 
};

// --- アプリの起動処理 ---
window.bootApplication = function() {
  window.setupEventListeners();
  if (typeof window.setupGuideButton === 'function') window.setupGuideButton();

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