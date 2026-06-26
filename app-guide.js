// ===== app-guide.js =====
// ガイド（ヒント）機能の復旧モジュール。
// ブロックの状態に応じて「次に埋めるべき穴」を判定し、問題文の下の案内テキストと
// ワークスペース上のハイライト枠を更新する。btn-hint ボタンで ON/OFF する。
//
// 依存（app-state.js 等に既存）: getTutorialGoalState, getTutorialTargetOperationState,
//   findTutorialReplaceOperation, findTutorialConclusionOperation, isTutorialStageId,
//   currentStageNumber, goalHintActive, tutorialModeActive など
//
// 本ファイルは関数を window に公開し、他ファイルから呼べるようにする。

(function () {
  // ---- find系（app-state.js のガード呼び出しが拾えるよう window 公開）----
  function findTutorialReplaceOperation() {
    const proofStep = workspace?.getTopBlocks(false)?.find((block) => block.type === 'proof_step');
    if (!proofStep) return null;
    let current = proofStep.getInputTargetBlock('OPERATIONS');
    while (current) {
      if (current.type === 'replace_operation') return current;
      current = current.getNextBlock();
    }
    return null;
  }
  function findTutorialConclusionOperation() {
    const proofStep = workspace?.getTopBlocks(false)?.find((block) => block.type === 'proof_step');
    if (!proofStep) return null;
    let current = proofStep.getInputTargetBlock('OPERATIONS');
    while (current) {
      if (current.type === 'conclusion_operation') return current;
      current = current.getNextBlock();
    }
    return null;
  }
  window.findTutorialReplaceOperation = findTutorialReplaceOperation;
  window.findTutorialConclusionOperation = findTutorialConclusionOperation;
  window.findTutorialCommonDenominatorOperation = findTutorialCommonDenominatorOperation;
  if (typeof globalThis !== "undefined") {
    globalThis.findTutorialReplaceOperation = findTutorialReplaceOperation;
    globalThis.findTutorialConclusionOperation = findTutorialConclusionOperation;
  }

  // ---- getTutorialOperationLabel ----
  function getTutorialOperationLabel(type) {
    if (type === 'replace_operation') return '置き換え';
    if (type === 'common_denominator_operation') return '通分';
    if (type === 'conclusion_operation') return 'よって';
    return type || '操作';
  }
  // ---- sortBlocksByPosition ----
  function sortBlocksByPosition(blocks) {
    return (blocks || []).slice().sort((first, second) => {
      const firstPos = first?.getRelativeToSurfaceXY?.() || { x: 0, y: 0 };
      const secondPos = second?.getRelativeToSurfaceXY?.() || { x: 0, y: 0 };
      if (firstPos.y !== secondPos.y) return firstPos.y - secondPos.y;
      return firstPos.x - secondPos.x;
    });
  }
  // ---- getTutorialExpectedFormulaType ----
  function getTutorialExpectedFormulaType(stageId) {
    const stage = String(stageId);
    if (stage === '0-1') return 'formula_1';
    if (stage === '0-2') return 'formula_2';
    if (stage === '0-3') return 'formula_3';
    if (stage === '0-4') return 'formula_1';
    if (stage === '0-5') return 'formula_2';
    if (stage === '0-6') return 'formula_1';
    if (stage === '0-7') return 'formula_1';
    return null;
  }
  // ---- getTutorialExpectedFormulaLabel ----
  function getTutorialExpectedFormulaLabel(stageId) {
    const formulaType = getTutorialExpectedFormulaType(stageId);
    if (formulaType === 'formula_1') return '公式①';
    if (formulaType === 'formula_2') return '公式②';
    if (formulaType === 'formula_3') return '公式③';
    return '公式';
  }
  // ---- isTutorialPullModeStage ----
  function isTutorialPullModeStage(stageId) {
    const stage = String(stageId);
    return stage === '0-4' || stage === '0-5';
  }
  // ---- findTutorialCommonDenominatorOperation ----
  function findTutorialCommonDenominatorOperation() {
    const proofStep = workspace?.getTopBlocks(false)?.find((block) => block.type === 'proof_step');
    if (!proofStep) return null;
    let current = proofStep.getInputTargetBlock('OPERATIONS');
    while (current) {
      if (current.type === 'common_denominator_operation') return current;
      current = current.getNextBlock();
    }
    return null;
  }
  // ---- getTutorialToolboxElement ----
  function getTutorialToolboxElement() {
    return document.querySelector('.blocklyToolboxDiv');
  }
  // ---- getTutorialToolboxCategoryLabel ----
  function getTutorialToolboxCategoryLabel(labelText) {
    const labels = Array.from(document.querySelectorAll('.blocklyTreeLabel'));
    const exact = labels.find((node) => node.textContent?.trim() === labelText);
    if (exact) return exact;
    return labels.find((node) => node.textContent?.includes(labelText)) || null;
  }
  // ---- getInputConnectionRect ----
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
  // ---- getTutorialHighlightTargets ----
  function getTutorialHighlightTargets(stageId) {
    if (!isTutorialStageId(stageId)) return null;
    const replaceOp = findTutorialReplaceOperation();
    const commonOp = findTutorialCommonDenominatorOperation();
    const conclusionOp = findTutorialConclusionOperation();
    const toolboxLabel = getTutorialToolboxCategoryLabel('証明') || getTutorialToolboxElement();
    const goal = getTutorialGoalState(stageId);
    const goalKey = goal?.key || '';
  
    // メニューを引かせる場合のハイライト
    if (goalKey.startsWith('pull-math-')) {
      const mathCat = getTutorialToolboxCategoryLabel('基本') || toolboxLabel;
      return { source: mathCat, target: mathCat };
    }
    if (goalKey === 'pull-formula') {
      const formulaCat = getTutorialToolboxCategoryLabel('公式') || toolboxLabel;
      return { source: formulaCat, target: formulaCat };
    }
    if (goalKey.startsWith('pull-')) {
      return { source: toolboxLabel, target: toolboxLabel };
    }
  
    // 穴埋めのハイライト
    if (goalKey === 'fill-replace-value' && replaceOp) {
      return { source: toolboxLabel, target: getInputConnectionRect(replaceOp, 'VALUE') || toolboxLabel };
    }
    if (goalKey === 'fill-replace-formula' && replaceOp) {
      return { source: toolboxLabel, target: getInputConnectionRect(replaceOp, 'FORMULA') || toolboxLabel };
    }
    if (goalKey === 'fill-replace-result' && replaceOp) {
      return { source: toolboxLabel, target: getInputConnectionRect(replaceOp, 'REPLACEMENT') || toolboxLabel };
    }
    if (goalKey === 'fill-common' && commonOp) {
      if (!commonOp.getInputTargetBlock('VALUE')) {
        return { source: toolboxLabel, target: getInputConnectionRect(commonOp, 'VALUE') || toolboxLabel };
      }
      if (!commonOp.getInputTargetBlock('REPLACEMENT')) {
        return { source: toolboxLabel, target: getInputConnectionRect(commonOp, 'REPLACEMENT') || toolboxLabel };
      }
    }
  
    // 👇✨ 新規追加：結論の穴埋めハイライト
    if (goalKey === 'fill-conclusion-value' && conclusionOp) {
      return { source: toolboxLabel, target: getInputConnectionRect(conclusionOp, 'VALUE') || toolboxLabel };
    }
  
    if (goalKey === 'ready-check') {
      const submitBtn = document.getElementById('btn-submit');
      if (submitBtn) return { source: submitBtn, target: submitBtn };
    }
  
    return { source: toolboxLabel, target: toolboxLabel };
  }
  // ---- hideTutorialHighlights ----
  function hideTutorialHighlights() {
    const source = document.getElementById('tutorial-highlight-source');
    const target = document.getElementById('tutorial-highlight-target');
    if (source) source.classList.add('hidden');
    if (target) target.classList.add('hidden');
  }
  // ---- positionTutorialHighlight ----
  function positionTutorialHighlight(element, highlight) {
    if (!element || !highlight) return false;
    const rect = element.getBoundingClientRect ? element.getBoundingClientRect() : element;
    if (!rect || rect.width <= 2 || rect.height <= 2) return false;
    const padding = 6;
    highlight.style.left = `${rect.left - padding}px`;
    highlight.style.top = `${rect.top - padding}px`;
    highlight.style.width = `${rect.width + padding * 2}px`;
    highlight.style.height = `${rect.height + padding * 2}px`;
    return true;
  }
  // ---- updateTutorialHighlightUI ----
  function updateTutorialHighlightUI(stageNumber) {
    if (!workspace || !currentProblemData) return;
  
    const targetPulse = document.getElementById('tutorial-highlight-target');
    const sourcePulse = document.getElementById('tutorial-highlight-source'); // 掴む側の強調は廃止
    const banner = document.getElementById('tutorial-banner');
    const underProblem = document.getElementById('tutorial-next-under-problem');
  
    if (sourcePulse) sourcePulse.classList.add('hidden');
    if (targetPulse) targetPulse.classList.add('hidden');
  
    const goalState = getTutorialGoalState(stageNumber);
    const goalText = goalState?.text || '';
    const highlightTargets = getTutorialHighlightTargets(stageNumber);
  
    currentHighlightTargetNode = null;
    currentHighlightInputObj = null;
  
    if (highlightTargets?.target) {
      currentHighlightTargetNode = highlightTargets.target;
      if (targetPulse) targetPulse.classList.remove('hidden');
    }
  
    startHighlightTracking();
  
    if (tutorialModeActive) {
      if (banner) banner.innerHTML = goalText;
      return;
    }
  
    if (window.goalHintActive && underProblem) {
      underProblem.textContent = goalText;
      underProblem.classList.add('visible');
      underProblem.classList.add('pulse');
    }
  }
  // ---- startHighlightTracking ----
  function startHighlightTracking() {
    if (highlightTrackingFrameId) cancelAnimationFrame(highlightTrackingFrameId);
  
    function track() {
      const pulseElement = document.getElementById('tutorial-highlight-target');
      if (pulseElement && currentHighlightTargetNode && !pulseElement.classList.contains('hidden')) {
        const rect = typeof currentHighlightTargetNode.getBoundingClientRect === 'function'
          ? currentHighlightTargetNode.getBoundingClientRect()
          : currentHighlightTargetNode;
        if (rect.width > 0 && rect.height > 0) {
          let left = rect.left;
          let top = rect.top;
          let width = rect.width;
          let height = rect.height;
  
          const orbSize = 36;
  
          if (currentHighlightInputObj) {
            if (currentHighlightInputObj.type === Blockly.INPUT_VALUE) {
              left = rect.right - (orbSize / 2) - 10;
              top = rect.top + (rect.height / 2) - (orbSize / 2);
            } else if (currentHighlightInputObj.type === Blockly.NEXT_STATEMENT) {
              left = rect.left + 20;
              top = rect.bottom - (orbSize / 2);
            }
            width = orbSize;
            height = orbSize;
          }
  
          pulseElement.style.left = left + 'px';
          pulseElement.style.top = top + 'px';
          pulseElement.style.width = width + 'px';
          pulseElement.style.height = height + 'px';
        }
      }
      highlightTrackingFrameId = requestAnimationFrame(track);
    }
    track();
  }
  // ---- applyTutorialHighlight ----
  function applyTutorialHighlight(element, rect) {
    if (!rect || (rect.width === 0 && rect.height === 0)) return;
    element.style.left = rect.left + 'px';
    element.style.top = rect.top + 'px';
    element.style.width = rect.width + 'px';
    element.style.height = rect.height + 'px';
    element.classList.remove('hidden');
  }
  // ---- showGoalHintForStage ----
  function showGoalHintForStage() {
    window.goalHintActive = true;
    const hintButton = document.getElementById('btn-hint');
    if (hintButton) hintButton.textContent = 'ヒントを消す';
    updateTutorialHighlightUI(window.currentStageNumber);
  }
  // ---- hideGoalHintForStage ----
  function hideGoalHintForStage() {
    window.goalHintActive = false;
    const hintButton = document.getElementById('btn-hint');
    if (hintButton) hintButton.textContent = 'ヒント';
    const underProblem = document.getElementById('tutorial-next-under-problem');
    if (underProblem) {
      underProblem.textContent = '';
      underProblem.classList.remove('visible');
      underProblem.classList.remove('pulse');
    }
    hideTutorialHighlights();
  }
  // ---- ブロック変化の監視（ガイドONのとき追従更新） ----
  window.bindGuideWorkspaceListener = function () {
    if (window.guideWorkspaceListenerBound) return;
    if (!window.workspace) return;
    window.guideWorkspaceListenerBound = true;
    window.workspace.addChangeListener(function () {
      if (window.tutorialModeActive || !window.goalHintActive) return;
      updateTutorialHighlightUI(window.currentStageNumber);
    });
  };

  // ---- btn-hint ボタンのトグル設定 ----
  window.setupGuideButton = function () {
    var btn = document.getElementById('btn-hint');
    if (!btn || btn.dataset.guideBound === '1') return;
    btn.dataset.guideBound = '1';
    btn.addEventListener('click', function () {
      if (window.tutorialModeActive) {
        if (typeof window.showToast === 'function') {
          window.showToast((typeof getTutorialBannerText === 'function'
            ? getTutorialBannerText(window.currentStageNumber) : '')
            || '【目標】ブロックの空いている穴に、対応する式をはめ込みましょう。', true);
        }
        updateTutorialHighlightUI(window.currentStageNumber);
        return;
      }
      if (window.goalHintActive) hideGoalHintForStage();
      else showGoalHintForStage();
    });
  };

  // 公開
  window.showGoalHintForStage = showGoalHintForStage;
  window.hideGoalHintForStage = hideGoalHintForStage;
  window.updateTutorialHighlightUI = updateTutorialHighlightUI;
  window.hideTutorialHighlights = hideTutorialHighlights;
  window.startHighlightTracking = startHighlightTracking;
  window.getTutorialHighlightTargets = getTutorialHighlightTargets;

  // 初期化（DOM ready 後にボタンとリスナーを設定）
  function initGuide() {
    window.setupGuideButton();
    window.bindGuideWorkspaceListener();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGuide);
  } else {
    initGuide();
  }
})();