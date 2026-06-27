// ===== app-guide.js =====
// ヒント機能、チュートリアルの案内テキスト、次に埋めるべき穴のハイライト（光る枠）を担当します

window.goalHintActive = false;
window.currentHighlightTargetNode = null;
window.highlightTrackingFrameId = 0;

// ====== 1. ブロックの解析・目標設定 ======
window.parseRequiredBlockTypes = function(requiredBlocks) {
  if (!Array.isArray(requiredBlocks)) return [];
  return requiredBlocks.map((entry) => {
    if (typeof entry !== 'string') return null;
    const match = entry.match(/type\"?\s*:\s*\"([a-zA-Z0-9_]+)\"/);
    if (match && match[1]) return match[1];
    const plain = entry.match(/^[a-zA-Z0-9_]+$/);
    return plain ? entry : null;
  }).filter(Boolean);
};

window.isProofOrOperationBlockType = function(blockType) {
  return ['proof_step', 'replace_operation', 'common_denominator_operation', 'conclusion_operation'].includes(blockType);
};

window.getTutorialOperationLabel = function(type) {
  if (type === 'replace_operation') return '置き換え';
  if (type === 'common_denominator_operation') return '通分';
  if (type === 'conclusion_operation') return 'よって';
  return type || '操作';
};

window.getTutorialOperationMissingHole = function(type, block) {
  if (!block) return null;
  if (type === 'replace_operation') {
    if (!block.getInputTargetBlock('VALUE')) return { key: 'fill-replace-value', text: '【目標】『置き換え』ブロックの「式」の穴を埋めましょう。' };
    if (!block.getInputTargetBlock('FORMULA')) return { key: 'fill-replace-formula', text: '【目標】『置き換え』ブロックの「公式」の穴を埋めましょう。' };
    if (!block.getInputTargetBlock('REPLACEMENT')) return { key: 'fill-replace-result', text: '【目標】『置き換え』ブロックの「結果」の穴を埋めましょう。' };
  }
  if (type === 'common_denominator_operation') {
    if (!block.getInputTargetBlock('VALUE') || !block.getInputTargetBlock('REPLACEMENT')) return { key: 'fill-common', text: '【目標】『通分』ブロックの空いている穴を埋めましょう。' };
  }
  if (type === 'conclusion_operation') {
    if (!block.getInputTargetBlock('VALUE')) return { key: 'fill-conclusion-value', text: '【目標】『よって〜となる』ブロックの空いている穴を埋めましょう。' };
  }
  return null;
};

window.sortBlocksByPosition = function(blocks) {
  return (blocks || []).slice().sort((first, second) => {
    const firstPos = first?.getRelativeToSurfaceXY?.() || { x: 0, y: 0 };
    const secondPos = second?.getRelativeToSurfaceXY?.() || { x: 0, y: 0 };
    if (firstPos.y !== secondPos.y) return firstPos.y - secondPos.y;
    return firstPos.x - secondPos.x;
  });
};

window.getTutorialTargetOperationState = function(stageId) {
  if (!window.workspace || !window.currentProblemData) return null;
  const requiredTypes = window.parseRequiredBlockTypes(window.currentProblemData.requiredBlocks || []);
  if (requiredTypes.length === 0) return { isComplete: true, requiredTypes: [] };

  const blocksByType = Object.create(null);
  requiredTypes.forEach((type) => {
    if (!blocksByType[type]) {
      blocksByType[type] = window.sortBlocksByPosition(window.workspace.getBlocksByType(type, false));
    }
  });

  const usedCounts = Object.create(null);
  for (const type of requiredTypes) {
    const index = usedCounts[type] || 0;
    const block = (blocksByType[type] || [])[index] || null;
    if (!block) return { isComplete: false, type, block: null, isMissing: true };

    const missingHole = window.getTutorialOperationMissingHole(type, block);
    if (missingHole) return { isComplete: false, type, block, isMissing: false };

    usedCounts[type] = index + 1;
  }
  return { isComplete: true, requiredTypes };
};

window.getTutorialGoalState = function(stageId) {
  const targetState = window.getTutorialTargetOperationState(stageId);
  if (!targetState || targetState.isComplete) {
    return { key: 'ready-check', text: '【目標】必要な穴が埋まったら、「正解をチェック」ボタンを押しましょう。' };
  }

  const targetType = targetState.type;
  const targetLabel = window.getTutorialOperationLabel(targetType);
  const targetBlock = targetState.block;

  if (targetState.isMissing || !targetBlock) {
    const key = targetType === 'replace_operation' ? 'pull-replace' : targetType === 'common_denominator_operation' ? 'pull-common' : 'pull-conclusion';
    return { key, text: `【目標】左のメニューから『${targetLabel}』ブロックを引き出しましょう。` };
  }

  const missingHole = window.getTutorialOperationMissingHole(targetType, targetBlock);
  const isFormulaHole = targetType === 'replace_operation' && missingHole && missingHole.key === 'fill-replace-formula';

  const hasFloatingMath = window.workspace.getTopBlocks(false).some((block) =>
    !window.isProofOrOperationBlockType(block.type) && !String(block.type || '').startsWith('formula_')
  );

  if (missingHole && !hasFloatingMath && !isFormulaHole) {
    if (targetType === 'conclusion_operation') {
      return { key: 'pull-math-conclusion', text: '【目標】左のメニューから、よってに入る「数式」ブロックを引き出しましょう。' };
    }
    return { key: 'pull-math-parts', text: '【目標】左のメニューから、穴を埋めるための「数式」ブロックを引き出しましょう。' };
  }
  if (missingHole) return missingHole;

  return { key: 'ready-check', text: '【目標】必要な穴が埋まったら、「正解をチェック」ボタンを押しましょう。' };
};

window.getTutorialBannerText = function(stageId) {
  // ① 本編ステージで JSON に hints が設定されている場合はそれを優先表示
  if (typeof window.isTutorialStageId === 'function' && !window.isTutorialStageId(stageId)) {
    if (window.currentProblemData && Array.isArray(window.currentProblemData.hints) && window.currentProblemData.hints.length > 0) {
      const index = window.currentHintIndex || 0;
      return `💡 ヒント ${index + 1}/${window.currentProblemData.hints.length}： ${window.currentProblemData.hints[index]}`;
    }
  }
  // ② チュートリアルやヒント未設定の場合はブロックの配置状況から自動生成
  const state = window.getTutorialGoalState(stageId);
  return state ? state.text : '';
};


// ====== 2. 次の行動を示すハイライト（光る枠）機能 ======
window.findTutorialReplaceOperation = function() {
  return window.workspace?.getTopBlocks(false)?.find((block) => block.type === 'proof_step')?.getInputTargetBlock('OPERATIONS');
};
window.getTutorialToolboxCategoryLabel = function(labelText) {
  const labels = Array.from(document.querySelectorAll('.blocklyTreeLabel'));
  return labels.find((node) => node.textContent?.includes(labelText)) || null;
};
window.getTutorialToolboxElement = function() {
  return document.querySelector('.blocklyToolboxDiv');
};

window.getInputConnectionRect = function(block, inputName) {
  if (!block || typeof block.getInput !== 'function') return null;
  const input = block.getInput(inputName);
  const connection = input?.connection;
  if (!connection || typeof connection.getOffsetInPixels !== 'function') return null;
  const offset = connection.getOffsetInPixels();
  const metrics = window.workspace?.getMetrics?.();
  const absoluteLeft = Math.max(0, metrics?.absoluteMetrics?.left || 0);
  const absoluteTop = Math.max(0, metrics?.absoluteMetrics?.top || 0);
  const size = { width: 42, height: 28 };
  return {
    left: absoluteLeft + offset.x - size.width / 2,
    top: absoluteTop + offset.y - size.height / 2,
    width: size.width,
    height: size.height,
  };
};

window.getTutorialHighlightTargets = function(stageId) {
  const goal = window.getTutorialGoalState(stageId);
  const goalKey = goal?.key || '';
  const toolboxLabel = window.getTutorialToolboxCategoryLabel('証明') || window.getTutorialToolboxElement();

  if (goalKey.startsWith('pull-math-')) return { target: window.getTutorialToolboxCategoryLabel('基本') || toolboxLabel };
  if (goalKey === 'pull-formula') return { target: window.getTutorialToolboxCategoryLabel('公式') || toolboxLabel };
  if (goalKey.startsWith('pull-')) return { target: toolboxLabel };

  const operations = window.workspace?.getTopBlocks(false)?.find(b => b.type === 'proof_step')?.getInputTargetBlock('OPERATIONS');
  let currentOp = operations;
  while(currentOp) {
    const missingHole = window.getTutorialOperationMissingHole(currentOp.type, currentOp);
    if (missingHole && missingHole.key === goalKey) {
      if (goalKey === 'fill-replace-value') return { target: window.getInputConnectionRect(currentOp, 'VALUE') || toolboxLabel };
      if (goalKey === 'fill-replace-formula') return { target: window.getInputConnectionRect(currentOp, 'FORMULA') || toolboxLabel };
      if (goalKey === 'fill-replace-result') return { target: window.getInputConnectionRect(currentOp, 'REPLACEMENT') || toolboxLabel };
      if (goalKey === 'fill-common' && !currentOp.getInputTargetBlock('VALUE')) return { target: window.getInputConnectionRect(currentOp, 'VALUE') || toolboxLabel };
      if (goalKey === 'fill-common' && !currentOp.getInputTargetBlock('REPLACEMENT')) return { target: window.getInputConnectionRect(currentOp, 'REPLACEMENT') || toolboxLabel };
      if (goalKey === 'fill-conclusion-value') return { target: window.getInputConnectionRect(currentOp, 'VALUE') || toolboxLabel };
    }
    currentOp = currentOp.getNextBlock();
  }

  if (goalKey === 'ready-check') {
    const submitBtn = document.getElementById('btn-submit');
    if (submitBtn) return { target: submitBtn };
  }
  return { target: toolboxLabel };
};

window.startHighlightTracking = function() {
  if (window.highlightTrackingFrameId) cancelAnimationFrame(window.highlightTrackingFrameId);
  function track() {
    const pulseElement = document.getElementById('tutorial-highlight-target');
    if (pulseElement && window.currentHighlightTargetNode && !pulseElement.classList.contains('hidden')) {
      const rect = typeof window.currentHighlightTargetNode.getBoundingClientRect === 'function' ? window.currentHighlightTargetNode.getBoundingClientRect() : window.currentHighlightTargetNode;
      if (rect.width > 0 && rect.height > 0) {
        pulseElement.style.left = rect.left + 'px';
        pulseElement.style.top = rect.top + 'px';
        pulseElement.style.width = rect.width + 'px';
        pulseElement.style.height = rect.height + 'px';
      }
    }
    window.highlightTrackingFrameId = requestAnimationFrame(track);
  }
  track();
};


// ====== 3. ヒント表示UIの制御 ======
window.updateTutorialHighlightUI = function(stageNumber) {
  if (!window.workspace || !window.currentProblemData) return;
  const targetPulse = document.getElementById('tutorial-highlight-target');
  const banner = document.getElementById('tutorial-banner');
  const underProblem = document.getElementById('tutorial-next-under-problem');

  if (targetPulse) targetPulse.classList.add('hidden');

  let goalText = '';
  let highlightTargets = null;
  try {
    goalText = window.getTutorialBannerText(stageNumber) || '';
    highlightTargets = window.getTutorialHighlightTargets(stageNumber);
  } catch (err) {
    console.warn('[Guide] ハイライト計算をスキップ:', err);
  }

  window.currentHighlightTargetNode = null;

  if (highlightTargets?.target) {
    window.currentHighlightTargetNode = highlightTargets.target;
    // ガイド（ヒント状態）がアクティブな時だけ枠を光らせる
    if (window.goalHintActive) {
      if (targetPulse) targetPulse.classList.remove('hidden');
    }
  }

  window.startHighlightTracking();

  // 🛠️ チュートリアルモードの表示制御
  if (window.tutorialModeActive) {
    if (banner) {
      if (window.goalHintActive) {
        banner.innerHTML = goalText;
        banner.classList.add('visible'); // 表示クラスを付与
        banner.style.display = 'block';   // 強制表示
      } else {
        banner.innerHTML = '';
        banner.classList.remove('visible');
        banner.style.display = 'none';    // 非表示
      }
    }
    return;
  }

  // 本編モードの表示制御
  if (underProblem) {
    if (window.goalHintActive) {
      underProblem.innerHTML = goalText;
      underProblem.classList.add('visible');
      underProblem.classList.add('pulse');
    } else {
      underProblem.innerHTML = '';
      underProblem.classList.remove('visible');
      underProblem.classList.remove('pulse');
    }
  }
};

window.hideTutorialHighlights = function() {
  const target = document.getElementById('tutorial-highlight-target');
  if (target) target.classList.add('hidden');
};

window.showGoalHintForStage = function() {
  window.goalHintActive = true;
  const hintButton = document.getElementById('btn-hint');
  if (hintButton) hintButton.textContent = 'ヒントを消す';
  window.updateTutorialHighlightUI(window.currentStageNumber);
};

window.hideGoalHintForStage = function() {
  window.goalHintActive = false;
  const hintButton = document.getElementById('btn-hint');
  if (hintButton) hintButton.textContent = 'ヒント';
  window.updateTutorialHighlightUI(window.currentStageNumber);
  window.hideTutorialHighlights();
};

// ====== 4. ブロック変化の監視とボタン初期化 ======
window.bindGuideWorkspaceListener = function() {
  if (window.guideWorkspaceListenerBound) return;
  if (!window.workspace || typeof window.workspace.addChangeListener !== 'function') return;
  window.guideWorkspaceListenerBound = true;
  window.workspace.addChangeListener(function(event) {
    if (!window.goalHintActive) return;
    if (event && event.isUiEvent) return; 
    window.updateTutorialHighlightUI(window.currentStageNumber);
  });
};

window.initGuideFeature = function() {
  window.bindGuideWorkspaceListener();
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function() {
    setTimeout(window.initGuideFeature, 0);
  });
} else {
  setTimeout(window.initGuideFeature, 0);
}

// ====== 5. ヒントボタンのクリック制御 ======
window.setupGuideButton = function () {
  const btn = document.getElementById('btn-hint');
  if (!btn || btn.dataset.guideBound === '1') return;
  btn.dataset.guideBound = '1';
  
  btn.addEventListener('click', function () {
    // 🛠️ 【ここを完全修正】チュートリアル中でも本編でも共通のトグル（ON/OFF）制御に変更
    if (window.goalHintActive) {
      window.hideGoalHintForStage();
    } else {
      window.showGoalHintForStage();
    }
  });
};

// 初期化プロトコルの結合
const oldInit = window.initGuideFeature;
window.initGuideFeature = function() {
  if (typeof oldInit === 'function') oldInit();
  if (typeof window.setupGuideButton === 'function') window.setupGuideButton();
};