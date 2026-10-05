// ===== app.js =====
// 司令塔（ボタンのクリック監視と、他のファイルへの指示出しを担当します）

// hasBoundEventListeners の初期化は app-state.js。ここでの再代入は削除。
window.setupEventListeners = function() {
  if (window.hasBoundEventListeners) return;
  window.hasBoundEventListeners = true;

  // ⬅️➡️ 前の問題 / 次の問題ボタン
  const btnPrev = document.getElementById('btn-prev-stage');
  const btnNext = document.getElementById('btn-next-stage');
  if (btnPrev) {
    btnPrev.addEventListener('click', async () => {
      const prev = window.getPrevStageId ? window.getPrevStageId(window.currentStageNumber) : null;
      if (prev !== null && typeof window.transitionToStage === 'function') {
        await window.transitionToStage(prev);
      }
    });
  }
  if (btnNext) {
    btnNext.addEventListener('click', async () => {
      const next = window.getNextStageId ? window.getNextStageId(window.currentStageNumber) : null;
      if (next !== null && typeof window.transitionToStage === 'function') {
        await window.transitionToStage(next);
      }
    });
  }

  // 🔄 リセットボタン
  const btnReset = document.getElementById('btn-reset');
  if (btnReset) {
    btnReset.addEventListener('click', async () => {
      window.currentStreak = 0;
      window.AppLog?.reset();
      if (typeof window.updateStreakCounter === 'function') window.updateStreakCounter(false);
      if (typeof window.loadStage === 'function') await window.loadStage(window.currentStageNumber);
    });
  }

  // 💡 答えボタン
  // ❌ あきらめるボタン (元 btn-answer)
  // 押下 → フリエが確認 → 「あきらめる」を選ぶと初めて答えが表示される
  const btnAnswer = document.getElementById('btn-answer');
  if (btnAnswer) {
    btnAnswer.addEventListener('click', () => {
      if (!window.currentProblemData || !window.currentProblemData.answerState) {
        if (typeof window.showToast === 'function') window.showToast('まだ解答例はありません', false);
        return;
      }
      // フリエの確認シーンを開く
      window.startCharacterDialog('give_up_confirm', {
        onChoiceSelected: (actionId) => {
          const action = window.CHARACTER_SCENE_ACTIONS[actionId];
          if (typeof action === 'function') action();
        },
      });
    });
  }

  // 答え表示 + ギブアップ済みフラグを立てる (character-scenes から呼ばれる)
  window.revealAnswerAndMarkGiveUp = function () {
    if (!window.currentProblemData || !window.currentProblemData.answerState || !window.workspace) return;
    window.AppLog?.giveup(); // 答えで上書きされる前に、その時点のブロックを記録する
    // 「もう一度」ボタンで復元できるよう、あきらめる直前の workspace 状態を保存する。
    try {
      window._preGiveUpWorkspaceState = Blockly.serialization.workspaces.save(window.workspace);
    } catch (err) {
      console.warn('[app] あきらめる前の workspace 保存に失敗:', err);
      window._preGiveUpWorkspaceState = null;
    }
    // ワークスペースを一旦クリアして answer をロード
    try {
      if (typeof window.workspace.setScale === 'function') window.workspace.setScale(1);
      if (typeof window.workspace.scroll === 'function') window.workspace.scroll(0, 0);
    } catch (_) { /* 失敗してもクリアは続行 */ }
    window.workspace.clear();
    Blockly.serialization.workspaces.load(window.currentProblemData.answerState, window.workspace);
    if (typeof window.forceWorkspaceLayoutSync === 'function') window.forceWorkspaceLayoutSync();
    if (typeof window.arrangeBlocks === 'function') window.arrangeBlocks();

    // ギブアップ済みフラグを永続化する。
    if (typeof window.isTutorialStageId === 'function' && !window.isTutorialStageId(window.currentStageNumber)) {
      const numStage = Number(window.currentStageNumber);
      if (numStage) {
        if (!(window.giveUppedStages || []).includes(numStage)) {
          window.giveUppedStages = window.giveUppedStages || [];
          window.giveUppedStages.push(numStage);
          window.AppStorage.setJSON('gu', window.giveUppedStages);
          console.log('[app] ギブアップ記録:', numStage, window.giveUppedStages);
        }
        // ギブアップは clearedStages には入れない。
        // clearedStages は「自力クリア」だけの記録として扱う（app-state.js のコメント通り）。
        // マップ側の解放判定は isStageUnlocked() が giveUppedStages も見るようになっている。
      }
    }

    // 「正解をチェック」を隠す (実質クリア状態)
    const btnSubmit = document.getElementById('btn-submit');
    if (btnSubmit) btnSubmit.style.display = 'none';

    // リセット・あきらめる (残ってれば正解チェックも) の操作を無効化する。
    // 答え表示中に押されると流れが壊れるため。
    ['btn-reset', 'btn-answer', 'btn-submit'].forEach((id) => {
      const b = document.getElementById(id);
      if (b) {
        b.disabled = true;
        b.classList.add('pal-tutorial-disabled');
      }
    });

    // ワークスペースも読み取り専用にする (ブロックを動かせない、ゴミ箱に落とせない)
    document.body.classList.add('answer-reveal-locked');

    // 「解説を聞く」ボタンを画面中央下寄りに表示する。
    window.showListenExplainButton();
  };

  // 「解説を聞く」ボタンを画面下中央に生成して表示する
  window.showListenExplainButton = function () {
    // 既に存在していたら再利用 (二重表示防止)
    let btn = document.getElementById('btn-listen-explain');
    if (!btn) {
      btn = document.createElement('button');
      btn.id = 'btn-listen-explain';
      btn.type = 'button';
      btn.className = 'listen-explain-btn';
      btn.innerHTML = '解説を聞く <span class="listen-explain-arrow">▶</span>';
      document.body.appendChild(btn);
      btn.addEventListener('click', () => {
        window.hideListenExplainButton();
        // パルによる公式解説シーンを開く
        const requiredFormulas = (window.currentProblemData && window.currentProblemData.requiredFormulas) || [];
        // 盤面には今まさに模範解答が並んでいるので、そこから実際の変形手順を読み取る。
        // これを渡すことで、パルが「この問題で実際に何をしたか」を
        // 具体的な式つきで説明できるようになる（以前は公式の一般論だけだった）。
        let proofSteps = [];
        try {
          if (typeof window.parseBlocksToAST === 'function' && window.workspace) {
            proofSteps = window.parseBlocksToAST(window.workspace) || [];
          }
        } catch (err) {
          console.warn('[app] 解説用の手順抽出に失敗、公式の一般説明にフォールバック:', err);
        }
        window.startCharacterDialog('answer_reveal_pal_explain', {
          context: { requiredFormulas, proofSteps },
          onChoiceSelected: (actionId) => {
            const action = window.CHARACTER_SCENE_ACTIONS[actionId];
            if (typeof action === 'function') action();
          },
        });
        // 解説モード用のクラスを付与 (盤面が見える控えめ配置に切替)
        requestAnimationFrame(() => {
          const host = document.getElementById('character-dialog-host');
          if (host) host.classList.add('answer-reveal-mode');
          window.syncRevealDockTop();
        });
        // 「次のステージへ」独立ボタンも同時に表示
        window.showNextStageButton();
      });
    }
    // フェードイン
    btn.classList.remove('hidden');
    requestAnimationFrame(() => btn.classList.add('show'));
  };

  /**
   * 解説パネルの上端を、実際のヘッダーと問題文の下端に合わせる。
   *
   * 固定値(92px)で決め打ちすると、問題文が2行になったり画面サイズが変わったときに
   * パネルが問題文に重なったり、逆に不自然に離れたりする。
   * 実測してCSS変数に流し込むことで、盤面と説明が同じ高さから始まる
   * きれいな2カラムになる。
   */
  window.syncRevealDockTop = function () {
    const problemPanel = document.getElementById('i');
    const header = document.getElementById('h');
    const anchor = problemPanel || header;
    if (!anchor) return;
    const bottom = Math.round(anchor.getBoundingClientRect().bottom);
    document.documentElement.style.setProperty('--reveal-dock-top', `${bottom + 12}px`);
  };

  // 画面サイズが変わったら測り直す
  window.addEventListener('resize', () => {
    const host = document.getElementById('character-dialog-host');
    if (host && host.classList.contains('answer-reveal-mode')) window.syncRevealDockTop();
  });

  // 「解説を聞く」ボタンを非表示にする
  window.hideListenExplainButton = function () {
    const btn = document.getElementById('btn-listen-explain');
    if (!btn) return;
    btn.classList.remove('show');
    setTimeout(() => btn.classList.add('hidden'), 220);
  };

  // パル解説モード中の独立ボタン群 (「もう一度」「次の問題へ」) を表示
  // 「もう一度」: あきらめる前の workspace 状態を復元してプレイ再開
  // 「次の問題へ」: 通常の遷移 (最終ステージなら「マップへ」、全クリなら「本編クリア！🎉」)
  window.showNextStageButton = async function () {
    // グループコンテナを生成 (2ボタンを画面下中央に横並び)
    let container = document.getElementById('post-explain-button-group');
    if (!container) {
      container = document.createElement('div');
      container.id = 'post-explain-button-group';
      container.className = 'post-explain-button-group';

      // 「もう一度」ボタン (左)
      const btnRetry = document.createElement('button');
      btnRetry.id = 'btn-retry-stage';
      btnRetry.type = 'button';
      btnRetry.className = 'post-explain-btn retry-btn';
      btnRetry.innerHTML = '<span class="post-explain-arrow">↻</span> もう一度';
      btnRetry.addEventListener('click', () => {
        window.hideNextStageButton();
        window.closeCharacterDialog();
        // あきらめる前の workspace 状態を復元
        if (window._preGiveUpWorkspaceState && window.workspace) {
          try {
            window.workspace.clear();
            Blockly.serialization.workspaces.load(window._preGiveUpWorkspaceState, window.workspace);
            if (typeof window.forceWorkspaceLayoutSync === 'function') window.forceWorkspaceLayoutSync();
          } catch (err) {
            console.warn('[app] workspace 復元に失敗、通常の loadStage にフォールバック:', err);
            if (typeof window.loadStage === 'function') window.loadStage(window.currentStageNumber);
          }
        } else if (typeof window.loadStage === 'function') {
          // 保存がなかった場合は通常のリロード
          window.loadStage(window.currentStageNumber);
        }
        // ロック状態を解除してプレイ可能状態に戻す
        document.body.classList.remove('answer-reveal-locked');
        ['btn-reset', 'btn-answer', 'btn-submit'].forEach((id) => {
          const b = document.getElementById(id);
          if (b) {
            b.disabled = false;
            b.classList.remove('pal-tutorial-disabled');
            b.style.display = ''; // btn-submit の非表示解除
          }
        });
      });

      // 「次の問題へ」ボタン (右)
      const btnNext = document.createElement('button');
      btnNext.id = 'btn-next-stage-explain'; // ヘッダーのナビ「→」(btn-next-stage) とのID衝突を回避
      btnNext.type = 'button';
      btnNext.className = 'post-explain-btn next-stage-btn';
      btnNext.innerHTML = '次の問題へ <span class="post-explain-arrow">▶</span>';
      btnNext.addEventListener('click', () => {
        window.hideNextStageButton();
        window.closeCharacterDialog();
        if (typeof window.advanceToNextStage === 'function') window.advanceToNextStage();
      });

      container.appendChild(btnRetry);
      container.appendChild(btnNext);

      // 解説パネルが出ているときは、ボタン群をパネルの中に入れて1つのまとまりにする。
      // 以前は画面下に固定された別の島になっていて、パネルと離れて見えた。
      const revealBubble = document.querySelector('.character-dialog-host.answer-reveal-mode .character-dialog-bubble');
      if (revealBubble) {
        container.classList.add('in-reveal-panel');
        revealBubble.appendChild(container);
      } else {
        document.body.appendChild(container);
      }
    }

    // 「次の問題へ」ボタンのラベル切替: 最終ステージ判定を再実行
    const btnNext = document.getElementById('btn-next-stage-explain');
    if (btnNext) {
      const currentId = window.currentStageNumber;
      const isTutorialStage = typeof window.isTutorialStageId === 'function' && window.isTutorialStageId(currentId);
      // 初期化: 通常状態にリセット
      btnNext.classList.remove('final-stage', 'all-cleared');
      btnNext.innerHTML = '次の問題へ <span class="post-explain-arrow">▶</span>';
      if (!isTutorialStage) {
        const num = Number(currentId);
        if (Number.isFinite(num) && num >= 1) {
          try {
            // HEAD 非対応サーバーでも動くよう stageFileExists を使う
            const hasNext = (typeof window.stageFileExists === 'function')
              ? await window.stageFileExists(num + 1)
              : (await fetch(`problems/${num + 1}.json`, { method: 'HEAD' })).ok;
            if (!hasNext) {
              // 最終ステージ
              const total = window.MAIN_STAGE_TOTAL || num;
              const cleared = window.clearedStages || [];
              const allCleared = cleared.length >= total
                && Array.from({ length: total }, (_, i) => i + 1).every((s) => cleared.includes(s));
              if (allCleared) {
                btnNext.innerHTML = '本編クリア！🎉';
                btnNext.classList.add('all-cleared');
              } else {
                btnNext.innerHTML = 'マップへ <span class="post-explain-arrow">▶</span>';
                btnNext.classList.add('final-stage');
              }
            }
          } catch (err) {
            console.warn('[app] 最終ステージ判定でエラー:', err);
          }
        }
      }
    }

    // 生成済みだった場合も、解説パネルが出ていれば必ずパネル内へ入れ直す
    const bubbleNow = document.querySelector('.character-dialog-host.answer-reveal-mode .character-dialog-bubble');
    if (bubbleNow && container.parentElement !== bubbleNow) {
      container.classList.add('in-reveal-panel');
      bubbleNow.appendChild(container);
    }

    container.classList.remove('hidden');
    requestAnimationFrame(() => container.classList.add('show'));
  };

  window.hideNextStageButton = function () {
    const container = document.getElementById('post-explain-button-group');
    if (!container) return;
    container.classList.remove('show');
    setTimeout(() => {
      container.classList.add('hidden');
      // パネルは閉じると消えるので、ボタン群は body に退避させておく。
      // 次に解説を開いたときに改めてパネル内へ入れ直される。
      if (container.parentElement !== document.body) {
        container.classList.remove('in-reveal-panel');
        document.body.appendChild(container);
      }
    }, 220);
  };

  // パルの解説後に「次のステージへ」を押したときの実処理
  window.advanceToNextStage = function () {
    // 答え表示中のロックを解除
    document.body.classList.remove('answer-reveal-locked');
    // 解説モード用のクラスも解除 (キャラダイアログを閉じるので host は残ってないはずだが念のため)
    const host = document.getElementById('character-dialog-host');
    if (host) host.classList.remove('answer-reveal-mode', 'reveal-collapsed');
    ['btn-reset', 'btn-answer', 'btn-submit'].forEach((id) => {
      const b = document.getElementById(id);
      if (b) {
        b.disabled = false;
        b.classList.remove('pal-tutorial-disabled');
      }
    });

    // 次ステージ番号を計算
    let nextStageNumber = null;
    if (typeof window.getNextStageId === 'function') {
      nextStageNumber = window.getNextStageId(window.currentStageNumber);
    }
    if (nextStageNumber) {
      window.currentStageNumber = nextStageNumber;
      if (typeof window.loadStage === 'function') {
        window.loadStage(nextStageNumber);
      }
    } else {
      // 次のステージがない場合は、ステージ選択マップに戻す
      if (typeof window.routeToTarget === 'function') window.routeToTarget();
    }
  };

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

      // 第2引数の mathGenerator は未定義のまま渡していた残骸なので削除
      const ast = window.parseBlocksToAST(window.workspace);
      const validation = window.validateProof(ast, window.currentProblemData);
      window.AppLog?.submit(validation);

      if (validation.isValid) {
        window.currentStageSolved = true;
        window.currentStreak = (window.currentStreak || 0) + 1;
        if (typeof window.updateStreakCounter === 'function') window.updateStreakCounter(true);
        if (typeof window.showToast === 'function') window.showToast("<span style='color:#58cc02; font-size:1.2em;'>🎉 正解！完璧です！</span>", false);
        

        // app-effects.js が公開しているのは playClearEffects（複数形）。
        // 以前は playClearEffect（単数形）を見ていて常にフォールバックへ落ちていた。
        if (typeof window.playClearEffects === 'function') {
          window.playClearEffects('CLEAR!');
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
             window.AppStorage.setJSON('s', window.clearedStages);
           }
           // 過去にギブアップしていたステージを自力クリアしたら、ギブアップ済みリストから削除して「格上げ」する
           if (numStage && window.giveUppedStages && window.giveUppedStages.includes(numStage)) {
             window.giveUppedStages = window.giveUppedStages.filter((n) => n !== numStage);
             window.AppStorage.setJSON('gu', window.giveUppedStages);
             console.log('[app] ギブアップ済みから自力クリアに格上げ:', numStage);
           }
        }
        
        btnSubmit.style.display = 'none';
        window.scheduleAutoAdvanceAfterClear();

      } else {
        window.currentStreak = 0;
        if (typeof window.updateStreakCounter === 'function') window.updateStreakCounter(false);

        // 不正解時: フリエ登場「もう一度 / 解説を見る」の選択肢
        // ただし、そもそも「まだ穴が空いている」系のエラーの場合は従来通り toast だけ表示。
        // 「まだ穴が空いている／組み立て途中」系のエラーコード。
        // ここは validateProof(math-logic.js) が実際に返す ERROR_* と一致させること。
        // 以前は 'proof_incomplete' など存在しないコードを見ていたため、
        // 穴が空いているだけでも「不正解！」演出が出てしまっていた。
        const PARTIAL_ERROR_CODES = [
          'ERROR_NO_PROOF_BLOCK',      // 証明ブロックがない
          'ERROR_NO_CONCLUSION',       // 「よって」で終わっていない
          'ERROR_NO_TRANSFORM',        // 変形ブロックが1つもない
          'ERROR_EMPTY_INPUT',         // 空の穴がある
          'ERROR_FINAL_EMPTY',         // 結論の式が空
          'ERROR_CHAIN_EMPTY_INPUT',   // 連鎖の途中が空
          'ERROR_FORMULA_REQUIRED',    // 公式の穴が空
          'ERROR_EVALUATION',          // 繋がっていないブロックがある
          'ERROR_CHAIN_EVALUATION',
          'ERROR_PROBLEM_DATA_MISSING',// 問題データ側の不備（ユーザーのせいではない）
        ];
        const isPartial = !!validation && PARTIAL_ERROR_CODES.includes(validation.errorCode);
        if (!isPartial) {
          // 画面フラッシュ + 「不正解！」テキストのエフェクト
          const flash = document.createElement('div');
          flash.className = 'wrong-flash-overlay';
          document.body.appendChild(flash);
          const stamp = document.createElement('div');
          stamp.className = 'wrong-stamp-effect';
          stamp.textContent = '不正解！';
          document.body.appendChild(stamp);
          setTimeout(() => {
            if (flash.parentNode) flash.remove();
            if (stamp.parentNode) stamp.remove();
          }, 700);

          // エフェクト後にフリエの不正解確認シーンを開く
          setTimeout(() => {
            window.startCharacterDialog('incorrect_confirm', {
              onChoiceSelected: (actionId) => {
                const action = window.CHARACTER_SCENE_ACTIONS[actionId];
                if (typeof action === 'function') action();
              },
            });
          }, 700);
        } else {
          // 未完成の状態: 従来通り toast だけ
          const userMessage = typeof window.getErrorMessage === 'function' ? window.getErrorMessage(validation.errorCode, validation.errorStepIndex, validation.suggestions) : '式が正しくありません';
          if (typeof window.showToast === 'function') window.showToast(`<span style='color:#ff4b4b'>${userMessage}</span>`);
        }
      }
    });
  }

// 🔙 戻るボタン（ステージ選択ボタンの挙動制御）
  const btnBack = document.getElementById('btn-back');
  if (btnBack) {
    btnBack.addEventListener('click', () => {
      // チュートリアル (フリエ基礎 or パル) が進行中なら、まず両方を強制終了する
      const isBasicsActive = typeof window.isBasicsTutorialActive === 'function' && window.isBasicsTutorialActive();
      const isPalActive = typeof window.isPalTutorialActive === 'function' && window.isPalTutorialActive();
      if (isBasicsActive || isPalActive) {
        if (isBasicsActive && typeof window.abortBasicsTutorial === 'function') window.abortBasicsTutorial();
        if (isPalActive && typeof window.abortPalTutorial === 'function') window.abortPalTutorial();
        window._basicsTutorialActive = false;
        document.body.classList.remove('basics-tutorial-active');
        document.body.classList.remove('furie-tutorial-active');
        window._pendingUnlockFormulaIds = [];
      }

      // 💡 判定: 現在チュートリアルモード（0-1〜0-8）を実行中かどうか
      if (window.tutorialModeActive || (typeof window.isTutorialStageId === 'function' && window.isTutorialStageId(window.currentStageNumber))) {
        
        // 1. 起動画面（エントランス）のhiddenを解除し、2択が表示された状態（show-choices）にする
        const entrance = document.getElementById('game-entrance');
        if (entrance) {
          entrance.classList.remove('hidden');
          entrance.classList.add('show-choices');
          if (typeof window.setAppBackgroundByKey === 'function') window.setAppBackgroundByKey('stage');
        }
        
        // 2. 現在開いているパズルメイン画面（#p）を非表示にする
        const pScreen = document.getElementById('p');
        if (pScreen) {
          pScreen.classList.remove('b'); // 表示クラスを消去して非表示化
        }
        
        // 3. チュートリアルモードのフラグを安全にリセット
        window.tutorialModeActive = false;
        if (typeof window.hideTutorialHighlights === 'function') window.hideTutorialHighlights();

        // 4. ボタンラベルを通常に戻す
        btnBack.textContent = 'ステージ選択';

        // 5. キャラダイアログのモード選択画面を再表示する
        if (typeof window.openModeSelectWithCharacter === 'function') {
          window.openModeSelectWithCharacter();
        }

      } else {
        // 💡 本編ステージの場合: 従来どおり、全体のステージ選択マップ画面へルーティング
        if (typeof window.routeToTarget === 'function') window.routeToTarget();
      }
    });
  }
  // 🎮 エントランス（最初の画面）の画面タップで遷移
  const entrance = document.getElementById('game-entrance');
  if (entrance) {
    entrance.addEventListener('click', (e) => {
      // キャラダイアログ内のクリックはエントランスクリックとして扱わない
      if (e.target.closest('#character-dialog-host')) return;
      if (!entrance.classList.contains('show-choices')) {
        entrance.classList.add('show-choices');
        if (typeof window.setAppBackgroundByKey === 'function') window.setAppBackgroundByKey('stage');
        // 既存のエントランスカードは CSS で常時非表示にしてあるため、
        // 前面ではキャラダイアログを開く。
        if (typeof window.openModeSelectWithCharacter === 'function') {
          window.openModeSelectWithCharacter();
        }
      }
    });
  }

  // チュートリアル開始（サイバー演出つき）
  async function startTutorialWithTransition() {
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
        if (transitionLayer) transitionLayer.classList.remove('active', 'booting', 'blocking');
      }, 400);
    }, 900);
  }

  document.getElementById('btn-entry-tutorial')?.addEventListener('click', async (e) => {
    e.stopPropagation(); // 画面全体クリックの連動を防止

    // 説明動画モーダルは廃止し、キャラ会話方式に一本化した。
    // 以前はここから 12MB の tutorial_intro.mp4 が再生される経路が残っていた。
    await startTutorialWithTransition();
  });

  // (動画モーダルの「了解！」ボタンの処理はモーダルごと削除した)

  document.getElementById('btn-entry-map')?.addEventListener('click', async (e) => {
    e.stopPropagation(); // 画面全体クリックの連動を防止
    window.AppStorage.setRaw('tutorial_seen', 'true');
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

         // 次ステージの決定は getNextStageId() に一本化する。
         // 以前は本編最終ステージでも無条件に +1 していたため、
         // 存在しない problems/N.json を読みに行って失敗トーストが出ていた。
         //
         // ただし getNextStageId() は MAIN_STAGE_TOTAL に依存するので、
         // 検出が終わっていることをここで必ず保証してから呼ぶこと。
         if (typeof window.ensureMainStageTotal === 'function') {
           try { await window.ensureMainStageTotal(); } catch (_) { /* 失敗しても続行 */ }
         }
         const nextStage = (typeof window.getNextStageId === 'function')
           ? window.getNextStageId(window.currentStageNumber)
           : null;
         console.log('[AutoAdvance] 現在=', window.currentStageNumber,
                     ' 次=', nextStage, ' 総問題数=', window.MAIN_STAGE_TOTAL);
         try {
           if (nextStage === null || nextStage === undefined) {
             // 次がない（＝本編クリア）のでマップへ戻す
             if (typeof window.routeToTarget === 'function') window.routeToTarget();
             if (typeof window.showToast === 'function') {
               window.showToast("<span style='color:#58cc02; font-size:1.1em;'>🎉 ここまでの問題は全てクリアです！</span>", false);
             }
           } else {
             await window.transitionToStage(nextStage);
           }
         } catch (err) {
           console.error('[AutoAdvance] 遷移に失敗:', err);
           if (typeof window.showToast === 'function') window.showToast("<span style='color:red'>次のステージへ進めませんでした</span>", false);
         }

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

  // 本編の総問題数を起動時に検出しておく。
  // これをやらないと MAIN_STAGE_TOTAL が 1 のままになり、
  // getNextStageId() が「もう最後」と誤判断して正解時の自動遷移が止まる。
  if (typeof window.ensureMainStageTotal === 'function') {
    window.ensureMainStageTotal();
  }
  if (typeof window.setupGuideButton === 'function') window.setupGuideButton();
  if (typeof window.syncUnlockAllButtonLabel === 'function') window.syncUnlockAllButtonLabel();

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

// --- データリセットと全開放機能（マップ画面のボタン用） ---
window.resetSaveData = function() {
  if (!confirm('セーブデータとアンロックした公式をすべてリセットしますか？')) return;
  // APP_STORAGE_KEYS（unlock_all を含む）に登録されているキーを全て削除する。
  // 個別 removeItem の積み上げだと unlock_all の消し忘れなど抜けが出るので、
  // APP_STORAGE_KEYS を信頼の置ける単一の真実として使う。
  const keys = Array.isArray(window.APP_STORAGE_KEYS)
    ? window.APP_STORAGE_KEYS
    : ['s', 'tutorial_progress', 'tutorial_seen', 'unlocked_formulas', 'unlock_all'];
  keys.forEach((key) => { if (key) window.AppStorage.remove(key); });

  window.clearedStages = [];
  window.giveUppedStages = [];   // ← 以前ここが抜けていて、リロードするまで古い値が残っていた
  window.unlockedFormulas = [];
  window.currentStreak = 0;
  window.unlockAll = false;
  window.currentStageSolved = false;

  if (typeof window.syncUnlockAllButtonLabel === 'function') window.syncUnlockAllButtonLabel();
  if (typeof window.renderStageMap === 'function') window.renderStageMap();
  if (typeof window.showToast === 'function') window.showToast('データを初期化しました。');
};

// 全問題を開放する / 解除する のトグル
window.unlockAllStages = function() {
  if (!window.IS_DEV) return; // 公開サイトでは使えない
  if (window.unlockAll) {
    // 既に開放中 → 解除
    window.unlockAll = false;
    window.AppStorage.remove('unlock_all');
    if (typeof window.showToast === 'function') window.showToast('全開放を解除しました。');
  } else {
    // 開放
    window.unlockAll = true;
    window.AppStorage.setRaw('unlock_all', '1');
    if (typeof window.showToast === 'function') window.showToast('全ステージを開放しました。');
  }
  if (typeof window.syncUnlockAllButtonLabel === 'function') window.syncUnlockAllButtonLabel();
  if (typeof window.renderStageMap === 'function') window.renderStageMap();
};

// 全開放ボタンの文言を現在の状態に合わせて切り替える
window.syncUnlockAllButtonLabel = function() {
  const btn = document.getElementById('btn-unlock-all');
  if (btn && !window.IS_DEV) { btn.style.display = 'none'; return; }
  if (!btn) return;
  btn.textContent = window.unlockAll ? '全開放を解除' : '全問題を開放';
};
// ============================================
// 📘 公式リファレンスモーダル
// ============================================
// ヘッダーの「公式解説」ボタンから開く。
// 解説コンテンツ本体 (公式解説、三角関数の基礎、SVG) は explanations.js に分離。
// このセクションはモーダルの表示制御ロジックのみを担当。

// 1つの解説エントリをモーダルに描画する。
// formulaId で FORMULA_REGISTRY のエントリを、
// basics_XX で TRIG_BASICS_ENTRIES を選ぶ。
window.renderFormulaReference = function(entryId) {
  // タブのアクティブ切り替え
  document.querySelectorAll('#formula-ref-tabs .formula-ref-tab').forEach((tab) => {
    tab.classList.toggle('active', tab.dataset.entryId === entryId);
  });

  // FORMULA_REGISTRY の公式か、TRIG_BASICS_ENTRIES の基礎解説かを判定
  const registry = window.FORMULA_REGISTRY || {};
  const basics = window.TRIG_BASICS_ENTRIES || [];
  const basicsEntry = basics.find((b) => b.id === entryId);

  let textHtml = '';
  let svgKey = null;

  if (basicsEntry) {
    // 三角関数の基礎エントリ
    const body = basicsEntry.body;
    const sectionsHtml = body.sections.map((s) => {
      const content = s.isRawHtml ? s.body : `<p>${s.body}</p>`;
      return `<h3>${s.heading}</h3>${content}`;
    }).join('');
    textHtml = `
      <div class="formula-display">$$${body.displayLatex}$$</div>
      ${sectionsHtml}
    `;
    svgKey = body.svgKey;
  } else if (registry[entryId] && registry[entryId].explanation) {
    // 公式エントリ
    const exp = registry[entryId].explanation;
    textHtml = `
      <div class="formula-display">$$${exp.displayLatex}$$</div>
      <h3>意味</h3><p>${exp.meaning}</p>
      <h3>導出</h3><p>${exp.derivation}</p>
      <h3>使いどころ</h3><p>${exp.usage}</p>
      ${exp.variants && exp.variants.length > 0 ? `
        <h3>派生形</h3>
        <div class="formula-variants">
          ${exp.variants.map((v) => `<div>$$${v}$$</div>`).join('')}
        </div>` : ''}
    `;
    svgKey = exp.svgKey;
  } else {
    return;
  }

  const textArea = document.getElementById('formula-ref-text');
  if (textArea) textArea.innerHTML = textHtml;

  // SVG 図
  const imageArea = document.getElementById('formula-ref-image');
  if (imageArea) {
    const svg = svgKey ? window.getFormulaReferenceSvg(svgKey) : '';
    imageArea.innerHTML = svg
      || '<div style="color: var(--cyber-muted); font-size: 0.85rem; text-align:center;">この項目には図はありません</div>';
  }

  // MathJax で数式を組版し直す
  // 初回はここで MathJax(約1MB) を読み込む。以降はキャッシュされた Promise を使う
  if (typeof window.typesetMath === 'function') window.typesetMath(textArea);
};

// モーダルを開く。初期表示は「三角関数とは」から。
window.openFormulaReferenceModal = function(initialEntryId) {
  const modal = document.getElementById('formula-reference-modal');
  const tabsArea = document.getElementById('formula-ref-tabs');
  if (!modal || !tabsArea) return;

  // タブ一覧を構築（三角関数の基礎 → 公式 の順）
  const registry = window.FORMULA_REGISTRY || {};
  const basics = window.TRIG_BASICS_ENTRIES || [];
  const formulaIds = Object.keys(registry).filter((id) => registry[id].explanation);

  const tabs = [];
  basics.forEach((b) => tabs.push({ id: b.id, label: b.label }));
  formulaIds.forEach((id) => tabs.push({ id, label: registry[id].label }));

  tabsArea.innerHTML = tabs.map((t) =>
    `<button class="formula-ref-tab" data-entry-id="${t.id}" type="button">${t.label}</button>`
  ).join('');

  tabsArea.querySelectorAll('.formula-ref-tab').forEach((tab) => {
    tab.addEventListener('click', () => window.renderFormulaReference(tab.dataset.entryId));
  });

  // 初期表示するエントリ（指定なしなら最初のタブ）
  const availableIds = tabs.map((t) => t.id);
  const startId = initialEntryId && availableIds.includes(initialEntryId) ? initialEntryId : availableIds[0];
  modal.classList.remove('hidden');
  if (startId) window.renderFormulaReference(startId);
};

window.closeFormulaReferenceModal = function() {
  const modal = document.getElementById('formula-reference-modal');
  if (modal) modal.classList.add('hidden');
};

// 起動時にボタンへハンドラを付ける
(function setupFormulaReferenceButton() {
  document.addEventListener('DOMContentLoaded', () => {
    const openBtn = document.getElementById('btn-formula-reference');
    const closeBtn = document.getElementById('btn-formula-reference-close');
    const modal = document.getElementById('formula-reference-modal');
    if (openBtn) openBtn.addEventListener('click', () => window.openFormulaReferenceModal());
    if (closeBtn) closeBtn.addEventListener('click', () => window.closeFormulaReferenceModal());
    // モーダル背景クリックで閉じる
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) window.closeFormulaReferenceModal();
      });
    }
  });
})();