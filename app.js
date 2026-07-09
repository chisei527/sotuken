// ===== app.js =====
// 司令塔（ボタンのクリック監視と、他のファイルへの指示出しを担当します）

window.hasBoundEventListeners = false;

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
          localStorage.setItem('gu', JSON.stringify(window.giveUppedStages));
          console.log('[app] ギブアップ記録:', numStage, window.giveUppedStages);
        }
        if (!window.clearedStages.includes(numStage)) {
          window.clearedStages.push(numStage);
          localStorage.setItem('s', JSON.stringify(window.clearedStages));
          console.log('[app] ギブアップ扱いでクリア判定:', numStage);
        }
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
        window.startCharacterDialog('answer_reveal_pal_explain', {
          context: { requiredFormulas },
          onChoiceSelected: (actionId) => {
            const action = window.CHARACTER_SCENE_ACTIONS[actionId];
            if (typeof action === 'function') action();
          },
        });
      });
    }
    // フェードイン
    btn.classList.remove('hidden');
    requestAnimationFrame(() => btn.classList.add('show'));
  };

  // 「解説を聞く」ボタンを非表示にする
  window.hideListenExplainButton = function () {
    const btn = document.getElementById('btn-listen-explain');
    if (!btn) return;
    btn.classList.remove('show');
    setTimeout(() => btn.classList.add('hidden'), 220);
  };

  // パルの解説後に「次のステージへ」を押したときの実処理
  window.advanceToNextStage = function () {
    // 答え表示中のロックを解除
    document.body.classList.remove('answer-reveal-locked');
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
           // 過去にギブアップしていたステージを自力クリアしたら、ギブアップ済みリストから削除して「格上げ」する
           if (numStage && window.giveUppedStages && window.giveUppedStages.includes(numStage)) {
             window.giveUppedStages = window.giveUppedStages.filter((n) => n !== numStage);
             localStorage.setItem('gu', JSON.stringify(window.giveUppedStages));
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
        const isPartial = validation && (
          validation.errorCode === 'proof_incomplete' ||
          validation.errorCode === 'no_proof_step' ||
          validation.errorCode === 'empty_slot'
        );
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
      // 💡 判定: 現在チュートリアルモード（0-1〜0-7）を実行中かどうか
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

        // 4. キャラダイアログのモード選択画面を再表示する
        // (旧の entrance-card は CSS で常時非表示にしてあるので、キャラを明示的に呼ぶ)
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

    // まず説明動画モーダルを表示。モーダルが無ければ従来どおり直接遷移。
    const introShown = (typeof window.showTutorialIntroModal === 'function') ? window.showTutorialIntroModal() : false;
    if (introShown) {
      // 選択画面（エントランス）を閉じておかないと動画の裏に残ってしまう
      if (typeof window.closeGameEntrance === 'function') window.closeGameEntrance();
      return; // 続きは動画モーダルの「了解！」ボタンが担当
    }

    await startTutorialWithTransition();
  });

  // 動画モーダルのボタン → チュートリアル開始
  const introOkBtn = document.getElementById('btn-tutorial-intro-ok');
  const introNextBtn = document.getElementById('btn-tutorial-intro-next');
  const startFromIntro = async () => {
    if (typeof window.hideTutorialIntroModal === 'function') window.hideTutorialIntroModal();
    await startTutorialWithTransition();
  };
  if (introOkBtn) introOkBtn.addEventListener('click', startFromIntro);
  if (introNextBtn) introNextBtn.addEventListener('click', startFromIntro);

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
         try {
           await window.transitionToStage(nextStage);
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
  keys.forEach((key) => { if (key) localStorage.removeItem(key); });

  window.clearedStages = [];
  window.unlockedFormulas = [];
  window.currentStreak = 0;
  window.unlockAll = false;

  if (typeof window.syncUnlockAllButtonLabel === 'function') window.syncUnlockAllButtonLabel();
  if (typeof window.renderStageMap === 'function') window.renderStageMap();
  if (typeof window.showToast === 'function') window.showToast('データを初期化しました。');
};

// 全問題を開放する / 解除する のトグル
window.unlockAllStages = function() {
  if (window.unlockAll) {
    // 既に開放中 → 解除
    window.unlockAll = false;
    localStorage.removeItem('unlock_all');
    if (typeof window.showToast === 'function') window.showToast('全開放を解除しました。');
  } else {
    // 開放
    window.unlockAll = true;
    localStorage.setItem('unlock_all', '1');
    if (typeof window.showToast === 'function') window.showToast('全ステージを開放しました。');
  }
  if (typeof window.syncUnlockAllButtonLabel === 'function') window.syncUnlockAllButtonLabel();
  if (typeof window.renderStageMap === 'function') window.renderStageMap();
};

// 全開放ボタンの文言を現在の状態に合わせて切り替える
window.syncUnlockAllButtonLabel = function() {
  const btn = document.getElementById('btn-unlock-all');
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
  if (window.MathJax && typeof window.MathJax.typesetPromise === 'function') {
    window.MathJax.typesetPromise([textArea]).catch(() => { /* MathJax 未準備時は無視 */ });
  }
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