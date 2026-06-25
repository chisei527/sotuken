// ===== main.js =====
// ステージの遷移、問題の読み込み、ガイド機能の初期配置、マップ描画を担当します

window.currentStageNumber = window.currentStageNumber || 1;

// ====== 画面遷移とルーティング ======
window.routeToTarget = function() {
  const targetStage = typeof getCurrentMapFocusStage === 'function' ? getCurrentMapFocusStage() : 1;
  if (typeof switchScreen === 'function') switchScreen('stage-map-screen');
  if (typeof setAppBackgroundByKey === 'function') setAppBackgroundByKey('select');
  if (typeof renderStageMap === 'function') renderStageMap();
  if (typeof centerMapCameraOnStage === 'function') centerMapCameraOnStage(targetStage, false);
};

window.transitionToStage = async function(stageNumber) {
  if (typeof isTutorialStageId === 'function' && isTutorialStageId(stageNumber)) {
    currentStageNumber = String(stageNumber);
  } else {
    currentStageNumber = Math.max(1, Number(stageNumber) || 1);
  }
  if (typeof switchScreen === 'function') switchScreen('p');
  if (typeof setAppBackgroundByKey === 'function') setAppBackgroundByKey('stage');
  await loadStage(currentStageNumber);
};

// ====== マップ関連 ======
window.getCurrentMapFocusStage = function() {
  const maxStage = 141;
  const unlockedLimit = (typeof clearedStages !== 'undefined' && clearedStages.length > 0) 
    ? Math.max(1, ...clearedStages) + 1 : 1;
  return Math.max(1, Math.min(maxStage, unlockedLimit));
};

window.centerMapCameraOnStage = function(stageNumber, animate = true) {
  const targetNode = document.querySelector(`#map-nodes .map-node[data-stage="${stageNumber}"]`);
  if (!targetNode) return;
  try {
    targetNode.scrollIntoView({ behavior: animate ? 'smooth' : 'auto', block: 'nearest', inline: 'center' });
  } catch (_) {}
};

window.centerMapCameraOnCurrentStage = function(animate = true) {
  centerMapCameraOnStage(getCurrentMapFocusStage(), animate);
};

window.renderStageMap = async function() {
  const nodeRoot = document.getElementById('map-nodes');
  const progressLabel = document.getElementById('map-progress');
  const overallBar = document.getElementById('overall-progress');
  const progressText = document.getElementById('progress-text');
  
  if (!nodeRoot) return;
  nodeRoot.innerHTML = '';

  const totalStages = 141;
  const stageIds = Array.from({length: totalStages}, (_, i) => i + 1);
  const focusStage = getCurrentMapFocusStage();

  stageIds.forEach((stage, index) => {
    const isCleared = typeof clearedStages !== 'undefined' && clearedStages.includes(stage);
    const isFirst = index === 0;
    const isPrevCleared = !isFirst && typeof clearedStages !== 'undefined' && clearedStages.includes(stageIds[index - 1]);
    const isUnlocked = (typeof unlockAll !== 'undefined' && unlockAll) || isFirst || isCleared || isPrevCleared || (typeof unlockedLimit !== 'undefined' && stage <= unlockedLimit);
    const isFocus = stage === focusStage;

    const node = document.createElement('button');
    node.type = 'button';
    node.className = `map-node ${isCleared ? 'cleared' : isUnlocked ? 'unlocked' : 'locked'}${isFocus ? ' current' : ''}`;
    node.dataset.stage = String(stage);

    const world = Math.floor((stage - 1) / 10) + 1;
    const subStage = ((stage - 1) % 10) + 1;

    const number = document.createElement('div');
    number.className = 'map-node-number';
    number.textContent = `${world}-${subStage}`;
    node.appendChild(number);

    const label = document.createElement('div');
    label.className = 'map-node-label';
    label.textContent = `STAGE ${stage}`;
    node.appendChild(label);

    if (isUnlocked) {
      node.onclick = async () => await transitionToStage(stage);
    } else {
      node.disabled = true;
    }
    nodeRoot.appendChild(node);

    if (index < stageIds.length - 1) {
      const nextStage = stageIds[index + 1];
      const isNextCleared = typeof clearedStages !== 'undefined' && clearedStages.includes(nextStage);
      const road = document.createElement('div');
      road.className = `map-road ${isCleared && isNextCleared ? 'cleared' : isUnlocked ? 'unlocked' : 'locked'}`;
      nodeRoot.appendChild(road);
    }
  });

  const clearCount = typeof clearedStages !== 'undefined' ? clearedStages.filter(s => s >= 1 && s <= totalStages).length : 0;
  if (progressLabel) progressLabel.textContent = `${clearCount} / ${totalStages} CLEAR`;
  if (overallBar) overallBar.style.display = 'none';
  if (progressText) progressText.textContent = `${clearCount} / ${totalStages} クリア`;

  requestAnimationFrame(() => centerMapCameraOnCurrentStage(false));
};

// ====== ステージロード ======
window.loadStage = async function(stageNumber) {
  try {
    const isTutorialStage = typeof isTutorialStageId === 'function' && isTutorialStageId(stageNumber);
    const stageFile = isTutorialStage ? `problems/tutorial/${stageNumber}.json` : `problems/${stageNumber}.json`;
      
    const response = await fetch(stageFile);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const text = await response.text();
    currentProblemData = JSON.parse(text.replace(/^\uFEFF/, '').trim());

    if (typeof ensureFormulasUnlockedForProblem === 'function') await ensureFormulasUnlockedForProblem(currentProblemData);

    currentStageSolved = false;
    currentSkipOffer = null;
    if (typeof closeSkipChallengeModal === 'function') closeSkipChallengeModal();
    if (typeof updateStreakCounter === 'function') updateStreakCounter(false);

    const stageText = document.getElementById('r');
    const problemText = document.getElementById('s');
    if (stageText) stageText.innerText = isTutorialStage ? `TUTORIAL ${getTutorialStageIndex(stageNumber) + 1}/${TUTORIAL_STAGE_IDS.length}` : `STAGE ${stageNumber}`;
    if (problemText) problemText.innerText = currentProblemData.mathText || '';

    if (window.MathJax) { MathJax.typesetClear(); MathJax.typesetPromise(); }

    if (typeof workspace !== 'undefined' && workspace) {
      if (typeof buildToolboxConfig === 'function') workspace.updateToolbox(buildToolboxConfig(currentProblemData));
      workspace.clear();
      Blockly.serialization.workspaces.load(currentProblemData.initialState, workspace);
      
      applyConditionalInitialStateGeneration(workspace);

      if (typeof forceWorkspaceLayoutSync === 'function') forceWorkspaceLayoutSync();
      if (typeof arrangeBlocks === 'function') arrangeBlocks();
    }

    if (isTutorialStage) {
      requestAnimationFrame(() => { if (typeof applyTutorialBlockRestrictions === 'function') applyTutorialBlockRestrictions(); });
      tutorialModeActive = true;
      if (typeof updateTutorialBanner === 'function') updateTutorialBanner(stageNumber);
    } else {
      if (typeof clearTutorialBlockRestrictions === 'function') clearTutorialBlockRestrictions();
      tutorialModeActive = false;
      if (typeof hideGoalHintForStage === 'function') hideGoalHintForStage();
    }

    const submitBtn = document.getElementById('btn-submit');
    const nextBtn = document.getElementById('btn-next');
    if (submitBtn) submitBtn.style.display = 'inline-block';
    if (nextBtn) nextBtn.style.display = 'none';

  } catch (error) {
    console.error('[StageLoadError]', error);
    if (typeof showToast === 'function') showToast(`<span style='color:red'>問題の読み込みに失敗しました (${stageNumber})</span>`, false);
  }
};

// ====== ブロック自動接続ヘルパー (ガイド機能) ======
window.parseRequiredBlockTypes = function(requiredBlocks) {
  if (!Array.isArray(requiredBlocks)) return [];
  return requiredBlocks.map(entry => {
    if (typeof entry !== 'string') return null;
    const match = entry.match(/type\"?\s*:\s*\"([a-zA-Z0-9_]+)\"/);
    if (match && match[1]) return match[1];
    const plain = entry.match(/^[a-zA-Z0-9_]+$/);
    return plain ? entry : null;
  }).filter(Boolean);
};

window.requiresCommonDenominator = function(problemData) {
  if (!problemData) return false;
  const requiredTypes = parseRequiredBlockTypes(problemData.requiredBlocks || []);
  return requiredTypes.includes('common_denominator_operation');
};

window.getTopLevelMathBlocksSortedByY = function(targetWorkspace) {
  if (!targetWorkspace) return [];
  return targetWorkspace.getTopBlocks(false)
    .filter(block => block && block.outputConnection && !['proof_step', 'replace_operation', 'common_denominator_operation', 'conclusion_operation'].includes(block.type))
    .sort((a, b) => a.getRelativeToSurfaceXY().y - b.getRelativeToSurfaceXY().y);
};

window.getOrCreateProofStep = function(targetWorkspace) {
  let proofStep = targetWorkspace.getTopBlocks(false).find(b => b.type === 'proof_step');
  if (proofStep) return proofStep;
  proofStep = targetWorkspace.newBlock('proof_step');
  proofStep.initSvg(); proofStep.render();
  return proofStep;
};

window.getOperationChain = function(proofStep) {
  const operations = [];
  let currentOp = proofStep?.getInputTargetBlock('OPERATIONS') || null;
  while (currentOp) {
    operations.push(currentOp);
    currentOp = currentOp.getNextBlock();
  }
  return operations;
};

window.createOperationBlock = function(targetWorkspace, operationType) {
  const operation = targetWorkspace.newBlock(operationType);
  operation.initSvg(); operation.render();
  return operation;
};

window.ensureStatementConnected = function(statementInputConnection, operationBlock) {
  if (!statementInputConnection || !operationBlock?.previousConnection) return;
  const currentTarget = statementInputConnection.targetBlock();
  if (currentTarget === operationBlock) return;
  if (currentTarget) currentTarget.unplug(true);
  statementInputConnection.connect(operationBlock.previousConnection);
};

window.connectMathToInputIfEmpty = function(operationBlock, inputName, mathBlock) {
  if (!operationBlock || !mathBlock || !mathBlock.outputConnection) return;
  const inputConnection = operationBlock.getInput(inputName)?.connection;
  if (!inputConnection || inputConnection.targetBlock()) return;
  inputConnection.connect(mathBlock.outputConnection);
};

window.applyConditionalInitialStateGeneration = function(targetWorkspace) {
  if (!targetWorkspace) return;
  const overwriteButton = document.getElementById('btn-overwrite-permission');
  const isOverwriteOn = !!overwriteButton && !overwriteButton.classList.contains('off');
  const needsCommonDenominator = requiresCommonDenominator(currentProblemData);
  const proofStep = getOrCreateProofStep(targetWorkspace);
  const operationInputConnection = proofStep.getInput('OPERATIONS')?.connection;
  if (!operationInputConnection) return;

  const mathBlocks = getTopLevelMathBlocksSortedByY(targetWorkspace);
  const leftExpressionBlock = mathBlocks[0] || null;
  const rightExpressionBlock = mathBlocks.length >= 2 ? mathBlocks[mathBlocks.length - 1] : mathBlocks[0] || null;
  const operations = getOperationChain(proofStep);

  if (isOverwriteOn) {
    let replaceOp = operations.find(op => op.type === 'replace_operation') || null;
    let commonOp = needsCommonDenominator ? operations.find(op => op.type === 'common_denominator_operation') || null : null;
    let conclusionOp = operations.find(op => op.type === 'conclusion_operation') || null;

    if (!replaceOp) {
      replaceOp = createOperationBlock(targetWorkspace, 'replace_operation');
      ensureStatementConnected(operationInputConnection, replaceOp);
    }
    if (needsCommonDenominator && !commonOp) commonOp = createOperationBlock(targetWorkspace, 'common_denominator_operation');
    if (!conclusionOp) conclusionOp = createOperationBlock(targetWorkspace, 'conclusion_operation');

    if (needsCommonDenominator && commonOp) {
      if (replaceOp.nextConnection && commonOp.previousConnection) {
        const existing = replaceOp.nextConnection.targetBlock();
        if (existing && existing !== commonOp) existing.unplug(true);
        replaceOp.nextConnection.connect(commonOp.previousConnection);
      }
      if (commonOp.nextConnection && conclusionOp.previousConnection) {
        const existing = commonOp.nextConnection.targetBlock();
        if (existing && existing !== conclusionOp) existing.unplug(true);
        commonOp.nextConnection.connect(conclusionOp.previousConnection);
      }
    } else if (replaceOp.nextConnection && conclusionOp.previousConnection) {
      const existing = replaceOp.nextConnection.targetBlock();
      if (existing && existing !== conclusionOp) existing.unplug(true);
      replaceOp.nextConnection.connect(conclusionOp.previousConnection);
    }
    connectMathToInputIfEmpty(replaceOp, 'VALUE', leftExpressionBlock);
    connectMathToInputIfEmpty(conclusionOp, 'VALUE', rightExpressionBlock);
  } else {
    let conclusionOp = operations.find(op => op.type === 'conclusion_operation') || null;
    if (!conclusionOp) conclusionOp = createOperationBlock(targetWorkspace, 'conclusion_operation');
    ensureStatementConnected(operationInputConnection, conclusionOp);
    
    getOperationChain(proofStep).forEach(op => {
      if (op !== conclusionOp) op.dispose(true);
    });
    if (conclusionOp.nextConnection?.targetBlock()) conclusionOp.nextConnection.targetBlock().unplug(true);
    connectMathToInputIfEmpty(conclusionOp, 'VALUE', rightExpressionBlock);
  }
};