// ===== main.js =====
// ステージの遷移、問題JSONファイルの読み込み、ガイド機能の初期配置、マップの生成を担当します

window.TUTORIAL_STAGE_IDS = ['0-1', '0-2', '0-3', '0-4', '0-5', '0-6', '0-7'];

// ====== チュートリアル判定補助 ======
window.isTutorialStageId = function(stageId) { 
  return window.TUTORIAL_STAGE_IDS.includes(String(stageId)); 
};
window.getTutorialStageIndex = function(stageId) { 
  return window.TUTORIAL_STAGE_IDS.indexOf(String(stageId)); 
};

// ====== 画面遷移とルーティング ======
window.routeToTarget = function() {
  const targetStage = window.getCurrentMapFocusStage();
  if (typeof window.switchScreen === 'function') window.switchScreen('stage-map-screen');
  window.renderStageMap();
  if (typeof window.centerMapCameraOnStage === 'function') window.centerMapCameraOnStage(targetStage, false);
};

window.transitionToStage = async function(stageNumber) {
  if (window.isTutorialStageId(stageNumber)) window.currentStageNumber = String(stageNumber);
  else window.currentStageNumber = Math.max(1, Number(stageNumber) || 1);
  
  if (typeof window.switchScreen === 'function') window.switchScreen('p');
  await window.loadStage(window.currentStageNumber);
};

// ====== 前後ステージナビゲーション ======
// 本編の総問題数は問題ファイルの存在チェックで動的に決定する。
// 起動時に detectMainStageTotal() を呼んで window.MAIN_STAGE_TOTAL に保存。
window.MAIN_STAGE_TOTAL = 1; // 検出前のフォールバック値。実際には initApp 起動時に上書きされる

/**
 * problems/N.json を1から順に HEAD で叩き、最初に存在しない番号の前までを総問題数とする。
 * キャップは MAX_DETECT_LIMIT。
 */
window.detectMainStageTotal = async function() {
  const MAX_DETECT_LIMIT = 500; // 安全策。これ以上は試さない
  let lastFound = 0;
  for (let n = 1; n <= MAX_DETECT_LIMIT; n++) {
    try {
      const res = await fetch(`problems/${n}.json`, { method: 'HEAD' });
      if (!res.ok) break;
      lastFound = n;
    } catch (_) {
      break;
    }
  }
  window.MAIN_STAGE_TOTAL = Math.max(1, lastFound);
  console.log('[detectMainStageTotal] 本編問題数:', window.MAIN_STAGE_TOTAL);
  return window.MAIN_STAGE_TOTAL;
};

// 現在のステージから「前」のステージIDを返す（存在しない場合は null）
// チュートリアル中は チュートリアル内で前へ。本編は数値の N-1 へ。
// チュートリアル最初(0-1) と 本編最初(1) は null（ボタン無効化）。
window.getPrevStageId = function(currentId) {
  if (window.isTutorialStageId(currentId)) {
    const idx = window.getTutorialStageIndex(currentId);
    if (idx <= 0) return null;
    return window.TUTORIAL_STAGE_IDS[idx - 1];
  }
  const num = Number(currentId);
  if (!Number.isFinite(num) || num <= 1) return null;
  return num - 1;
};

// 現在のステージから「次」のステージIDを返す（存在しない場合は null）
// チュートリアル中の最後(0-7) は 本編1 へ進む。本編最後は null。
window.getNextStageId = function(currentId) {
  if (window.isTutorialStageId(currentId)) {
    const idx = window.getTutorialStageIndex(currentId);
    if (idx < 0) return null;
    if (idx < window.TUTORIAL_STAGE_IDS.length - 1) {
      return window.TUTORIAL_STAGE_IDS[idx + 1];
    }
    return 1; // チュートリアル最後の次は本編1
  }
  const num = Number(currentId);
  if (!Number.isFinite(num)) return null;
  if (num >= window.MAIN_STAGE_TOTAL) return null;
  return num + 1;
};

// ステージがアンロックされているかを判定するヘルパー。
// - unlockAll (全解放モード) なら常に true
// - チュートリアルステージは順序に依らず自由 (true)
// - 本編ステージは: 番号 1, 既にクリア済み, 前のステージがクリア済み のいずれかで true
window.isStageUnlocked = function(stageId) {
  if (window.unlockAll) return true;
  if (typeof window.isTutorialStageId === 'function' && window.isTutorialStageId(stageId)) return true;
  const num = Number(stageId);
  if (!Number.isFinite(num)) return false;
  if (num === 1) return true;
  const cleared = window.clearedStages || [];
  if (cleared.includes(num)) return true;
  if (cleared.includes(num - 1)) return true;
  return false;
};

// 前へ/次へボタンの活性状態を現在ステージに合わせて更新する
window.updateStageNavButtons = function() {
  const prevBtn = document.getElementById('btn-prev-stage');
  const nextBtn = document.getElementById('btn-next-stage');
  const prev = window.getPrevStageId(window.currentStageNumber);
  const next = window.getNextStageId(window.currentStageNumber);
  if (prevBtn) prevBtn.disabled = (prev === null);
  // 次ステージが未解放なら無効化 (ロックされた場所には進めない)
  if (nextBtn) nextBtn.disabled = (next === null) || !window.isStageUnlocked(next);
};


// ====== マップ関連（本編問題数は window.MAIN_STAGE_TOTAL に従う） ======
window.getCurrentMapFocusStage = function() {
  const maxStage = window.MAIN_STAGE_TOTAL || 1;
  const unlockedLimit = (window.clearedStages && window.clearedStages.length > 0) 
      ? Math.max(1, ...window.clearedStages) + 1 : 1;
  return Math.max(1, Math.min(maxStage, unlockedLimit));
};

window.centerMapCameraOnStage = function(stageNumber, animate = true) {
  const targetNode = document.querySelector(`#map-nodes .map-node[data-stage="${stageNumber}"]`);
  if (targetNode) targetNode.scrollIntoView({ behavior: animate ? 'smooth' : 'auto', block: 'nearest', inline: 'center' });
};

window.centerMapCameraOnCurrentStage = function(animate = true) {
  window.centerMapCameraOnStage(window.getCurrentMapFocusStage(), animate);
};

window.renderStageMap = async function() {
  const nodeRoot = document.getElementById('map-nodes');
  const progressLabel = document.getElementById('map-progress');
  const progressText = document.getElementById('progress-text');
  if (!nodeRoot) return;

  // 本編問題数を未検出なら検出してから描画する（1回だけ）
  if (!window._mainStageTotalDetected) {
    if (typeof window.detectMainStageTotal === 'function') {
      await window.detectMainStageTotal();
    }
    window._mainStageTotalDetected = true;
  }

  nodeRoot.innerHTML = '';

  const totalStages = window.MAIN_STAGE_TOTAL || 1;
  const stageIds = Array.from({length: totalStages}, (_, i) => i + 1);
  const focusStage = window.getCurrentMapFocusStage();

  // ✨ 背景の動的データパーティクルをJSで無限生成（初回のみ）
  if (!document.getElementById('cyber-particle-container')) {
    const pContainer = document.createElement('div');
    pContainer.id = 'cyber-particle-container';
    pContainer.style.position = 'absolute';
    pContainer.style.inset = '0';
    pContainer.style.overflow = 'hidden';
    pContainer.style.pointerEvents = 'none';
    pContainer.style.zIndex = '0';
    for (let i = 0; i < 60; i++) {
      const p = document.createElement('div');
      p.className = 'cyber-bg-particle';
      p.style.left = `${Math.random() * 100}%`;
      p.style.top = `${Math.random() * 100}%`;
      p.style.animationDuration = `${8 + Math.random() * 15}s`;
      p.style.animationDelay = `-${Math.random() * 15}s`;
      if (Math.random() > 0.7) {
        p.style.background = '#4ade80';
        p.style.boxShadow = '0 0 10px #4ade80, 0 0 20px #86efac';
      }
      pContainer.appendChild(p);
    }
    const viewport = document.getElementById('map-viewport');
    if (viewport) viewport.appendChild(pContainer);
  }

  // 📍 配置計算用定数
  const NODE_SPACING_X = 240;
  const AMPLITUDE = 140;
  // 末尾に「未開放」ノードを1個追加するため、レイアウト総ノード数 = 実問題数 + 1
  const totalLayoutNodes = totalStages + 1;

  // スクロール領域の確保
  nodeRoot.style.width = `${totalLayoutNodes * NODE_SPACING_X + 500}px`;

  // 通常ステージのノードを描画
  stageIds.forEach((stage, index) => {
      const isCleared = window.clearedStages && window.clearedStages.includes(stage);
      const isFirst = index === 0;
      const isPrevCleared = !isFirst && window.clearedStages && window.clearedStages.includes(stageIds[index - 1]);
      const isUnlocked = window.unlockAll || isFirst || isCleared || isPrevCleared;
      const isFocus = stage === focusStage;

      const node = document.createElement('button');
      node.className = `map-node ${isCleared ? 'cleared' : isUnlocked ? 'unlocked' : 'locked'}${isFocus ? ' current' : ''}`;
      node.dataset.stage = String(stage);
      const world = Math.floor((stage - 1) / 10) + 1;
      const subStage = ((stage - 1) % 10) + 1;
      
      let statusText = 'LOCKED';
      if (isFocus) statusText = 'ACTIVE';
      else if (isCleared) statusText = 'SYNCED';
      else if (isUnlocked) statusText = 'READY';

      node.innerHTML = `
        <div class="map-node-number">${world}-${subStage}</div>
        <div class="map-node-label">SECTOR ${String(stage).padStart(3, '0')}</div>
        <div class="node-status-tag">${statusText}</div>
      `;
      
      if (isUnlocked) node.onclick = () => window.transitionToStage(stage);
      else node.disabled = true;

      // 📍 座標計算（サイン波でうねらせる）
      const x = index * NODE_SPACING_X + 200;
      const yOffset = Math.sin(index * 0.75) * AMPLITUDE;
      
      node.style.left = `${x}px`;
      node.style.top = `calc(50% + ${yOffset}px)`;
      node.style.transform = `translate(-50%, -50%)`;
      
      nodeRoot.appendChild(node);

      // ⚡ 次のノードへの接続線（角度を計算して繋ぐ）
      // 最後の実ステージからは、末尾の「未開放」ノードへ繋ぐ
      const isLastReal = (index === stageIds.length - 1);
      const nextStageIndex = index + 1; // サイン波のインデックスは続けて伸ばす
      const nextX = nextStageIndex * NODE_SPACING_X + 200;
      const nextYOffset = Math.sin(nextStageIndex * 0.75) * AMPLITUDE;

      const dx = nextX - x;
      const dy = nextYOffset - yOffset;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const angle = Math.atan2(dy, dx) * (180 / Math.PI);

      // 道の状態を決定
      let roadClass;
      if (isLastReal) {
        // 末尾ロックノードへの接続は常にロック表示
        roadClass = 'locked';
      } else {
        const nextStage = stageIds[index + 1];
        const isNextCleared = window.clearedStages && window.clearedStages.includes(nextStage);
        roadClass = (isCleared && isNextCleared) ? 'cleared' : (isUnlocked ? 'unlocked' : 'locked');
      }

      const road = document.createElement('div');
      road.className = `map-road ${roadClass}`;
      road.style.width = `${distance}px`;
      road.style.left = `${x}px`;
      road.style.top = `calc(50% + ${yOffset}px)`;
      road.style.transform = `translateY(-50%) rotate(${angle}deg)`;
      nodeRoot.appendChild(road);
  });

  // 末尾に「未開放」ノードを1個追加（押せない）
  {
    const index = stageIds.length; // 末尾のサイン波インデックス
    const x = index * NODE_SPACING_X + 200;
    const yOffset = Math.sin(index * 0.75) * AMPLITUDE;

    const lockedNode = document.createElement('button');
    lockedNode.className = 'map-node locked next-locked';
    lockedNode.disabled = true;
    lockedNode.innerHTML = `
      <div class="map-node-number">?</div>
      <div class="map-node-label">UNDISCOVERED</div>
      <div class="node-status-tag">LOCKED</div>
    `;
    lockedNode.style.left = `${x}px`;
    lockedNode.style.top = `calc(50% + ${yOffset}px)`;
    lockedNode.style.transform = `translate(-50%, -50%)`;
    nodeRoot.appendChild(lockedNode);
  }

  const clearCount = window.clearedStages ? window.clearedStages.filter(s => s >= 1 && s <= totalStages).length : 0;
  if (progressLabel) progressLabel.textContent = `${clearCount} / ${totalStages} CLEAR`;
  if (progressText) progressText.textContent = `${clearCount} / ${totalStages} クリア`;

  if (typeof window.centerMapCameraOnCurrentStage === 'function') {
    requestAnimationFrame(() => window.centerMapCameraOnCurrentStage(false));
  }
};

// ====== ステージロードとブロック初期配置 ======
window.loadStage = async function(stageNumber) {
  try {
      const isTutorialStage = window.isTutorialStageId(stageNumber);
      const stageFile = isTutorialStage ? `problems/tutorial/${stageNumber}.json` : `problems/${stageNumber}.json`;
      
      const response = await fetch(stageFile);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      let parsedData = JSON.parse((await response.text()).replace(/^\uFEFF/, '').trim());
      
      if (parsedData && !parsedData.mathText) {
          if (parsedData[stageNumber]) parsedData = parsedData[stageNumber];
          else if (parsedData.stages && parsedData.stages[stageNumber]) parsedData = parsedData.stages[stageNumber];
      }
      
      window.currentProblemData = parsedData;

      console.log('[loadStage]', stageNumber, '要求公式:', parsedData?.requiredFormulas, '現在のアンロック:', window.unlockedFormulas);

      if (typeof window.ensureFormulasUnlockedForProblem === 'function') {
        await window.ensureFormulasUnlockedForProblem(window.currentProblemData);
      }

      console.log('[loadStage]', stageNumber, 'アンロック処理後:', window.unlockedFormulas);

      window.currentStageSolved = false;
      window.currentSkipOffer = null;
      
      if (typeof window.closeSkipChallengeModal === 'function') window.closeSkipChallengeModal();
      if (typeof window.updateStreakCounter === 'function') window.updateStreakCounter(false);

      const stageText = document.getElementById('r');
      const problemText = document.getElementById('s');
      if (stageText) stageText.innerText = isTutorialStage ? `TUTORIAL ${window.getTutorialStageIndex(stageNumber) + 1}/${window.TUTORIAL_STAGE_IDS.length}` : `STAGE ${stageNumber}`;
      if (problemText) problemText.innerText = window.currentProblemData?.mathText || '';

      // btn-back のラベルを状況に合わせて切り替える
      // 0-1, 0-2 はキャラチュートリアルが必ず出るので「チュートリアルをやめる」で強制終了させる
      // 0-3 以降はチュートリアルなしなので「ステージ選択」でモード選択に戻る
      const btnBack = document.getElementById('btn-back');
      if (btnBack) {
        const sid = String(stageNumber);
        if (sid === '0-1' || sid === '0-2') {
          btnBack.textContent = 'チュートリアルをやめる';
        } else {
          btnBack.textContent = 'ステージ選択';
        }
      }

      if (window.MathJax) { MathJax.typesetClear(); MathJax.typesetPromise(); }

      if (window.workspace) {
          if (typeof buildToolboxConfig === 'function') window.workspace.updateToolbox(buildToolboxConfig(window.currentProblemData));
          window.workspace.clear();
          
          if (window.currentProblemData?.initialState) {
              Blockly.serialization.workspaces.load(window.currentProblemData.initialState, window.workspace);
          }
          
          if (typeof window.applyConditionalInitialStateGeneration === 'function') {
            try {
              window.applyConditionalInitialStateGeneration(window.workspace);
            } catch (genError) {
              console.warn('[InitialStateGeneration] スキップしました:', genError);
            }
          }
          
          if (typeof forceWorkspaceLayoutSync === 'function') forceWorkspaceLayoutSync();
          if (typeof arrangeBlocks === 'function') arrangeBlocks();
      }

      if (isTutorialStage) {
          requestAnimationFrame(() => { if (typeof applyTutorialBlockRestrictions === 'function') applyTutorialBlockRestrictions(); });
          window.tutorialModeActive = true;
          if (typeof updateTutorialBanner === 'function') updateTutorialBanner(stageNumber);
      } else {
          if (window.workspace) {
              const toolboxElement = window.workspace.getToolbox();
              if (toolboxElement) {
                  const categories = typeof toolboxElement.getCategories === 'function' ? toolboxElement.getCategories() : [];
                  categories.forEach(category => {
                      const blocks = typeof category.getContents === 'function' ? category.getContents() : [];
                      blocks.forEach(block => { if (block && typeof block.setDisabled === 'function') block.setDisabled(false); });
                  });
              }
          }
          window.tutorialModeActive = false;
          if (typeof window.hideGoalHintForStage === 'function') window.hideGoalHintForStage();
      }

      const submitBtn = document.getElementById('btn-submit');
      const nextBtn = document.getElementById('btn-next');
      if (submitBtn) submitBtn.style.display = 'inline-block';
      if (nextBtn) nextBtn.style.display = 'none';

      if (typeof window.updateStageNavButtons === 'function') window.updateStageNavButtons();

      // ==================================
      // ステージ進入時のパルチュートリアル起動フック
      // 各ステージには PAL_TUTORIAL_SCRIPTS[stageId] で台本が定義されている場合があり、
      // そのステージに初めて入ったときだけパルチュートリアルを起動する。
      // 例外: 0-1 は character-scenes.js の exec_tutorial_start から起動されるためスキップ
      // ==================================
      if (isTutorialStage && String(stageNumber) !== '0-1'
          && typeof window.startPalTutorial === 'function'
          && window.PAL_TUTORIAL_SCRIPTS && window.PAL_TUTORIAL_SCRIPTS[String(stageNumber)]) {
        window._palTutorialStageSeen = window._palTutorialStageSeen || {};
        if (!window._palTutorialStageSeen[String(stageNumber)]) {
          window._palTutorialStageSeen[String(stageNumber)] = true;

          // 起動条件を全て満たしてから開始する:
          //   1. シャッター (cyber-transition) が開き終わっている
          //   2. 公式アンロック演出 (character-dialog) が表示されていない
          //   3. 保留中の公式アンロック (_pendingUnlockFormulaIds) が全て解決されている
          // これらを 200ms 間隔で polling する (シャッター判定は waitShutterThen が担当)。
          const isCharacterDialogVisible = () => {
            const host = document.getElementById('character-dialog-host');
            return host && !host.classList.contains('hidden');
          };
          const hasPendingUnlock = () => (window._pendingUnlockFormulaIds || []).length > 0;

          const waitAllConditionsThenStart = () => {
            if (isCharacterDialogVisible() || hasPendingUnlock()) {
              setTimeout(waitAllConditionsThenStart, 200);
              return;
            }
            // すべての条件を満たしたので、余韻として 600ms 待ってから起動
            setTimeout(() => {
              console.log(`[loadStage] パルチュートリアル起動 (stageId=${stageNumber})`);
              window.startPalTutorial(String(stageNumber), function () {
                console.log(`[loadStage] パルチュートリアル完了 (stageId=${stageNumber})`);
              });
            }, 600);
          };

          // まずシャッターが開き終わるのを待つ、次に公式アンロック演出の終了を待つ
          if (typeof window.waitShutterThen === 'function') {
            window.waitShutterThen(waitAllConditionsThenStart);
          } else {
            setTimeout(waitAllConditionsThenStart, 500);
          }
        }
      }
  } catch (error) {
      console.error('[StageLoadError]', error);
      if (typeof window.showToast === 'function') {
        window.showToast(`<span style='color:red'>問題の読み込みに失敗しました (${stageNumber})</span>`, false);
      }
  }
};

window.applyConditionalInitialStateGeneration = function(targetWorkspace) {
  if (!targetWorkspace) return;
  const overwriteButton = document.getElementById('btn-overwrite-permission');
  const isOverwriteOn = !!overwriteButton && !overwriteButton.classList.contains('off');
  
  let proofStep = targetWorkspace.getTopBlocks(false).find(b => b.type === 'proof_step');
  if (!proofStep) {
      proofStep = targetWorkspace.newBlock('proof_step');
      proofStep.initSvg(); proofStep.render();
  }

  const operationInputConnection = proofStep.getInput('OPERATIONS')?.connection;
  if (!operationInputConnection) return;

  const mathBlocks = targetWorkspace.getTopBlocks(false)
      .filter(block => block && block.outputConnection && !['proof_step', 'replace_operation', 'common_denominator_operation', 'conclusion_operation'].includes(block.type))
      .sort((a, b) => a.getRelativeToSurfaceXY().y - b.getRelativeToSurfaceXY().y);
      
  const leftExpressionBlock = mathBlocks[0] || null;
  const rightExpressionBlock = mathBlocks.length >= 2 ? mathBlocks[mathBlocks.length - 1] : mathBlocks[0] || null;

  const operations = [];
  let currentOp = proofStep.getInputTargetBlock('OPERATIONS');
  while (currentOp) { operations.push(currentOp); currentOp = currentOp.getNextBlock(); }

  let conclusionOp = operations.find(op => op.type === 'conclusion_operation') || null;
  if (!conclusionOp) {
      conclusionOp = targetWorkspace.newBlock('conclusion_operation');
      conclusionOp.initSvg(); conclusionOp.render();
  }

  if (isOverwriteOn) {
      let replaceOp = operations.find(op => op.type === 'replace_operation') || null;
      if (!replaceOp) {
          replaceOp = targetWorkspace.newBlock('replace_operation');
          replaceOp.initSvg(); replaceOp.render();
      }
      
      if (operationInputConnection.targetBlock() !== replaceOp) {
          if (operationInputConnection.targetBlock()) operationInputConnection.targetBlock().unplug(true);
          operationInputConnection.connect(replaceOp.previousConnection);
      }
      if (replaceOp.nextConnection && replaceOp.nextConnection.targetBlock() !== conclusionOp) {
          if (replaceOp.nextConnection.targetBlock()) replaceOp.nextConnection.targetBlock().unplug(true);
          replaceOp.nextConnection.connect(conclusionOp.previousConnection);
      }
      
      if (leftExpressionBlock && replaceOp.getInput('VALUE')?.connection && !replaceOp.getInput('VALUE').connection.targetBlock()) {
          replaceOp.getInput('VALUE').connection.connect(leftExpressionBlock.outputConnection);
      }
  } else {
      if (operationInputConnection.targetBlock() !== conclusionOp) {
          if (operationInputConnection.targetBlock()) operationInputConnection.targetBlock().unplug(true);
          operationInputConnection.connect(conclusionOp.previousConnection);
      }
      operations.forEach(op => { if (op !== conclusionOp) op.dispose(true); });
      if (conclusionOp.nextConnection?.targetBlock()) conclusionOp.nextConnection.targetBlock().unplug(true);
  }

  if (rightExpressionBlock && conclusionOp.getInput('VALUE')?.connection && !conclusionOp.getInput('VALUE').connection.targetBlock()) {
      conclusionOp.getInput('VALUE').connection.connect(rightExpressionBlock.outputConnection);
  }
};