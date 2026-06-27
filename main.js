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

// ====== マップ関連 (141問動的生成) ======
window.getCurrentMapFocusStage = function() {
  const maxStage = 141;
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
  nodeRoot.innerHTML = '';

  const totalStages = 141;
  const stageIds = Array.from({length: totalStages}, (_, i) => i + 1);
  const focusStage = window.getCurrentMapFocusStage();

  // ✨ 背景の動的データパーティクルをJSで無限生成
  if (!document.getElementById('cyber-particle-container')) {
    const pContainer = document.createElement('div');
    pContainer.id = 'cyber-particle-container';
    pContainer.style.position = 'absolute';
    pContainer.style.inset = '0';
    pContainer.style.overflow = 'hidden';
    pContainer.style.pointerEvents = 'none';
    pContainer.style.zIndex = '0';
    for(let i=0; i<60; i++) {
      const p = document.createElement('div');
      p.className = 'cyber-bg-particle';
      p.style.left = `${Math.random() * 100}%`;
      p.style.top = `${Math.random() * 100}%`;
      p.style.animationDuration = `${8 + Math.random() * 15}s`;
      p.style.animationDelay = `-${Math.random() * 15}s`;
      // ランダムに正解グリーンの粒子も混ぜる
      if (Math.random() > 0.7) {
        p.style.background = '#4ade80';
        p.style.boxShadow = '0 0 10px #4ade80, 0 0 20px #86efac';
      }
      pContainer.appendChild(p);
    }
    document.getElementById('map-viewport').appendChild(pContainer);
  }

  // 📍 配置計算用定数（巨大化したノードに合わせて間隔も広げる）
  const NODE_SPACING_X = 240; // 横の間隔
  const AMPLITUDE = 140; // 波の上下の振幅

  // コンテナの全体の横幅を設定してスクロール可能にする
  nodeRoot.style.width = `${totalStages * NODE_SPACING_X + 500}px`;

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

      // 📍 座標計算（Math.sin を使って波打つように絶対配置する）
      const x = index * NODE_SPACING_X + 200;
      const yOffset = Math.sin(index * 0.75) * AMPLITUDE;
      
      node.style.left = `${x}px`;
      node.style.top = `calc(50% + ${yOffset}px)`;
      node.style.transform = `translate(-50%, -50%)`;
      
      nodeRoot.appendChild(node);

      // ⚡ 次のノードへの接続線（Road）を角度を計算して描画
      if (index < stageIds.length - 1) {
          const nextStage = stageIds[index + 1];
          const isNextCleared = window.clearedStages && window.clearedStages.includes(nextStage);
          
          const nextX = (index + 1) * NODE_SPACING_X + 200;
          const nextYOffset = Math.sin((index + 1) * 0.75) * AMPLITUDE;
          
          // ピタゴラスの定理とアークタンジェントで距離と角度を割り出す
          const dx = nextX - x;
          const dy = nextYOffset - yOffset;
          const distance = Math.sqrt(dx * dx + dy * dy);
          const angle = Math.atan2(dy, dx) * (180 / Math.PI);

          const road = document.createElement('div');
          road.className = `map-road ${isCleared && isNextCleared ? 'cleared' : isUnlocked ? 'unlocked' : 'locked'}`;
          
          road.style.width = `${distance}px`;
          road.style.left = `${x}px`;
          road.style.top = `calc(50% + ${yOffset}px)`;
          road.style.transform = `translateY(-50%) rotate(${angle}deg)`;
          
          nodeRoot.appendChild(road);
      }
  });

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

      if (typeof window.ensureFormulasUnlockedForProblem === 'function') {
        await window.ensureFormulasUnlockedForProblem(window.currentProblemData);
      }

      window.currentStageSolved = false;
      window.currentSkipOffer = null;
      
      if (typeof window.closeSkipChallengeModal === 'function') window.closeSkipChallengeModal();
      if (typeof window.updateStreakCounter === 'function') window.updateStreakCounter(false);

      const stageText = document.getElementById('r');
      const problemText = document.getElementById('s');
      if (stageText) stageText.innerText = isTutorialStage ? `TUTORIAL ${window.getTutorialStageIndex(stageNumber) + 1}/${window.TUTORIAL_STAGE_IDS.length}` : `STAGE ${stageNumber}`;
      if (problemText) problemText.innerText = window.currentProblemData?.mathText || '';

      if (window.MathJax) { MathJax.typesetClear(); MathJax.typesetPromise(); }

      if (window.workspace) {
          if (typeof buildToolboxConfig === 'function') window.workspace.updateToolbox(buildToolboxConfig(window.currentProblemData));
          
          // 🚀【修正1】ブロックを配置する「前」に初期値（ガイドON/OFF）を設定する！
          if (typeof window.initializeStageFeaturesDefault === 'function') {
              window.initializeStageFeaturesDefault(stageNumber);
          }
          
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

      if (typeof window.initializeStageFeaturesDefault === 'function') {
          window.initializeStageFeaturesDefault(stageNumber);
      }
      if (typeof window.checkAndShowStagePopup === 'function') {
          window.checkAndShowStagePopup(stageNumber);
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