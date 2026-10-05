// ===== tutorial.js =====
// チュートリアル専用のブロック制限、進行管理、UIイベントを担当します

// ステージごとの許可ブロックタイプを計算する関数
window.getTutorialAllowedBlockTypes = function(stageId) {
  const stage = String(stageId);
  const basicBlocks = ['custom_number', 'term_sin', 'term_cos', 'term_tan', 'term_sin2', 'term_cos2', 
                       'math_add', 'math_negate', 'math_multiply', 'math_fraction', 'math_square'];
  const stageRestrictions = {
    '0-1': { operations: ['replace_operation', 'conclusion_operation'], formulas: ['formula_1'] },
    '0-2': { operations: ['replace_operation', 'conclusion_operation'], formulas: ['formula_1'] },
    '0-3': { operations: ['replace_operation', 'conclusion_operation'], formulas: ['formula_2'] },
    '0-4': { operations: ['replace_operation', 'conclusion_operation'], formulas: ['formula_3'] },
    '0-5': { operations: ['replace_operation', 'conclusion_operation'], formulas: ['formula_1'] },
    '0-6': { operations: ['replace_operation', 'conclusion_operation'], formulas: ['formula_2'] },
    '0-7': { operations: ['replace_operation', 'common_denominator_operation', 'conclusion_operation'], formulas: ['formula_1'] },
    '0-8': { operations: ['replace_operation', 'conclusion_operation'], formulas: ['formula_1', 'formula_3'] },
  };
  const restriction = stageRestrictions[stage] || null;
  if (!restriction) return { allowed: true, types: null };
  return { 
    allowed: false, 
    basicBlocks, 
    operationBlocks: restriction.operations || [], 
    formulaBlocks: restriction.formulas || [] 
  };
};

// チュートリアル中にツールボックスの不要ブロックを非活性（グレーアウト）にする関数
window.applyTutorialBlockRestrictions = function() {
  if (typeof window.currentStageNumber === 'undefined' || (typeof window.isTutorialStageId === 'function' && !window.isTutorialStageId(window.currentStageNumber))) return;
  if (!window.workspace) return;
  
  const restriction = window.getTutorialAllowedBlockTypes(window.currentStageNumber);
  if (restriction.allowed !== false) return;
  
  const allowedTypes = new Set([
    ...restriction.basicBlocks,
    ...(restriction.operationBlocks || []),
    ...(restriction.formulaBlocks || [])
  ]);
  
  const toolboxElement = window.workspace.getToolbox();
  if (!toolboxElement) return;
  
  // categories の未定義エラーを防ぐため、ここで安全に宣言して取得します
  const categories = typeof toolboxElement.getCategories === 'function' 
    ? toolboxElement.getCategories() 
    : (typeof toolboxElement.getToolboxItems === 'function' ? toolboxElement.getToolboxItems() : []);
  
  if (!categories || !Array.isArray(categories)) return;

  categories.forEach((category) => {
    if (!category) return;
    const blocks = typeof category.getContents === 'function' ? category.getContents() : [];
    if (!blocks || !Array.isArray(blocks)) return;

    blocks.forEach((block) => {
      if (!block || !block.type || typeof block.setDisabled !== 'function') return;
      if (!allowedTypes.has(block.type)) {
        block.setDisabled(true);
      }
    });
  });
};

// ワークスペースのリアルタイム監視を設定する関数
window.bindTutorialWorkspaceAutoAdvance = function() {
  if (window.tutorialWorkspaceListenerBound) return;
  window.tutorialWorkspaceListenerBound = true;

  if (!window.workspace) return;
  window.workspace.addChangeListener((event) => {
    if (!window.tutorialModeActive || (typeof window.isTutorialStageId === 'function' && !window.isTutorialStageId(window.currentStageNumber))) return;
    if (!event || event.recordUndo === false || event.isUiEvent) return;

    if (typeof window.applyTutorialBlockRestrictions === 'function') {
      window.applyTutorialBlockRestrictions();
    }
    
    // ヒント表示中ならバナー文言を更新する。
    // 以前はここで updateTutorialBanner() を呼んでいたが、その関数は
    // どこにも定義されておらず typeof ガードで無言 no-op になっていた。
    // 実体は app-guide.js の updateTutorialHighlightUI。
    if (typeof window.updateTutorialHighlightUI === 'function') {
      window.updateTutorialHighlightUI(window.currentStageNumber);
    }
  });
};

// チュートリアル進捗バー(#tutorial-progress-shell)の表示を更新する。
// 以前は HTML と CSS だけあって、更新する JS が存在しなかったため常に 0% のままだった。
window.updateTutorialProgressBar = function(stageId) {
  const shell = document.getElementById('tutorial-progress-shell');
  const fill = document.getElementById('tutorial-progress-fill');
  const rate = document.getElementById('tutorial-progress-rate');
  const label = document.getElementById('tutorial-progress-label');
  if (!shell) return;

  const isTutorial = typeof window.isTutorialStageId === 'function' && window.isTutorialStageId(stageId);
  if (!isTutorial) {
    shell.classList.remove('visible');
    return;
  }

  const total = (window.TUTORIAL_STAGE_IDS || []).length || 1;
  const index = window.getTutorialStageIndex(stageId); // 0始まり
  const done = Math.max(0, Math.min(index, total));    // 現在のステージは「未完了」として数える
  const percent = Math.round((done / total) * 100);

  shell.classList.add('visible');
  if (fill) fill.style.width = percent + '%';
  if (rate) rate.textContent = percent + '%';
  if (label) label.textContent = `チュートリアル ${Math.min(index + 1, total)} / ${total}`;

  // 到達した最大ステップを保存しておく（次回起動時の参考値）
  const reached = Math.max(window.tutorialProgressCount || 0, done);
  window.tutorialProgressCount = reached;
  window.AppStorage.setRaw('tutorial_progress', String(reached));
};