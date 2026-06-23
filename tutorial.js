function getTutorialAllowedBlockTypes(stageId) {
  const stage = String(stageId);
  const basicBlocks = ['custom_number', 'term_sin', 'term_cos', 'term_tan', 'term_sin2', 'term_cos2', 
                       'math_add', 'math_negate', 'math_multiply', 'math_fraction', 'math_square'];
  const stageRestrictions = {
    '0-1': { operations: ['replace_operation', 'conclusion_operation'], formulas: ['formula_1'] },
    '0-2': { operations: ['replace_operation', 'conclusion_operation'], formulas: ['formula_2'] },
    '0-3': { operations: ['replace_operation', 'conclusion_operation'], formulas: ['formula_3'] },
    '0-4': { operations: ['replace_operation', 'conclusion_operation'], formulas: ['formula_1'] },
    '0-5': { operations: ['replace_operation', 'conclusion_operation'], formulas: ['formula_2'] },
    '0-6': { operations: ['replace_operation', 'conclusion_operation'], formulas: ['formula_1'] },
    '0-7': { operations: ['replace_operation', 'conclusion_operation'], formulas: ['formula_1', 'formula_3'] },
  };

  categories.forEach((category) => {
    const blocks = typeof category.getContents === 'function' ? category.getContents() : [];
    blocks.forEach((block) => {
      if (!block || typeof block.setDisabled !== 'function') return;
      block.setDisabled(false);
    });
  });
}

function updateTutorialProgress(stageId) {
  const shell = document.getElementById('tutorial-progress-shell');
  const fill = document.getElementById('tutorial-progress-fill');
  const label = document.getElementById('tutorial-progress-label');
  const rate = document.getElementById('tutorial-progress-rate');
  if (!shell || !fill || !label || !rate) return;

  if (!isTutorialStageId(stageId)) {
    shell.classList.remove('visible');
    fill.style.width = '0%';
    label.textContent = 'チュートリアル';
    rate.textContent = '0%';
    return;
  }

  const totalSteps = TUTORIAL_STAGE_IDS.length;
  const step = Math.max(0, Math.min(tutorialProgressCount, totalSteps));
  const percent = Math.round((step / totalSteps) * 100);

  shell.classList.add('visible');
  fill.style.width = `${percent}%`;
  label.textContent = `TUTORIAL ${step}/${totalSteps}`;
  rate.textContent = `${percent}%`;
}

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

function getTutorialExpectedFormulaLabel(stageId) {
  const formulaType = getTutorialExpectedFormulaType(stageId);
  if (formulaType === 'formula_1') return '公式①';
  if (formulaType === 'formula_2') return '公式②';
  if (formulaType === 'formula_3') return '公式③';
  return '公式';
}

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

function getTutorialHighlightTargets(stageId) {
  if (!isTutorialStageId(stageId)) return null;
  const replaceOp = findTutorialReplaceOperation();
  const conclusionOp = findTutorialConclusionOperation();
  const toolboxLabel = getTutorialToolboxCategoryLabel('証明') || getTutorialToolboxElement();
  const goal = getTutorialGoalState(stageId);
  const goalKey = goal?.key || '';

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

  if (goalKey === 'fill-replace-value' && replaceOp) {
    return { source: toolboxLabel, target: getInputConnectionRect(replaceOp, 'VALUE') || toolboxLabel };
  }
  if (goalKey === 'fill-replace-formula' && replaceOp) {
    return { source: toolboxLabel, target: getInputConnectionRect(replaceOp, 'FORMULA') || toolboxLabel };
  }
  if (goalKey === 'fill-replace-result' && replaceOp) {
    return { source: toolboxLabel, target: getInputConnectionRect(replaceOp, 'REPLACEMENT') || toolboxLabel };
  }

  if (goalKey === 'fill-conclusion-value' && conclusionOp) {
    return { source: toolboxLabel, target: getInputConnectionRect(conclusionOp, 'VALUE') || toolboxLabel };
  }

  if (goalKey === 'ready-check') {
    const submitBtn = document.getElementById('btn-submit');
    if (submitBtn) return { source: submitBtn, target: submitBtn };
  }

  return { source: toolboxLabel, target: toolboxLabel };
}

function hideTutorialHighlights() {
  const source = document.getElementById('tutorial-highlight-source');
  const target = document.getElementById('tutorial-highlight-target');
  if (source) source.classList.add('hidden');
  if (target) target.classList.add('hidden');
}

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

function updateTutorialHighlightUI(stageNumber) {
  if (!workspace || !currentProblemData) return;

  const targetPulse = document.getElementById('tutorial-highlight-target');
  const sourcePulse = document.getElementById('tutorial-highlight-source');
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

  if (goalHintActive && underProblem) {
    underProblem.textContent = goalText;
    underProblem.classList.add('visible');
    underProblem.classList.add('pulse');
  }
}

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

function applyTutorialHighlight(element, rect) {
  if (!rect || (rect.width === 0 && rect.height === 0)) return;
  element.style.left = rect.left + 'px';
  element.style.top = rect.top + 'px';
  element.style.width = rect.width + 'px';
  element.style.height = rect.height + 'px';
  element.classList.remove('hidden');
}

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
    
    if (event.type === Blockly.Events.BLOCK_MOVE || event.type === Blockly.Events.BLOCK_DELETE) {
      const blockId = event.blockId;
      if (blockId) {
        const block = workspace.getBlockById(blockId);
        if (block && block.type === 'proof_step') {
          if (event.type === Blockly.Events.BLOCK_DELETE) {
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
    introVideo.currentTime = 0;
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
