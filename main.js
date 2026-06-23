// Shared state and tutorial setup moved to app-state.js.

function resetAppStateForGoLiveIfNeeded() {
  const isLiveServerHost = window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost';
  if (!isLiveServerHost) return;

  APP_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));

  // ライブプレビュー時は毎回クリーンな学習状態で開始する。
  clearedStages = [];
  unlockAll = false;
  currentStageNumber = 1;
  currentProblemData = null;
  currentStreak = 0;
  currentStageSolved = false;
  currentSkipOffer = null;
  pendingSkipChallenge = null;
  unlockedFormulas = [];
}

const DIFFICULTY_THRESHOLDS = {
  BASIC_MAX: 3,
  STANDARD_MAX: 6,
};

const GREEN_OPERATION_TYPES = new Set(['replace_operation', 'common_denominator_operation']);
const {
  FORMULA_REGISTRY,
  OPERATION_TO_CONCEPT,
  formulaTextToId,
  formulaIdToLabel,
  getRequiredFormulaIdsForProblem,
  isSupportedFormulaId,
  collectUsedFormulaIdsFromAST,
  getAnswerFormulaTypeSequence,
  collectAppliedFormulaIdsFromAST,
  parseBlocksToAST,
  validateProof,
  getErrorMessage,
} = window;

const CONCEPT_LABEL = {
  pythagorean_identity: '三角恒等式（sin^2 + cos^2 = 1）',
  tan_as_sin_over_cos: 'tan の定義（tan = sin/cos）',
  tan_pythagorean_relation: '1 + tan^2 = 1/cos^2',
  double_angle_sin: '倍角（sin2θ）',
  half_angle_sin_square: '半角（sin^2θ）',
  half_angle_cos_square: '半角（cos^2θ）',
  double_angle_tan: '倍角（tan）',
  tan_square_with_cos2: 'tan^2 と cos2θ の関係',
  common_denominator: '通分',
};

function parseRequiredConcepts(requiredConcepts) {
  if (!Array.isArray(requiredConcepts)) return [];
  return requiredConcepts
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter((item) => !!item);
}

function applyProblemDataToWorkspace(problemData, stageLabel) {
  clearAutoAdvanceTimer();
  currentStageSolved = false;
  currentSkipOffer = null;
  closeSkipChallengeModal();
  updateStreakCounter(false);

  const stageText = document.getElementById('r');
  const problemText = document.getElementById('s');
  if (stageText) stageText.innerText = stageLabel;
  if (problemText) problemText.innerText = problemData.mathText || '';

  const toastElement = document.getElementById('toast-message');
  if (toastElement) toastElement.classList.add('hidden');

  if (window.MathJax) {
    MathJax.typesetClear();
    MathJax.typesetPromise();
  }

  workspace.updateToolbox(buildToolboxConfig(problemData));
  workspace.clear();
  Blockly.serialization.workspaces.load(problemData.initialState, workspace);

  applyConditionalInitialStateGeneration(workspace);
  forceWorkspaceLayoutSync();
  arrangeBlocks();

  const submitBtn = document.getElementById('btn-submit');
  if (submitBtn) submitBtn.style.display = 'inline-block';
  updateSubmitButtonState();

  if (!tutorialModeActive) {
    hideGoalHintForStage();
  }
}

function buildTutorialFlowProblems(baseProblem) {
  const followUps = Array.isArray(baseProblem?.tutorialSequence) ? baseProblem.tutorialSequence : [];
  return [baseProblem, ...followUps].filter(Boolean).map((item) => JSON.parse(JSON.stringify(item)));
}

function initializeTutorialFlow(baseProblem) {
  tutorialFlowProblems = buildTutorialFlowProblems(baseProblem);
  tutorialFlowIndex = 0;
}

async function loadTutorialFlowProblem(index) {
  if (!tutorialFlowProblems.length) return;
  const safeIndex = Math.max(0, Math.min(index, tutorialFlowProblems.length - 1));
  tutorialFlowIndex = safeIndex;
  currentProblemData = tutorialFlowProblems[safeIndex];
  await ensureFormulasUnlockedForProblem(currentProblemData);
  applyProblemDataToWorkspace(currentProblemData, `チュートリアル ${safeIndex + 1}/${tutorialFlowProblems.length}`);
  tutorialStepIndex = safeIndex;
  
  // チュートリアルブロック制限を適用
  requestAnimationFrame(() => {
    applyTutorialBlockRestrictions();
  });
  
  showTutorialStep();
  queueTutorialAutoAdvanceCheck();
}


function getRequiredConceptsForProblem(problemData) {
  const explicit = parseRequiredConcepts(problemData?.requiredConcepts);
  if (explicit.length > 0) return explicit;

  const conceptSet = new Set();
  const answerFormulaTypes = getAnswerFormulaTypeSequence(problemData);
  answerFormulaTypes.forEach((formulaType) => {
    const concept = FORMULA_REGISTRY[formulaType]?.concept;
    if (concept) conceptSet.add(concept);
  });

  const answerOperationTypes = getAnswerOperationTypeSequence(problemData);
  answerOperationTypes.forEach((operationType) => {
    const concept = OPERATION_TO_CONCEPT[operationType];
    if (concept) conceptSet.add(concept);
  });

  return Array.from(conceptSet);
}

function collectAchievedConceptsFromAST(astArray) {
  const achieved = new Set();
  if (!Array.isArray(astArray)) return achieved;

  astArray.forEach((stepData) => {
    const operationType = String(stepData?.type || '');
    const operationConcept = OPERATION_TO_CONCEPT[operationType];
    if (operationConcept) achieved.add(operationConcept);

    const formulaId = formulaTextToId(stepData?.formula);
    const formulaConcept = FORMULA_REGISTRY[formulaId]?.concept;
    if (formulaConcept) achieved.add(formulaConcept);
  });

  return achieved;
}

function getConceptLabel(conceptId) {
  return CONCEPT_LABEL[conceptId] || conceptId;
}

function getProofScaffoldMode() {
  const allowedModes = new Set(['guided', 'standard', 'challenge']);
  const urlMode = new URLSearchParams(window.location.search).get('scaffold');
  const storedMode = localStorage.getItem('proof_scaffold_mode');

  if (urlMode && allowedModes.has(urlMode)) {
    localStorage.setItem('proof_scaffold_mode', urlMode);
    return urlMode;
  }

  if (storedMode && allowedModes.has(storedMode)) {
    return storedMode;
  }

  return 'guided';
}

function setProofScaffoldMode(mode) {
  const allowedModes = new Set(['guided', 'standard', 'challenge']);
  if (!allowedModes.has(mode)) return false;
  localStorage.setItem('proof_scaffold_mode', mode);
  return true;
}

window.setProofScaffoldMode = setProofScaffoldMode;

function updateOverwritePermissionButton() {
  const button = document.getElementById('btn-overwrite-permission');
  if (!button) return;

  const mode = getProofScaffoldMode();
  const isEnabled = mode === 'guided';
  button.textContent = `ガイド機能: ${isEnabled ? 'ON' : 'OFF'}`;
  button.classList.toggle('on', isEnabled);
  button.classList.toggle('off', !isEnabled);
}


function getKnownFormulaIds() {
  return FORMULA_BLOCK_DEFS.map(([type]) => type);
}

function sanitizeUnlockedFormulas(formulaIds) {
  const known = new Set(getKnownFormulaIds());
  const raw = Array.isArray(formulaIds) ? formulaIds : [];
  const sanitized = Array.from(new Set(raw.map((id) => String(id))))
    .filter((id) => known.has(id));
  return sanitized;
}

function getUnlockedFormulaIds() {
  const sanitized = sanitizeUnlockedFormulas(unlockedFormulas);
  if (sanitized.length !== unlockedFormulas.length) {
    unlockedFormulas = sanitized;
    saveUnlockedFormulasToStorage(unlockedFormulas);
  }
  return sanitized;
}

function buildFormulaToolboxBlocks() {
  const unlockedSet = new Set(getUnlockedFormulaIds());
  return FORMULA_BLOCK_DEFS
    .map(([type]) => type)
    .filter((type) => unlockedSet.has(type))
    .map((type) => ({ kind: 'block', type }));
}

function buildProblemBlocksCategory(problemData) {
  const category = { kind: 'category', name: '✨問題の式', contents: [] };
  const blocks = problemData?.initialState?.blocks?.blocks;
  if (!Array.isArray(blocks)) return null;

  blocks.forEach((block) => {
    if (!block || block.type === 'proof_step') return;
    const blockCopy = JSON.parse(JSON.stringify(block));
    blockCopy.kind = 'block';
    delete blockCopy.x;
    delete blockCopy.y;
    delete blockCopy.id;
    category.contents.push(blockCopy);
  });

  return category.contents.length > 0 ? category : null;
}

function buildToolboxConfig(problemData = null) {
  const toolbox = {
    kind: 'categoryToolbox',
    contents: [
      {
        kind: 'category',
        name: '基本',
        colour: '#3f51b5',
        contents: [
          { kind: 'block', type: 'custom_number' },
          { kind: 'block', type: 'term_sin' },
          { kind: 'block', type: 'term_cos' },
          { kind: 'block', type: 'term_tan' },
          { kind: 'block', type: 'term_sin2' },
          { kind: 'block', type: 'term_cos2' },
        ],
      },
      {
        kind: 'category',
        name: '角度',
        colour: '#00897b',
        contents: [
          { kind: 'block', type: 'term_pi' },
          { kind: 'block', type: 'term_theta' },
          { kind: 'block', type: 'term_two_theta' },
          { kind: 'block', type: 'term_three_theta' },
          { kind: 'block', type: 'term_four_theta' },
          { kind: 'block', type: 'term_five_theta' },
          { kind: 'block', type: 'term_pi_sixth' },
          { kind: 'block', type: 'term_pi_quarter' },
          { kind: 'block', type: 'term_pi_third' },
          { kind: 'block', type: 'term_pi_half' },
          { kind: 'block', type: 'term_two_pi_thirds' },
          { kind: 'block', type: 'term_three_pi_quarters' },
          { kind: 'block', type: 'term_five_pi_sixths' },
          { kind: 'block', type: 'term_half_value' },
          { kind: 'block', type: 'term_sqrt2_half' },
          { kind: 'block', type: 'term_sqrt3_half' },
          { kind: 'block', type: 'term_sin_of' },
          { kind: 'block', type: 'term_cos_of' },
          { kind: 'block', type: 'term_tan_of' },
        ],
      },
      {
        kind: 'category',
        name: '演算',
        colour: '#ef6c00',
        contents: [
          { kind: 'block', type: 'math_add' },
          { kind: 'block', type: 'math_negate' },
          { kind: 'block', type: 'math_multiply' },
          { kind: 'block', type: 'math_fraction' },
          { kind: 'block', type: 'math_square' },
        ],
      },
      {
        kind: 'category',
        name: '公式',
        colour: '#8e24aa',
        contents: buildFormulaToolboxBlocks(),
      },
      {
        kind: 'category',
        name: '証明',
        colour: '#2e7d32',
        contents: [
          { kind: 'block', type: 'proof_step' },
          { kind: 'block', type: 'replace_operation' },
          { kind: 'block', type: 'common_denominator_operation' },
          { kind: 'block', type: 'conclusion_operation' },
        ],
      },
    ],
  };

  const problemBlocksCategory = buildProblemBlocksCategory(problemData);
  if (problemBlocksCategory) {
    // 既存実装と同様、基本カテゴリの先頭に「問題の式」サブカテゴリを差し込む
    toolbox.contents[0].contents.unshift(problemBlocksCategory);
  }

  return toolbox;
}


// ===== 問題ロード/画面遷移 =====
async function getProblemsData() {
  if (problemsDataCache) return problemsDataCache;

  try {
    const response = await fetch('problems.json');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    problemsDataCache = await response.json();
  } catch (_) {
    problemsDataCache = { stages: {} };
  }

  return problemsDataCache;
}

function getUnlockLimit() {
  if (unlockAll) return MAX_STAGE_NUMBER;
  if (!Array.isArray(clearedStages) || clearedStages.length === 0) return 60;
  return Math.min(MAX_STAGE_NUMBER, Math.max(60, ...clearedStages) + 1);
}

function openSkipChallengeModal(currentStage, desiredTargetStage) {
  const safeTarget = Math.min(MAX_STAGE_NUMBER, Math.max(currentStage + 1, desiredTargetStage));
  const bypassedStages = [];
  for (let stage = currentStage + 1; stage < safeTarget; stage += 1) {
    bypassedStages.push(stage);
  }

  currentSkipOffer = {
    targetStage: safeTarget,
    bypassedStages,
  };

  const modal = document.getElementById('skip-challenge-modal');
  const message = document.getElementById('skip-challenge-message');
  if (message) {
    message.textContent = `連続正解ボーナス！ STAGE ${safeTarget} へ挑戦しますか？`;
  }
  if (modal) modal.classList.remove('hidden');
}

function clearAutoAdvanceTimer() {
  if (autoAdvanceTimerId) {
    clearTimeout(autoAdvanceTimerId);
    autoAdvanceTimerId = 0;
  }
}

function getAutoAdvanceDestination(stageNumber) {
  if (isTutorialStageId(stageNumber)) {
    if (stageNumber === '0-7') {
      return { kind: 'stage', target: 60 }; // チュートリアル0-7の次は本編STAGE 60へ
    }
    const nextTutorialStage = getNextTutorialStageId(stageNumber);
    return nextTutorialStage
      ? { kind: 'stage', target: nextTutorialStage }
      : { kind: 'map', tutorialComplete: true }; // それ以外のチュートリアル完了時はマップへ
  }

  const numericStageNumber = Math.max(60, Number(stageNumber) || 60); // 通常ステージは60から
  return numericStageNumber < MAX_STAGE_NUMBER
    ? { kind: 'stage', target: numericStageNumber + 1 }
    : { kind: 'map', tutorialComplete: false };
}

async function navigateAfterAutoClear(destination) {
  if (!destination) return;

  if (destination.kind === 'stage') {
    await transitionToStage(destination.target);
    return;
  }

  if (destination.tutorialComplete) {
    localStorage.setItem('tutorial_seen', 'true');
    updateTutorialBanner('');
  }

  await renderStageMap();
  switchScreen('stage-map-screen');
}

function scheduleAutoAdvanceAfterClear() {
  clearAutoAdvanceTimer();
  const destination = getAutoAdvanceDestination(currentStageNumber);
  const stampDuration = typeof CLEAR_STAMP_DURATION_MS === 'number' ? CLEAR_STAMP_DURATION_MS : 1200;
  // 演出後すぐに遷移する（余分な待ち時間を削除）
  const advanceDelayMs = stampDuration;

  autoAdvanceTimerId = window.setTimeout(() => {
    autoAdvanceTimerId = 0;
    void navigateAfterAutoClear(destination);
  }, advanceDelayMs);
}

if (typeof showClearStamp !== 'function') {
  window.showClearStamp = function showClearStamp(text = 'CLEAR!') {
    const existingStamp = document.querySelector('.clear-stamp-effect');
    if (existingStamp) existingStamp.remove();

    const stamp = document.createElement('div');
    stamp.className = 'clear-stamp-effect';
    stamp.textContent = text;
    document.body.appendChild(stamp);

    const stampDuration = typeof CLEAR_STAMP_DURATION_MS === 'number' ? CLEAR_STAMP_DURATION_MS : 1200;
    window.setTimeout(() => {
      stamp.remove();
    }, stampDuration);

    return stamp;
  };
}

function applyPendingSkipClearIfNeeded() {
  if (!pendingSkipChallenge) return;
  if (currentStageNumber !== pendingSkipChallenge.targetStage) return;

  pendingSkipChallenge.bypassedStages.forEach((stage) => {
    if (!clearedStages.includes(stage)) {
      clearedStages.push(stage);
    }
  });

  localStorage.setItem('s', JSON.stringify(clearedStages));
  pendingSkipChallenge = null;
}

async function transitionToStage(stageNumber) {
  if (isTutorialStageId(stageNumber)) {
    currentStageNumber = String(stageNumber);
  } else {
    currentStageNumber = Math.max(60, Math.min(MAX_STAGE_NUMBER, Number(stageNumber) || 60)); // 通常ステージは60から
  }
  switchScreen('p');
  await loadStage(currentStageNumber);
}

function buildStageNodePosition(index) {
  const col = index % 8;
  const row = Math.floor(index / 8);
  const isOddRow = row % 2 === 1;
  const x = isOddRow ? 1460 - col * 180 : 140 + col * 180;
  const y = 120 + row * 170;
  return { x, y };
}

function getCurrentMapFocusStage() {
  const unlockedLimit = getUnlockLimit();
  return Math.max(60, Math.min(MAX_STAGE_NUMBER, unlockedLimit)); // 通常ステージは60から
}

function centerMapCameraOnStage(stageNumber, animate = true) {
  const viewport = document.getElementById('map-viewport');
  if (!viewport) return;

  const targetNode = document.querySelector(`#map-nodes .map-node[data-stage="${stageNumber}"]`);
  if (!targetNode) return;

  try {
    targetNode.scrollIntoView({
      behavior: animate ? 'smooth' : 'auto',
      block: 'nearest',
      inline: 'center',
    });
  } catch (_) {
    // ignore
  }
}

function centerMapCameraOnCurrentStage(animate = true) {
  centerMapCameraOnStage(getCurrentMapFocusStage(), animate);
}

function drawMapLinks(svg, _positions) {
  // 横スクロール型ステージ列に変更したため、リンク描画は使わない
  if (!svg) return;
  svg.innerHTML = '';
}

async function renderStageMap() {
  const nodeRoot = document.getElementById('map-nodes');
  const links = document.getElementById('map-links');
  const mapWorld = document.getElementById('map-world');
  const progressLabel = document.getElementById('map-progress');
  const overallBar = document.getElementById('overall-progress');
  const progressText = document.getElementById('progress-text');
  if (!nodeRoot || !mapWorld) return;

  const unlockedLimit = getUnlockLimit();
  const focusStage = getCurrentMapFocusStage();

  if (links) {
    drawMapLinks(links, []);
  }

  nodeRoot.innerHTML = '';

  for (let stage = 60; stage <= MAX_STAGE_NUMBER; stage += 1) { // 本編ステージは60から開始
    const isCleared = clearedStages.includes(stage);
    const isUnlocked = unlockAll || stage <= unlockedLimit;
    const isFocus = stage === focusStage;

    const node = document.createElement('button');
    node.type = 'button';
    node.className = `map-node ${isCleared ? 'cleared' : isUnlocked ? 'unlocked' : 'locked'}${isFocus ? ' current' : ''}`;
    node.dataset.stage = String(stage);

    const number = document.createElement('div');
    number.className = 'map-node-number';
    number.textContent = String(stage);
    node.appendChild(number);

    const label = document.createElement('div');
    label.className = 'map-node-label';
    label.textContent = `STAGE ${stage}`;
    node.appendChild(label);

    if (isUnlocked) {
      node.onclick = async () => {
        currentStageNumber = stage;
        switchScreen('p');
        await loadStage(stage);
      };
    } else {
      node.disabled = true;
    }

    nodeRoot.appendChild(node);

    if (stage < MAX_STAGE_NUMBER) { // MAX_STAGE_NUMBERが本編の最終ステージであれば、この条件はそのまま
      const road = document.createElement('div');
      road.className = `map-road ${isCleared ? 'cleared' : isUnlocked ? 'unlocked' : 'locked'}`;
      nodeRoot.appendChild(road);
    }
  }

  const clearCount = clearedStages.filter((s) => s >= 60 && s <= MAX_STAGE_NUMBER).length; // 通常ステージは60からカウント
  if (progressLabel) progressLabel.textContent = `${clearCount} / ${MAX_STAGE_NUMBER} CLEAR`;
  if (overallBar) overallBar.style.width = `${(clearCount / MAX_STAGE_NUMBER) * 100}%`;
  if (progressText) progressText.textContent = `${clearCount} / ${MAX_STAGE_NUMBER} クリア`;

  requestAnimationFrame(() => {
    centerMapCameraOnCurrentStage(false);
  });
}

function unlockAllStages() {
  unlockAll = true;
  localStorage.setItem('unlock_all', '1');
  renderStageMap();
}

function resetSaveData() {
  APP_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
  localStorage.removeItem('unlock_all');

  clearedStages = [];
  unlockAll = false;
  unlockedFormulas = [];
  saveUnlockedFormulasToStorage(unlockedFormulas);

  currentStreak = 0;
  tutorialProgressCount = 0;
  pendingSkipChallenge = null;
  currentSkipOffer = null;
  updateStreakCounter(false);

  if (workspace) {
    workspace.updateToolbox(buildToolboxConfig(currentProblemData));
  }

  renderStageMap();
}

window.unlockAllStages = unlockAllStages;
window.resetSaveData = resetSaveData;

// ===== チュートリアル補助 =====
function getTutorialCompletionState(astArray) {
  const ast = Array.isArray(astArray) ? astArray : [];
  const hasFormula2 = ast.some((step) => step?.type === 'replace_operation' && formulaTextToId(step?.formula) === 'formula_2');
  const hasCommonDenominator = ast.some((step) => step?.type === 'common_denominator_operation');
  const hasFormula1 = ast.some((step) => step?.type === 'replace_operation' && formulaTextToId(step?.formula) === 'formula_1');
  const hasFormula3 = ast.some((step) => step?.type === 'replace_operation' && formulaTextToId(step?.formula) === 'formula_3');

  let firstMissingIndex = 0;
  if (hasFormula2) firstMissingIndex = 1;
  if (hasFormula2 && hasCommonDenominator) firstMissingIndex = 2;
  if (hasFormula2 && hasCommonDenominator && hasFormula1 && hasFormula3) {
    firstMissingIndex = TUTORIAL_STEPS.length - 1;
    return { isComplete: true, firstMissingIndex };
  }

  return { isComplete: false, firstMissingIndex };
}

function isProofReadyForJudging(astArray) {
  if (!Array.isArray(astArray) || astArray.length === 0) return false;

  let hasProofOperation = false;
  for (const stepData of astArray) {
    const operationType = String(stepData?.type || '');
    if (!operationType) continue;

    if (operationType === 'replace_operation' || operationType === 'common_denominator_operation' || operationType === 'conclusion_operation') {
      hasProofOperation = true;
    }

    if (operationType === 'replace_operation' || operationType === 'common_denominator_operation') {
      if (!String(stepData?.before || '').trim()) return false;
      if (!String(stepData?.after || '').trim()) return false;
    }

    if (operationType === 'replace_operation' && !String(stepData?.formula || '').trim()) {
      return false;
    }

    if (operationType === 'conclusion_operation' && !String(stepData?.before || '').trim()) {
      return false;
    }
  }

  return hasProofOperation;
}

function updateSubmitButtonState() {
  const submitBtn = document.getElementById('btn-submit');
  if (!submitBtn) return;

  let ast = [];
  try {
    ast = parseBlocksToAST(workspace, mathGenerator);
  } catch (_) {
    ast = [];
  }

  submitBtn.disabled = !isProofReadyForJudging(ast);
}

async function completeTutorialAndOpenMap() {
  localStorage.setItem('tutorial_seen', 'true');
  hideTutorialOverlay();
  await renderStageMap();
  switchScreen('stage-map-screen');
  
  // マップ表示後にトーストで完了メッセージを表示
  showToast('<span style="color:#58cc02; font-size:1.1em;">✨ チュートリアル完了！\n\nステージマップから好きな問題に挑戦してください！</span>', true);
}

// ===== インタラクティブ単位円 =====
function drawUnitCircle(angleDeg) {
  const canvas = document.getElementById('unit-circle');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const width = canvas.width;
  const height = canvas.height;
  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.min(width, height) * 0.34;
  const angleRad = (angleDeg * Math.PI) / 180;
  const px = cx + radius * Math.cos(angleRad);
  const py = cy - radius * Math.sin(angleRad);

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(20, cy);
  ctx.lineTo(width - 20, cy);
  ctx.moveTo(cx, 20);
  ctx.lineTo(cx, height - 20);
  ctx.stroke();

  ctx.strokeStyle = '#0ea5e9';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.stroke();

  // 半径
  ctx.strokeStyle = '#1d4ed8';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(px, py);
  ctx.stroke();

  // cos 成分（横）
  ctx.strokeStyle = '#16a34a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(px, cy);
  ctx.stroke();

  // sin 成分（縦）
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(px, cy);
  ctx.lineTo(px, py);
  ctx.stroke();

  // tan 線（90/270° 近傍は描画しない）
  const cosValue = Math.cos(angleRad);
  if (Math.abs(cosValue) > 0.03) {
    const tanValue = Math.tan(angleRad);
    const tanX = cx + radius;
    const tanY = cy - radius * tanValue;
    const safeY = Math.max(20, Math.min(height - 20, tanY));

    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(tanX, safeY);
    ctx.stroke();
  }

  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 14px sans-serif';
  ctx.fillText(`angle: ${angleDeg.toFixed(0)}°`, 12, 22);
  ctx.fillText(`sin: ${Math.sin(angleRad).toFixed(4)}`, 12, 42);
  ctx.fillText(`cos: ${Math.cos(angleRad).toFixed(4)}`, 12, 62);
  if (Math.abs(cosValue) > 0.0001) {
    ctx.fillText(`tan: ${Math.tan(angleRad).toFixed(4)}`, 12, 82);
  } else {
    ctx.fillText('tan: ∞', 12, 82);
  }
}

// ===== 解析ヘルパー =====
// answerState を再帰走査し、操作ブロック数と公式種類数を数える
function countAllBlocks(block, operationCounter, formulasSet) {
  if (!block) return;

  if (
    block.type === 'replace_operation' ||
    block.type === 'common_denominator_operation' ||
    block.type === 'conclusion_operation'
  ) {
    operationCounter.count++;
  }

  if (block.type && block.type.startsWith('formula_')) {
    formulasSet.add(block.type);
  }

  if (block.next) {
    countAllBlocks(block.next, operationCounter, formulasSet);
  }

  if (block.inputs && typeof block.inputs === 'object') {
    Object.values(block.inputs).forEach((input) => {
      if (input && input.block) {
        countAllBlocks(input.block, operationCounter, formulasSet);
      }
    });
  }
}

// 問題の難易度を自動評価する
function evaluateDifficulty(problemData) {
  if (!problemData.answerState || !problemData.answerState.blocks || !problemData.answerState.blocks.blocks) {
    return { difficulty: '不明', score: 0, operationCount: 0, formulaCount: 0 };
  }

  const blocks = problemData.answerState.blocks.blocks;

  const operationCounter = { count: 0 };
  const formulasUsed = new Set();

  blocks.forEach((block) => countAllBlocks(block, operationCounter, formulasUsed));

  const operationCount = operationCounter.count;
  const formulaCount = formulasUsed.size;
  const score = operationCount + formulaCount * 1.5;

  let difficulty;
  if (score < DIFFICULTY_THRESHOLDS.BASIC_MAX) {
    difficulty = '基礎問';
  } else if (score < DIFFICULTY_THRESHOLDS.STANDARD_MAX) {
    difficulty = '標準問題';
  } else {
    difficulty = '発展問題';
  }

  return { difficulty, score, operationCount, formulaCount };
}

function parseRequiredBlockTypes(requiredBlocks) {
  if (!Array.isArray(requiredBlocks)) return [];

  return requiredBlocks
    .map((entry) => {
      if (typeof entry !== 'string') return null;

      // 例: "type":"replace_operation" / "type":"replace_operation"
      const match = entry.match(/type\"?\s*:\s*\"([a-zA-Z0-9_]+)\"/);
      if (match && match[1]) return match[1];

      // 念のため type 名だけが入っているケースも許容
      const plain = entry.match(/^[a-zA-Z0-9_]+$/);
      return plain ? entry : null;
    })
    .filter((type) => !!type);
}

function getAnswerOperationTypeSequence(problemData) {
  const proofBlock = problemData?.answerState?.blocks?.blocks?.find((block) => block?.type === 'proof_step');
  let current = proofBlock?.inputs?.OPERATIONS?.block || null;
  const sequence = [];

  while (current) {
    if (typeof current.type === 'string' && current.type) {
      sequence.push(current.type);
    }
    current = current?.next?.block || null;
  }

  return sequence;
}

function getInitialOperationTypeSequence(problemData) {
  const proofBlock = problemData?.initialState?.blocks?.blocks?.find((block) => block?.type === 'proof_step');
  let current = proofBlock?.inputs?.OPERATIONS?.block || null;
  const sequence = [];

  while (current) {
    if (typeof current.type === 'string' && current.type) {
      sequence.push(current.type);
    }
    current = current?.next?.block || null;
  }

  return sequence;
}

function getAnswerGreenOperationSequence(problemData) {
  return getAnswerOperationTypeSequence(problemData).filter((type) => GREEN_OPERATION_TYPES.has(type));
}

function getRequiredGreenOperationSequence(problemData) {
  const required = getAnswerGreenOperationSequence(problemData);
  if (requiresCommonDenominator(problemData) && !required.includes('common_denominator_operation')) {
    required.push('common_denominator_operation');
  }
  return required;
}

function getMissingTypesByRequiredOrder(requiredTypes, actualTypes) {
  const actualCounts = Object.create(null);
  actualTypes.forEach((type) => {
    if (!type) return;
    actualCounts[type] = (actualCounts[type] || 0) + 1;
  });

  const missing = [];
  requiredTypes.forEach((type) => {
    if (!type) return;
    if ((actualCounts[type] || 0) > 0) {
      actualCounts[type] -= 1;
      return;
    }
    missing.push(type);
  });

  return missing;
}

function formatOperationTypeLabel(type) {
  if (type === 'replace_operation') return '置き換え';
  if (type === 'common_denominator_operation') return '通分';
  if (type === 'conclusion_operation') return 'よって';
  return type;
}

function summarizeTypeCounts(types) {
  const counts = Object.create(null);
  types.forEach((type) => {
    if (!type) return;
    counts[type] = (counts[type] || 0) + 1;
  });

  return Object.entries(counts)
    .map(([type, count]) => `${formatOperationTypeLabel(type)}${count > 1 ? ` ×${count}` : ''}`)
    .join(', ');
}

function ensureAnswerGreenBlocksPlaced(targetWorkspace, problemData) {
  const requiredGreenTypes = getRequiredGreenOperationSequence(problemData);
  if (requiredGreenTypes.length === 0 || !targetWorkspace) return;

  let proofStep = targetWorkspace.getTopBlocks(false).find((b) => b.type === 'proof_step');
  if (!proofStep) {
    proofStep = targetWorkspace.newBlock('proof_step');
    proofStep.initSvg();
    proofStep.render();
  }

  const existingTypes = [];
  let currentOp = proofStep.getInputTargetBlock('OPERATIONS');
  let lastOp = null;
  while (currentOp) {
    existingTypes.push(currentOp.type);
    lastOp = currentOp;
    currentOp = currentOp.getNextBlock();
  }

  const missingTypes = getMissingTypesByRequiredOrder(requiredGreenTypes, existingTypes);
  if (missingTypes.length === 0) return;

  missingTypes.forEach((type) => {
    if (!Blockly.Blocks[type]) return;
    const newOp = targetWorkspace.newBlock(type);
    newOp.initSvg();
    newOp.render();

    if (lastOp && lastOp.nextConnection && newOp.previousConnection) {
      lastOp.nextConnection.connect(newOp.previousConnection);
    } else if (proofStep.getInput('OPERATIONS')?.connection && newOp.previousConnection) {
      proofStep.getInput('OPERATIONS').connection.connect(newOp.previousConnection);
    }
    lastOp = newOp;
  });
}

function ensureAnswerOperationBlocksPlaced(targetWorkspace, problemData) {
  const requiredAnswerTypes = getAnswerOperationTypeSequence(problemData);
  if (requiredAnswerTypes.length === 0 || !targetWorkspace) return;

  let proofStep = targetWorkspace.getTopBlocks(false).find((b) => b.type === 'proof_step');
  if (!proofStep) {
    proofStep = targetWorkspace.newBlock('proof_step');
    proofStep.initSvg();
    proofStep.render();
  }

  const existingTypes = [];
  let currentOp = proofStep.getInputTargetBlock('OPERATIONS');
  let lastOp = null;
  while (currentOp) {
    existingTypes.push(currentOp.type);
    lastOp = currentOp;
    currentOp = currentOp.getNextBlock();
  }

  const missingTypes = getMissingTypesByRequiredOrder(requiredAnswerTypes, existingTypes);
  if (missingTypes.length === 0) return;

  missingTypes.forEach((type) => {
    if (!Blockly.Blocks[type]) return;
    const newOp = targetWorkspace.newBlock(type);
    newOp.initSvg();
    newOp.render();

    if (lastOp && lastOp.nextConnection && newOp.previousConnection) {
      lastOp.nextConnection.connect(newOp.previousConnection);
    } else if (proofStep.getInput('OPERATIONS')?.connection && newOp.previousConnection) {
      proofStep.getInput('OPERATIONS').connection.connect(newOp.previousConnection);
    }
    lastOp = newOp;
  });
}

function ensureInitialOperationBlocksPlaced(targetWorkspace, problemData) {
  const requiredInitialTypes = getInitialOperationTypeSequence(problemData);
  if (requiredInitialTypes.length === 0 || !targetWorkspace) return;

  let proofStep = targetWorkspace.getTopBlocks(false).find((b) => b.type === 'proof_step');
  if (!proofStep) {
    proofStep = targetWorkspace.newBlock('proof_step');
    proofStep.initSvg();
    proofStep.render();
  }

  const existingTypes = [];
  let currentOp = proofStep.getInputTargetBlock('OPERATIONS');
  let lastOp = null;
  while (currentOp) {
    existingTypes.push(currentOp.type);
    lastOp = currentOp;
    currentOp = currentOp.getNextBlock();
  }

  const missingTypes = getMissingTypesByRequiredOrder(requiredInitialTypes, existingTypes);
  if (missingTypes.length === 0) return;

  missingTypes.forEach((type) => {
    if (!Blockly.Blocks[type]) return;
    const newOp = targetWorkspace.newBlock(type);
    newOp.initSvg();
    newOp.render();

    if (lastOp && lastOp.nextConnection && newOp.previousConnection) {
      lastOp.nextConnection.connect(newOp.previousConnection);
    } else if (proofStep.getInput('OPERATIONS')?.connection && newOp.previousConnection) {
      proofStep.getInput('OPERATIONS').connection.connect(newOp.previousConnection);
    }
    lastOp = newOp;
  });
}

function isProofOrOperationBlockType(blockType) {
  return ['proof_step', 'replace_operation', 'common_denominator_operation', 'conclusion_operation'].includes(blockType);
}

function getTopLevelMathBlocksSortedByY(targetWorkspace) {
  if (!targetWorkspace) return [];
  return targetWorkspace
    .getTopBlocks(false)
    .filter((block) => block && block.outputConnection && !isProofOrOperationBlockType(block.type))
    .sort((a, b) => a.getRelativeToSurfaceXY().y - b.getRelativeToSurfaceXY().y);
}

function findTopLevelBlockByType(targetWorkspace, blockType) {
  if (!targetWorkspace || !blockType) return null;
  const candidates = targetWorkspace
    .getTopBlocks(false)
    .filter((block) => block && block.type === blockType);
  if (candidates.length === 0) return null;
  return candidates.sort((a, b) => a.getRelativeToSurfaceXY().x - b.getRelativeToSurfaceXY().x)[0];
}

function getOrCreateProofStep(targetWorkspace) {
  let proofStep = targetWorkspace.getTopBlocks(false).find((b) => b.type === 'proof_step');
  if (proofStep) return proofStep;

  proofStep = targetWorkspace.newBlock('proof_step');
  proofStep.initSvg();
  proofStep.render();
  return proofStep;
}

function getOperationChain(proofStep) {
  const operations = [];
  let currentOp = proofStep?.getInputTargetBlock('OPERATIONS') || null;
  while (currentOp) {
    operations.push(currentOp);
    currentOp = currentOp.getNextBlock();
  }
  return operations;
}

function createOperationBlock(targetWorkspace, operationType) {
  const operation = targetWorkspace.newBlock(operationType);
  operation.initSvg();
  operation.render();
  return operation;
}

function ensureStatementConnected(statementInputConnection, operationBlock) {
  if (!statementInputConnection || !operationBlock?.previousConnection) return;
  const currentTarget = statementInputConnection.targetBlock();
  if (currentTarget === operationBlock) return;

  if (currentTarget) {
    currentTarget.unplug(true);
  }

  statementInputConnection.connect(operationBlock.previousConnection);
}

function connectMathToInputIfEmpty(operationBlock, inputName, mathBlock) {
  if (!operationBlock || !mathBlock || !mathBlock.outputConnection) return;
  const inputConnection = operationBlock.getInput(inputName)?.connection;
  if (!inputConnection || inputConnection.targetBlock()) return;
  inputConnection.connect(mathBlock.outputConnection);
}

function applyConditionalInitialStateGeneration(targetWorkspace) {
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
    let replaceOp = operations.find((op) => op.type === 'replace_operation') || null;
    let commonOp = needsCommonDenominator
      ? operations.find((op) => op.type === 'common_denominator_operation') || null
      : null;
    let conclusionOp = operations.find((op) => op.type === 'conclusion_operation') || null;

    if (!replaceOp) {
      replaceOp = createOperationBlock(targetWorkspace, 'replace_operation');
      ensureStatementConnected(operationInputConnection, replaceOp);
    }

    if (needsCommonDenominator && !commonOp) {
      commonOp = createOperationBlock(targetWorkspace, 'common_denominator_operation');
    }

    if (!conclusionOp) {
      conclusionOp = createOperationBlock(targetWorkspace, 'conclusion_operation');
    }

    if (needsCommonDenominator && commonOp) {
      if (replaceOp.nextConnection && commonOp.previousConnection) {
        const existingAfterReplace = replaceOp.nextConnection.targetBlock();
        if (existingAfterReplace && existingAfterReplace !== commonOp) {
          existingAfterReplace.unplug(true);
        }
        replaceOp.nextConnection.connect(commonOp.previousConnection);
      }
      if (commonOp.nextConnection && conclusionOp.previousConnection) {
        const existingAfterCommon = commonOp.nextConnection.targetBlock();
        if (existingAfterCommon && existingAfterCommon !== conclusionOp) {
          existingAfterCommon.unplug(true);
        }
        commonOp.nextConnection.connect(conclusionOp.previousConnection);
      }
    } else if (replaceOp.nextConnection && conclusionOp.previousConnection) {
      const existingAfterReplace = replaceOp.nextConnection.targetBlock();
      if (existingAfterReplace && existingAfterReplace !== conclusionOp) {
        existingAfterReplace.unplug(true);
      }
      replaceOp.nextConnection.connect(conclusionOp.previousConnection);
    }

    connectMathToInputIfEmpty(replaceOp, 'VALUE', leftExpressionBlock);
    connectMathToInputIfEmpty(conclusionOp, 'VALUE', rightExpressionBlock);
    return;
  }

  let conclusionOp = operations.find((op) => op.type === 'conclusion_operation') || null;
  if (!conclusionOp) {
    conclusionOp = createOperationBlock(targetWorkspace, 'conclusion_operation');
  }

  // OFF時は結論ブロックだけを証明チェーンに残す。
  ensureStatementConnected(operationInputConnection, conclusionOp);

  const refreshedOperations = getOperationChain(proofStep);
  refreshedOperations.forEach((op) => {
    if (op === conclusionOp) return;
    op.dispose(true);
  });

  if (conclusionOp.nextConnection?.targetBlock()) {
    conclusionOp.nextConnection.targetBlock().unplug(true);
  }

  connectMathToInputIfEmpty(conclusionOp, 'VALUE', rightExpressionBlock);
}

function removeTutorialRedundantConclusionExpression(targetWorkspace) {
  if (!targetWorkspace || !isTutorialStageId(currentStageNumber)) return;
  const conclusionOp = findTutorialConclusionOperation();
  const conclusionValue = conclusionOp?.getInputTargetBlock('VALUE');
  if (!conclusionValue) return;

  const topMathBlocks = targetWorkspace.getTopBlocks(false)
    .filter((block) => block && block.outputConnection)
    .filter((block) => !isProofOrOperationBlockType(block.type))
    .filter((block) => !block.type.startsWith('formula_'));
  if (topMathBlocks.length <= 2) return;

  const candidates = targetWorkspace.getTopBlocks(false)
    .filter((block) => block && block.outputConnection)
    .filter((block) => !isProofOrOperationBlockType(block.type))
    .filter((block) => !block.type.startsWith('formula_'))
    .filter((block) => block.type === conclusionValue.type && block.id !== conclusionValue.id);
  if (candidates.length === 0) return;

  const rightmost = candidates.sort((a, b) => b.getRelativeToSurfaceXY().x - a.getRelativeToSurfaceXY().x)[0];
  rightmost.dispose(true);
}

// UI helpers moved to app-ui.js.

function updateTutorialBanner(stageId) {
  updateTutorialProgress(stageId);
  const banner = document.getElementById('tutorial-banner');
  if (!banner) return;
  if (!isTutorialStageId(stageId)) {
    banner.textContent = '';
    banner.classList.remove('visible');
    hideTutorialHighlights();
    return;
  }

  const bannerText = getTutorialBannerText(stageId);
  banner.textContent = bannerText;
  banner.classList.toggle('visible', !!bannerText);
  updateTutorialHighlightUI(stageId);
}

function getTutorialToolboxElement() {
  return document.querySelector('.blocklyToolboxDiv');
}

function getTutorialToolboxCategoryLabel(labelText) {
  const labels = Array.from(document.querySelectorAll('.blocklyTreeLabel'));
  const exact = labels.find((node) => node.textContent?.trim() === labelText);
  if (exact) return exact;
  return labels.find((node) => node.textContent?.includes(labelText)) || null;
}

function getTutorialWorkspaceElement() {
  return document.getElementById('l');
}

function isRenderableElement(element) {
  if (!element || typeof element.getBoundingClientRect !== 'function') return false;
  const rect = element.getBoundingClientRect();
  return rect.width > 2 && rect.height > 2;
}

function getInputConnectionRect(block, inputName) {
  if (!block || typeof block.getInput !== 'function') return null;
  const input = block.getInput(inputName);
  const connection = input?.connection;
  if (!connection || typeof connection.getOffsetInPixels !== 'function') return null;
  const offset = connection.getOffsetInPixels();
  const metrics = workspace?.getMetrics?.();
  const absoluteLeft = Math.max(0, metrics?.absoluteMetrics?.left || 0);
  const absoluteTop = Math.max(0, metrics?.absoluteMetrics?.top || 0);
  const size = { width: 42, height: 28 };
  return {
    left: absoluteLeft + offset.x - size.width / 2,
    top: absoluteTop + offset.y - size.height / 2,
    width: size.width,
    height: size.height,
  };
}

function findFlyoutBlockElementByType(blockType) {
  if (!workspace) return null;
  const flyoutWorkspace = workspace.getToolbox()?.getFlyout()?.getWorkspace?.();
  if (!flyoutWorkspace) return null;
  const matchingBlock = flyoutWorkspace.getAllBlocks(false).find((block) => block.type === blockType);
  const root = typeof matchingBlock?.getSvgRoot === 'function' ? matchingBlock.getSvgRoot() : null;
  return isRenderableElement(root) ? root : null;
}

function getTutorialActionGateState() {
  const replaceOp = findTutorialReplaceOperation();
  const conclusionOp = findTutorialConclusionOperation();
  const formulaConnected = !!replaceOp?.getInputTargetBlock('FORMULA');
  const expressionsConnected = !!replaceOp?.getInputTargetBlock('VALUE')
    && !!replaceOp?.getInputTargetBlock('REPLACEMENT')
    && !!conclusionOp?.getInputTargetBlock('VALUE');

  return {
    hasReplace: !!replaceOp,
    hasConclusion: !!conclusionOp,
    hasFormula: formulaConnected,
    hasExpressions: expressionsConnected,
  };
}

function getTutorialGateAllowedTypes(stageId) {
  if (!isTutorialStageId(stageId)) return { allowAll: true, types: null };

  const targetState = getTutorialTargetOperationState(stageId);
  if (!targetState || targetState.isComplete) return { allowAll: true, types: null };

  const targetType = targetState.type;
  const targetBlock = targetState.block;

  const formulaBlockTypes = typeof getKnownFormulaIds === 'function'
    ? getKnownFormulaIds()
    : ['formula_1', 'formula_2', 'formula_3', 'formula_4', 'formula_5', 'formula_6', 'formula_7', 'formula_8'];
  const mathBlockTypes = ['custom_number', 'term_sin', 'term_cos', 'term_tan', 'term_sin2', 'term_cos2',
    'math_add', 'math_negate', 'math_multiply', 'math_fraction', 'math_square'];

  if (targetState.isMissing || !targetBlock) {
    return { allowAll: false, types: new Set([targetType]) };
  }

  const requiredFormulaIdsRaw = typeof getRequiredFormulaIdsForProblem === 'function'
    ? getRequiredFormulaIdsForProblem(currentProblemData)
    : [];
  const requiredFormulaIds = requiredFormulaIdsRaw
    .map((id) => String(id))
    .filter((id) => !!id)
    .filter((id) => (typeof isSupportedFormulaId === 'function' ? isSupportedFormulaId(id) : true));

  const hasFloatingFormula = workspace.getTopBlocks(false).some((block) => {
    const type = String(block.type || '');
    if (!type.startsWith('formula_')) return false;
    if (requiredFormulaIds.length === 0) return true;
    return requiredFormulaIds.includes(type);
  });

  const formulaMissing = targetType === 'replace_operation'
    && !targetBlock.getInputTargetBlock('FORMULA');
  if (formulaMissing && !hasFloatingFormula) {
    return { allowAll: false, types: new Set([...formulaBlockTypes, targetType]) };
  }

  const missingHole = getTutorialOperationMissingHole(targetType, targetBlock);
  const isFormulaHole = targetType === 'replace_operation'
    && missingHole
    && missingHole.key === 'fill-replace-formula';
  const hasFloatingMath = workspace.getTopBlocks(false).some((block) =>
    !isProofOrOperationBlockType(block.type) && !String(block.type || '').startsWith('formula_')
  );

  if (missingHole && !hasFloatingMath && !isFormulaHole) {
    return { allowAll: false, types: new Set([...mathBlockTypes, targetType]) };
  }

  return { allowAll: true, types: null };
}

function isTutorialGateAllowed(blockType, stageId) {
  if (!isTutorialStageId(stageId)) return true;
  const gate = getTutorialGateAllowedTypes(stageId);
  if (gate.allowAll) return true;
  return gate.types?.has(blockType);
}

function showTutorialStep() {
  if (!isTutorialStageId(currentStageNumber)) return;
  updateTutorialBanner(currentStageNumber);
}

function queueTutorialAutoAdvanceCheck() {
  if (!tutorialModeActive || !isTutorialStageId(currentStageNumber)) return;

  if (tutorialAutoAdvanceFrameId) {
    cancelAnimationFrame(tutorialAutoAdvanceFrameId);
    tutorialAutoAdvanceFrameId = 0;
  }

  tutorialAutoAdvanceFrameId = requestAnimationFrame(() => {
    tutorialAutoAdvanceFrameId = 0;

    let ast = [];
    try {
      ast = parseBlocksToAST(workspace, mathGenerator);
    } catch (_) {
      return;
    }

    const tutorialState = getTutorialCompletionState(ast);
    const nextStepIndex = Math.max(0, Math.min(tutorialState.firstMissingIndex, TUTORIAL_STEPS.length - 1));
    if (nextStepIndex !== tutorialStepIndex) {
      tutorialStepIndex = nextStepIndex;
      showTutorialStep();
    }
  });
}

function bindTutorialWorkspaceAutoAdvance() {
  if (tutorialWorkspaceListenerBound) return;
  tutorialWorkspaceListenerBound = true;

  workspace.addChangeListener((event) => {
    if (!tutorialModeActive || !isTutorialStageId(currentStageNumber)) return;
    if (!event) return;
    if (event.recordUndo === false) return;
    if (event.isUiEvent) {
      updateTutorialBanner(currentStageNumber);
      return;
    }
    if (event.type === Blockly.Events.BLOCK_CREATE && event.blockId) {
      const createdBlock = workspace.getBlockById(event.blockId);
      if (createdBlock && !isTutorialGateAllowed(createdBlock.type, currentStageNumber)) {
        createdBlock.dispose(true);
        showToast('順番どおりに操作しましょう。');
        applyTutorialBlockRestrictions();
        return;
      }
    }
    
    // チュートリアル中のブロック削除や移動を制限
    if (event.type === Blockly.Events.BLOCK_MOVE || event.type === Blockly.Events.BLOCK_DELETE) {
      // 特定のブロック（proof_step など重要なブロック）の削除は禁止
      const blockId = event.blockId;
      if (blockId) {
        const block = workspace.getBlockById(blockId);
        if (block && block.type === 'proof_step') {
          // proof_step の削除は禁止（イベント後に復元する）
          if (event.type === Blockly.Events.BLOCK_DELETE) {
            // これは自動復元されていないため、ログを記録
            console.warn('[Tutorial] proof_step deletion prevented');
          }
        }
      }
    }
    
    applyTutorialBlockRestrictions();
    updateTutorialBanner(currentStageNumber);
    queueTutorialAutoAdvanceCheck();
  });

  workspace.addChangeListener(() => {
    if (tutorialModeActive || !goalHintActive) return;
    updateTutorialHighlightUI(currentStageNumber);
  });
}

function getBlockSvgRoot(block) {
  return typeof block?.getSvgRoot === 'function' ? block.getSvgRoot() : null;
}

function showTutorialIntroModal() {
  const modal = document.getElementById('tutorial-intro-modal');
  if (!modal) return false;
  modal.classList.remove('hidden');
  const introVideo = document.getElementById('tutorial-intro-video');
  if (introVideo) {
    introVideo.currentTime = 0; // 最初に戻す
    introVideo.play().catch(e => console.log("自動再生ブロック", e));
  }
  return true;
}

function hideTutorialIntroModal() {
  const modal = document.getElementById('tutorial-intro-modal');
  if (modal) modal.classList.add('hidden');
}

async function advanceTutorialFlowOrComplete() {
  if (tutorialFlowIndex < tutorialFlowProblems.length - 1) {
    await loadTutorialFlowProblem(tutorialFlowIndex + 1);
    showToast(`<span style='color:#2563eb'>チュートリアル ${tutorialFlowIndex + 1}/${tutorialFlowProblems.length} へ進みました。</span>`);
    return;
  }

  await completeTutorialAndOpenMap();
}

// ===== ステージロード =====
/**
 * 指定ステージを読み込み、ワークスペースと UI を初期化する。
 * @param {number|string} stageNumber
 */
async function loadStage(stageNumber) {
  try {
    // 新しいステージロード時に操作ボタンを有効化
    const hintBtn = document.getElementById('btn-hint');
    if (hintBtn) hintBtn.disabled = false;
    const answerBtn = document.getElementById('btn-answer');
    if (answerBtn) answerBtn.disabled = false;
    const resetBtn = document.getElementById('btn-reset');
    if (resetBtn) resetBtn.disabled = false;
    const overwriteBtn = document.getElementById('btn-overwrite-permission');
    if (overwriteBtn) overwriteBtn.disabled = false;

    clearAutoAdvanceTimer();
    const isTutorialStage = isTutorialStageId(stageNumber);
    const stageKey = String(stageNumber);
    const numericStage = Math.max(60, Number(stageNumber) || 60); // 通常ステージは60から
    const stageFile = isTutorialStage
      ? `problems/tutorial/${stageKey}.json`
      : `problems/${numericStage}.json`;
    const response = await fetch(stageFile);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const rawText = await response.text();
    const sanitizedText = rawText.replace(/^\uFEFF/, '').trim();
    if (!sanitizedText) throw new Error('EMPTY_JSON');
    currentProblemData = JSON.parse(sanitizedText);
    // ファイル名由来のステージ番号を問題データに格納（JSON内のIDは保持）
    currentProblemData.stageNumber = numericStage;

    // requiredFormulas に応じて「初回公式アンロック」ポップアップを表示
    await ensureFormulasUnlockedForProblem(currentProblemData);

    currentStageSolved = false;
    currentSkipOffer = null;
    closeSkipChallengeModal();
    updateStreakCounter(false);

    const stageText = document.getElementById('r');
    const problemText = document.getElementById('s');
    if (stageText) {
      stageText.innerText = isTutorialStageId(stageNumber)
        ? `TUTORIAL ${getTutorialStageIndex(stageNumber) + 1}/${TUTORIAL_STAGE_IDS.length}`
        : `STAGE ${stageNumber}`;
    }
    if (problemText) problemText.innerText = currentProblemData.mathText || '';
    updateTutorialBanner(stageNumber);

    const toastElement = document.getElementById('toast-message');
    if (toastElement) toastElement.classList.add('hidden');

    if (window.MathJax) {
      MathJax.typesetClear();
      MathJax.typesetPromise();
    }

    // ツールボックスをアンロック済み公式 + 問題の式 から動的生成
    workspace.updateToolbox(buildToolboxConfig(currentProblemData));
    workspace.clear();
    Blockly.serialization.workspaces.load(currentProblemData.initialState, workspace);

    if (isTutorialStageId(stageNumber)) {
      removeTutorialRedundantConclusionExpression(workspace);
    } else {
      applyConditionalInitialStateGeneration(workspace);
      tutorialModeActive = false; // 非チュートリアルステージではチュートリアルモードを無効化
    }

    forceWorkspaceLayoutSync();
    arrangeBlocks(); // 最後に整列
    
    // チュートリアルステージの場合はブロック制限を適用
    if (isTutorialStageId(stageNumber)) {
      requestAnimationFrame(() => {
        applyTutorialBlockRestrictions();
      });
      tutorialModeActive = true;
      updateTutorialBanner(stageNumber);
    } else {
      // 非チュートリアルステージの場合は制限を解除
      clearTutorialBlockRestrictions();
    }

    const submitBtn = document.getElementById('btn-submit');
    if (submitBtn) submitBtn.style.display = 'inline-block';
    updateSubmitButtonState();
  } catch (error) {
    const errorText = error && error.message ? String(error.message) : '';
    const isHttpError = /^HTTP\s+\d+/.test(errorText);
    const isTutorialStage = isTutorialStageId(stageNumber);
    const stageKey = String(stageNumber);
    const numericStage = Math.max(60, Number(stageNumber) || 60); // 通常ステージは60から
    const stageFile = isTutorialStage
      ? `problems/tutorial/${stageKey}.json`
      : `problems/${numericStage}.json`;
    const detailSuffix = errorText ? ` (${errorText})` : '';
    const message = isHttpError
      ? `問題ファイルが見つかりません: ${stageFile}${detailSuffix}`
      : `問題ファイルの内容が不正です: ${stageFile}${detailSuffix}`;
    if (errorText) {
      console.error('[StageLoadError]', stageFile, error);
    }
    showToast(`<span style='color:red'>${message}</span>`, false);

    const stageText = document.getElementById('r');
    const problemText = document.getElementById('s');
    const submitBtn = document.getElementById('btn-submit');

    if (stageText) stageText.innerText = 'エラー';
    if (problemText) problemText.innerText = '';
    if (submitBtn) submitBtn.style.display = 'none';
  }
}

// ===== 判定用ジェネレーター =====
const mathGenerator = new Blockly.Generator('MATH');
window.mathGenerator = mathGenerator;
mathGenerator.forBlock.custom_number = function (block) {
  return [String(block.getFieldValue('NUM')), 0];
};
mathGenerator.forBlock.term_sin = function () {
  return ['sin(theta)', 0];
};
mathGenerator.forBlock.term_cos = function () {
  return ['cos(theta)', 0];
};
mathGenerator.forBlock.term_sin2 = function () {
  return ['sin(2 * theta)', 0];
};
mathGenerator.forBlock.term_cos2 = function () {
  return ['cos(2 * theta)', 0];
};
mathGenerator.forBlock.term_theta = function () {
  return ['theta', 0];
};
mathGenerator.forBlock.term_two_theta = function () {
  return ['(2 * theta)', 0];
};
mathGenerator.forBlock.term_three_theta = function () {
  return ['(3 * theta)', 0];
};
mathGenerator.forBlock.term_four_theta = function () {
  return ['(4 * theta)', 0];
};
mathGenerator.forBlock.term_five_theta = function () {
  return ['(5 * theta)', 0];
};
mathGenerator.forBlock.term_pi = function () {
  return ['pi', 0];
};
mathGenerator.forBlock.term_pi_sixth = function () {
  return ['(pi/6)', 0];
};
mathGenerator.forBlock.term_pi_quarter = function () {
  return ['(pi/4)', 0];
};
mathGenerator.forBlock.term_pi_third = function () {
  return ['(pi/3)', 0];
};
mathGenerator.forBlock.term_pi_half = function () {
  return ['(pi/2)', 0];
};
mathGenerator.forBlock.term_two_pi_thirds = function () {
  return ['((2*pi)/3)', 0];
};
mathGenerator.forBlock.term_three_pi_quarters = function () {
  return ['((3*pi)/4)', 0];
};
mathGenerator.forBlock.term_five_pi_sixths = function () {
  return ['((5*pi)/6)', 0];
};
mathGenerator.forBlock.term_half_value = function () {
  return ['(1/2)', 0];
};
mathGenerator.forBlock.term_sqrt2_half = function () {
  return ['(sqrt(2)/2)', 0];
};
mathGenerator.forBlock.term_sqrt3_half = function () {
  return ['(sqrt(3)/2)', 0];
};
mathGenerator.forBlock.term_tan = function () {
  return ['tan(theta)', 0];
};
mathGenerator.forBlock.term_sin_of = function (block) {
  return [`sin(${mathGenerator.valueToCode(block, 'ANGLE', 0) || '0'})`, 0];
};
mathGenerator.forBlock.term_cos_of = function (block) {
  return [`cos(${mathGenerator.valueToCode(block, 'ANGLE', 0) || '0'})`, 0];
};
mathGenerator.forBlock.term_tan_of = function (block) {
  return [`tan(${mathGenerator.valueToCode(block, 'ANGLE', 0) || '0'})`, 0];
};
mathGenerator.forBlock.math_add = function (block) {
  return [`(${mathGenerator.valueToCode(block, 'A', 0) || '0'} + ${mathGenerator.valueToCode(block, 'B', 0) || '0'})`, 0];
};
mathGenerator.forBlock.math_negate = function (block) {
  return [`(-(${mathGenerator.valueToCode(block, 'A', 0) || '0'}))`, 0];
};
mathGenerator.forBlock.math_multiply = function (block) {
  return [`(${mathGenerator.valueToCode(block, 'A', 0) || '1'} * ${mathGenerator.valueToCode(block, 'B', 0) || '1'})`, 0];
};
mathGenerator.forBlock.math_fraction = function (block) {
  return [`(${mathGenerator.valueToCode(block, 'NUMERATOR', 0) || '0'}) / (${mathGenerator.valueToCode(block, 'DENOMINATOR', 0) || '1'})`, 0];
};
mathGenerator.forBlock.math_square = function (block) {
  return [`(${mathGenerator.valueToCode(block, 'A', 0) || '0'})^2`, 0];
};
mathGenerator.forBlock.formula_1 = function () {
  return ['sin(x)^2 + cos(x)^2 = 1', 0];
};
mathGenerator.forBlock.formula_2 = function () {
  return ['tan(x) = sin(x) / cos(x)', 0];
};
mathGenerator.forBlock.formula_3 = function () {
  return ['1 + tan(x)^2 = 1 / cos(x)^2', 0];
};
mathGenerator.forBlock.formula_4 = function () {
  return ['sin(2 * x) = 2 * sin(x) * cos(x)', 0];
};
mathGenerator.forBlock.formula_5 = function () {
  return ['sin(x)^2 = (1 - cos(2 * x)) / 2', 0];
};
mathGenerator.forBlock.formula_6 = function () {
  return ['cos(x)^2 = (1 + cos(2 * x)) / 2', 0];
};
mathGenerator.forBlock.formula_7 = function () {
  return ['tan(x) = sin(2 * x) / (1 + cos(2 * x))', 0];
};
mathGenerator.forBlock.formula_8 = function () {
  return ['tan(x)^2 = (1 - cos(2 * x)) / (1 + cos(2 * x))', 0];
};
mathGenerator.forBlock.formula_9 = function () {
  return ['(sin(x) + cos(x))^2 = sin(x)^2 + 2 * sin(x) * cos(x) + cos(x)^2', 0];
};
mathGenerator.forBlock.formula_10 = function () {
  return ['sin(x)^4 + cos(x)^4 + 2 * sin(x)^2 * cos(x)^2 = (sin(x)^2 + cos(x)^2)^2', 0];
};
mathGenerator.forBlock.formula_11 = function () {
  return ['sin(x)^6 + cos(x)^6 = (sin(x)^2 + cos(x)^2) * (sin(x)^4 - sin(x)^2 * cos(x)^2 + cos(x)^4)', 0];
};
mathGenerator.forBlock.formula_12 = function () {
  return ['sin(3 * x) = 3 * sin(x) - 4 * sin(x)^3', 0];
};
mathGenerator.forBlock.formula_13 = function () {
  return ['cos(3 * x) = 4 * cos(x)^3 - 3 * cos(x)', 0];
};
mathGenerator.forBlock.formula_14 = function () {
  return ['sin(x) + sin(y) = 2 * sin((x + y) / 2) * cos((x - y) / 2)', 0];
};
mathGenerator.forBlock.formula_15 = function () {
  return ['sin(x) * cos(y) = (sin(x + y) + sin(x - y)) / 2', 0];
};
mathGenerator.forBlock.formula_16 = function () {
  return ['tan(2 * x) = (2 * tan(x)) / (1 - tan(x)^2)', 0];
};
mathGenerator.forBlock.formula_addition_sin = function () {
  return ['sin(x + y) = sin(x) * cos(y) + cos(x) * sin(y)', 0];
};
mathGenerator.forBlock.formula_addition_cos = function () {
  return ['cos(x + y) = cos(x) * cos(y) - sin(x) * sin(y)', 0];
};
mathGenerator.forBlock.formula_addition_tan = function () {
  return ['tan(x + y) = (tan(x) + tan(y)) / (1 - tan(x) * tan(y))', 0];
};

